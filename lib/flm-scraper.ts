// RogueLearn.Extension/lib/flm-scraper.ts
import type { ScraperResult } from './types';

export interface SyllabusImportData {
  rawHtml: string;
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
 * Scrapes syllabus data from FLM SyllabusDetails page
 * This should only be called AFTER validating the page status
 */
export function scrapeSyllabusFromPage(): ScraperResult<SyllabusImportData> {
  try {
    // Step 1: Validate we're on the correct page
    const pageStatus = getFlmPageStatus();
    
    if (!pageStatus.isFlmDomain) {
      return { 
        success: false, 
        error: pageStatus.errorMessage || "Not on FLM website."
      };
    }
    
    if (!pageStatus.isLoggedIn) {
      return { 
        success: false, 
        error: pageStatus.errorMessage || "Not logged into FLM. Please log in first."
      };
    }
    
    if (!pageStatus.isSyllabusDetailsPage) {
      return { 
        success: false, 
        error: pageStatus.errorMessage || "Not on a Syllabus Details page. Please navigate to a subject's syllabus page first."
      };
    }

    // Step 2: Validate syllabus content exists on the page
    // Check for key syllabus elements
    const syllabusIdElement = document.querySelector('#lblSyllabusID');
    const subjectCodeElement = document.querySelector('#lblSubjectCode');
    const syllabusNameElement = document.querySelector('#lblSyllabusName');
    
    if (!syllabusIdElement && !subjectCodeElement) {
      return {
        success: false,
        error: "Could not find syllabus data on this page. The page may still be loading."
      };
    }

    // Step 3: Find the main content container
    const potentialContainers = [
        '#content',           // Main content div based on the HTML sample
        '#divContent', 
        '#mainContent',
        '.table-detail',      // Syllabus detail table
        'form#form2'          // The main form wrapper
    ];

    let contentElement: Element | null = null;

    for (const selector of potentialContainers) {
        const el = document.querySelector(selector);
        if (el) {
            console.log(`[RogueLearn FLM] Found syllabus container: ${selector}`);
            contentElement = el;
            break;
        }
    }

    // Fallback to document body if no specific container found
    if (!contentElement) {
        console.warn("[RogueLearn FLM] Specific container not found, falling back to body.");
        contentElement = document.body;
    }

    // Step 4: Extract HTML content
    const rawHtml = contentElement.innerHTML;

    if (!rawHtml || rawHtml.length < 500) {
        return {
            success: false,
            error: "Page content appears empty or incomplete. Please wait for the page to fully load."
        };
    }

    // Step 5: Verify we captured essential syllabus data
    const hasSubjectCode = rawHtml.includes('SubjectCode') || rawHtml.includes('Subject Code') || subjectCodeElement;
    const hasSyllabusData = rawHtml.includes('gvSchedule') || rawHtml.includes('SessionSchedule') || rawHtml.includes('gvLO');
    
    if (!hasSubjectCode) {
      return {
        success: false,
        error: "Could not detect subject code in page content. Please ensure you are on a valid Syllabus Details page."
      };
    }

    console.log(`[RogueLearn FLM] Successfully scraped syllabus. Content length: ${rawHtml.length}, SylID: ${pageStatus.syllabusId}`);

    return {
      success: true,
      data: {
        rawHtml: rawHtml,
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