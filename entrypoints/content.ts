// User/entrypoints/content.ts
import { scrapeTranscript } from '@/lib/transcript-scraper';
import { scrapeSchedule } from '@/lib/schedule-scraper';

export default defineContentScript({
  matches: [
    '*://fap.fpt.edu.vn/*',
  ],
  main() {
    console.log('RogueLearn Student - Content script loaded');

    // Auto-continue logic...
    if (window.location.href.includes('fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx')) {
      const progressData = sessionStorage.getItem('scheduleScrapingProgress');
      if (progressData) {
        setTimeout(() => {
          scrapeSchedule().then(result => {
            if (!result.success && (result.error?.includes('Scraping in progress') || result.error?.includes('Transitioning'))) {
              browser.runtime.sendMessage({
                action: 'scrapingProgress',
                type: 'schedule',
                message: result.error
              });
            } else if (result.success) {
              browser.runtime.sendMessage({
                action: 'scrapingComplete',
                data: result.data
              });
            } else {
              browser.runtime.sendMessage({
                action: 'scrapingError',
                error: result.error
              });
            }
          });
        }, 1500); 
      }
    }

    // Listen for messages from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'checkLoginStatus') {
        const isLoggedIn = checkIfLoggedIn();
        sendResponse({ isLoggedIn });
        return true;
      }

      if (message.action === 'scrapeTranscript') {
        scrapeTranscript().then(result => {
          sendResponse(result);
        });
        return true; 
      }

      if (message.action === 'scrapeSchedule') {
        scrapeSchedule().then(result => {
          sendResponse(result);
        });
        return true;
      }

      if (message.action === 'cancelScraping') {
        const cancelledKey = 'scheduleScrapingCancelled';
        sessionStorage.setItem(cancelledKey, 'true');
        sessionStorage.removeItem('scheduleScrapingProgress');
        sendResponse({ success: true, cancelled: true });
        return true;
      }

      // --- FIX: Clean HTML specifically for Transcript ---
      if (message.action === 'copyPageHtml') {
        try {
          const cleanHtml = generateCleanTranscriptHtml();
          console.log('[Content] Cleaned HTML length:', cleanHtml.length);
          sendResponse({ success: true, html: cleanHtml });
        } catch (e: any) {
          sendResponse({ success: false, error: e.message });
        }
        return true; 
      }
      
      return false;
    });
  },
});

function checkIfLoggedIn(): boolean {
  const currentUrl = window.location.href;
  if (currentUrl.includes('fap.fpt.edu.vn/Student.aspx') || 
      currentUrl.includes('fap.fpt.edu.vn/Thongbao.aspx') ||
      currentUrl.includes('/Grade/') || 
      currentUrl.includes('/Report/')) {
    return true;
  }
  const loginForm = document.querySelector('form[action*="login"], input[name="ctl00$mainContent$tbUserName"]');
  if (!loginForm && currentUrl.includes('fap.fpt.edu.vn')) {
    return true;
  }
  const loggedInLink = document.querySelector('a[href*="Student.aspx"], a[href*="Thongbao.aspx"], a[href*="Grade"], a[href*="Report"]');
  if (loggedInLink) {
    return true;
  }
  return false;
}

// --- HTML CLEANING & GENERATION UTILITY ---
function generateCleanTranscriptHtml(): string {
  // 1. Target the specific grade table container
  const gradeDiv = document.getElementById('ctl00_mainContent_divGrade');
  if (!gradeDiv) {
    throw new Error("Could not find grade table on this page");
  }

  // 2. Clone to avoid modifying live page
  const tableClone = gradeDiv.cloneNode(true) as HTMLElement;

  // 3. Clean up the table structure
  // Remove attributes from all elements
  const allElements = tableClone.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove all attributes except 'colspan', 'rowspan' for table structure
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!['colspan', 'rowspan'].includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // 4. Extract Student Info
  const studentInfoEl = document.getElementById('ctl00_mainContent_lblRollNumber');
  const studentInfo = studentInfoEl ? studentInfoEl.textContent?.trim() : 'Unknown';
  
  // 5. Build clean HTML structure
  const style = `
    <style>
      body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; padding: 20px; }
      h2 { margin: 0 0 10px; }
      p { margin: 0 0 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      thead th { background: #f3f4f6; }
      tbody tr:nth-child(even) { background: #fafafa; }
    </style>
  `;

  // 6. Fix Status Colors (inject inline styles for critical status info)
  const rows = tableClone.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0) {
      const lastCell = cells[cells.length - 2]; // Status is usually 2nd to last column
      if (lastCell) {
        const statusText = lastCell.textContent?.trim().toLowerCase();
        if (statusText === 'passed') {
          lastCell.setAttribute('style', 'color:#22c55e;font-weight:bold');
        } else if (statusText === 'studying') {
          lastCell.setAttribute('style', 'color:#3b82f6;font-weight:bold');
        } else if (statusText === 'not passed') {
          lastCell.setAttribute('style', 'color:#dc2626;font-weight:bold');
        }
      }
    }
  });

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript</title>${style}</head><body><h2>Transcript</h2><p>Student: ${studentInfo}</p>${tableClone.innerHTML}</body></html>`;

  return fullHtml;
}