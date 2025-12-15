// RogueLearn.Extension/lib/flm-scraper.ts
import type { ScraperResult } from './types';

export interface SyllabusImportData {
  rawHtml: string; // We keep this for backward compatibility or if backend needs full HTML
  structuredText: string; // New field for the optimized AI prompt input
  sourceUrl: string;
  syllabusId: string;
}

export interface FlmPageStatus {
  isFlmDomain: boolean;
  isLoggedIn: boolean;
  isSyllabusDetailsPage: boolean;
  syllabusId: string | null;
  errorMessage: string | null;
}

/**
 * Check if user is logged into FLM
 */
export function checkFlmLoginStatus(): boolean {
  // Check for logout link (indicates logged in)
  const logoutLink = document.querySelector('a[href*="LogOut"], a[href*="logout"], #lbtnSignOut');
  if (logoutLink) return true;

  // Check for profile elements (user name, email)
  const profileElements = document.querySelector('#lblName, #lblEmail, #pnlProfile');
  if (profileElements) return true;

  // Check for user avatar/image
  const userAvatar = document.querySelector('#ProfileImage');
  if (userAvatar) return true;

  return false;
}

/**
 * Check if currently on the SyllabusDetails page and extract syllabus ID
 */
export function checkSyllabusDetailsPage(): { isValid: boolean; syllabusId: string | null } {
  const currentUrl = window.location.href;
  
  // Check URL pattern: flm.fpt.edu.vn/gui/role/student/SyllabusDetails?sylID=...
  // Also support other roles like teacher, admin
  const syllabusDetailsPattern = /flm\.fpt\.edu\.vn\/gui\/role\/\w+\/SyllabusDetails\?sylID=(\d+)/i;
  const match = currentUrl.match(syllabusDetailsPattern);
  
  if (match && match[1]) {
    return { isValid: true, syllabusId: match[1] };
  }
  
  // Alternative: Check for form action containing SyllabusDetails
  const form = document.querySelector('form[action*="SyllabusDetails"]');
  if (form) {
    // Try to extract sylID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sylId = urlParams.get('sylID');
    if (sylId) {
      return { isValid: true, syllabusId: sylId };
    }
  }
  
  return { isValid: false, syllabusId: null };
}

/**
 * Get full FLM page status for validation
 */
export function getFlmPageStatus(): FlmPageStatus {
  const isFlmDomain = window.location.href.includes('flm.fpt.edu.vn');
  
  if (!isFlmDomain) {
    return {
      isFlmDomain: false,
      isLoggedIn: false,
      isSyllabusDetailsPage: false,
      syllabusId: null,
      errorMessage: 'Not on FLM website. Please navigate to flm.fpt.edu.vn'
    };
  }
  
  const isLoggedIn = checkFlmLoginStatus();
  if (!isLoggedIn) {
    return {
      isFlmDomain: true,
      isLoggedIn: false,
      isSyllabusDetailsPage: false,
      syllabusId: null,
      errorMessage: 'Not logged into FLM. Please log in first.'
    };
  }
  
  const syllabusCheck = checkSyllabusDetailsPage();
  if (!syllabusCheck.isValid) {
    return {
      isFlmDomain: true,
      isLoggedIn: true,
      isSyllabusDetailsPage: false,
      syllabusId: null,
      errorMessage: 'Not on a Syllabus Details page. Please navigate to a subject syllabus page (URL should contain: SyllabusDetails?sylID=...)'
    };
  }
  
  return {
    isFlmDomain: true,
    isLoggedIn: true,
    isSyllabusDetailsPage: true,
    syllabusId: syllabusCheck.syllabusId,
    errorMessage: null
  };
}

/**
 * Extract text from a table row-by-row to preserve structure for AI
 */
function extractTableData(tableId: string): string {
    const table = document.querySelector(`#${tableId}`);
    if (!table) return '';

    let text = `\n--- TABLE: ${tableId} ---\n`;
    const rows = table.querySelectorAll('tr');
    
    // Extract headers
    const headers = Array.from(rows[0]?.querySelectorAll('th') || []).map(th => th.textContent?.trim());
    if (headers.length > 0) {
        text += `| ${headers.join(' | ')} |\n`;
        text += `| ${headers.map(() => '---').join(' | ')} |\n`;
    }

    // Extract body
    rows.forEach((row, rowIndex) => {
        if (rowIndex === 0 && headers.length > 0) return; // Skip header row if processed
        const cells = Array.from(row.querySelectorAll('td')).map(td => {
            // Clean up cell content: remove extra whitespace, handle inner newlines
            return td.textContent?.trim().replace(/\s+/g, ' ') || '';
        });
        if (cells.length > 0) {
             text += `| ${cells.join(' | ')} |\n`;
        }
    });
    
    return text + '\n';
}

/**
 * Extracts key-value pairs from the main syllabus info section
 */
function extractGeneralInfo(): string {
    const infoMap: Record<string, string> = {
        'Subject Code': '#lblSubjectCode',
        'Subject Name': '#lblSyllabusName',
        'Subject English Name': '#lblSyllabusNameEnglish',
        'Credits (NoCredit)': '#lblNoCredit',
        'Degree Level': '#lblDegreeLevel',
        'Time Allocation': '#lblTimeAllocation',
        'Pre-Requisite': '#lblPreRequisite',
        'Description': '#lblDescription',
        'Student Tasks': '#lblStudentTask',
        'Tools': '#lblTools',
        'Approved Date': '#lblApprovedDate',
        'Note': '#lblNote',
        'Min Avg Mark': '#lblMinAvgMarkToPass'
    };

    let text = "--- GENERAL INFORMATION ---\n";
    for (const [label, selector] of Object.entries(infoMap)) {
        const element = document.querySelector(selector);
        if (element) {
            const value = element.textContent?.trim() || '';
            // Only add if value exists to reduce token usage
            if (value) {
                text += `${label}: ${value}\n`;
            }
        }
    }
    return text + "\n";
}


/**
 * Scrapes syllabus data from FLM SyllabusDetails page
 * This should only be called AFTER validating the page status
 */
export function scrapeSyllabusFromPage(): ScraperResult<SyllabusImportData> {
  try {
    // Step 1: Validate we're on the correct page
    const pageStatus = getFlmPageStatus();
    
    if (!pageStatus.isFlmDomain || !pageStatus.isLoggedIn || !pageStatus.isSyllabusDetailsPage) {
       return { 
        success: false, 
        error: pageStatus.errorMessage || "Validation failed."
      };
    }

    // Step 2: Extract Structured Text for AI
    // We construct a structured text representation specifically designed for the AI prompt
    let structuredText = "";
    
    // 2.1 General Info (Subject Code, Name, Credits, etc.)
    structuredText += extractGeneralInfo();

    // 2.2 Learning Outcomes
    structuredText += extractTableData('gvLO');

    // 2.3 Materials
    structuredText += extractTableData('gvMaterial');

    // 2.4 Schedule
    structuredText += extractTableData('gvSchedule');

    // 2.5 Assessments
    structuredText += extractTableData('gvAssessment');

    // 2.6 Constructive Questions (if any)
    const cqTable = document.querySelector('#gvCQ');
    if (cqTable) {
        structuredText += extractTableData('gvCQ');
    } else {
        // Fallback check for the message span if table is missing
        const cqMessage = document.querySelector('#blbMessageCQ')?.textContent;
        if (cqMessage) {
            structuredText += `\nConstructive Questions Note: ${cqMessage}\n`;
        }
    }

    console.log(`[RogueLearn FLM] Successfully scraped structured syllabus. Length: ${structuredText.length}`);

    // Step 3: Fallback Raw HTML (in case backend still relies on it or for debugging)
    // We try to grab the main container to keep it cleaner than document.body
    const contentElement = document.querySelector('#divContent') || document.body;
    const rawHtml = contentElement.innerHTML;

    return {
      success: true,
      data: {
        rawHtml: rawHtml, // Keep for legacy/fallback support
        structuredText: structuredText, // Primary field for AI processing
        sourceUrl: window.location.href,
        syllabusId: pageStatus.syllabusId || 'unknown'
      }
    };
  } catch (e) {
    console.error("[RogueLearn FLM] Scraping error:", e);
    return { 
        success: false, 
        error: `Scraping failed: ${String(e)}` 
    };
  }
}