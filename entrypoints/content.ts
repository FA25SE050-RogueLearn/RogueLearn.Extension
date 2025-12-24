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
  // 1. Extract User Info Header (Logged in user, logout link, campus)
  const userDiv = document.getElementById('ctl00_divUser');
  let userHeaderHtml = '';
  if (userDiv) {
    // Reconstruct simply: <p><a href="?view=user">Name</a> | <a href="?logout=true">logout</a> | CAMPUS</p>
    const links = userDiv.querySelectorAll('a');
    const span = userDiv.querySelector('span[id$="lblCampusName"]');
    
    // Manually build to match expected output cleanly
    const username = links[0]?.textContent?.trim() || 'User';
    const campus = span?.textContent?.trim() || '';
    
    userHeaderHtml = `<p><a href="?view=user">${username}</a> | <a href="?logout=true">logout</a> | ${campus}</p>`;
  }

  // 2. Extract Navigation (Home | Grade Transcript)
  const navSpan = document.getElementById('ctl00_lblNavigation');
  let navHtml = '';
  if (navSpan) {
    // Clean up navigation
    const homeLink = navSpan.querySelector('a');
    const boldText = navSpan.querySelector('b')?.textContent || 'Grade Transcript';
    navHtml = `<ol><li><a href="../Student.aspx">Home</a> | <strong>${boldText}</strong></li></ol>`;
  }

  // 3. Extract Main Content (Title, Table, Footer)
  const gradeDiv = document.getElementById('ctl00_mainContent_divGrade');
  if (!gradeDiv) throw new Error("Could not find grade table on this page");

  // Get the parent of gradeDiv to capture the H2 title and student info
  // The structure is usually H2 -> div#Grid -> table -> tr -> td -> div#ctl00_mainContent_divGrade
  // We want to capture the header "Grade report for transcript..."
  const mainContent = document.querySelector('#ctl00_mainContent_lblRollNumber')?.closest('h2');
  const titleHtml = mainContent ? `<h2>${mainContent.textContent?.trim()}</h2>` : '<h2>Grade Transcript</h2>';

  // 4. Clean the Grade Table
  const tableClone = gradeDiv.querySelector('table')?.cloneNode(true) as HTMLElement;
  if (!tableClone) throw new Error("Table not found inside grade div");

  // Remove attributes from table and children
  const allElements = tableClone.querySelectorAll('*');
  allElements.forEach(el => {
    // Keep only colspan/rowspan
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (!['colspan', 'rowspan'].includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  });
  
  // Clean text content (remove extra spaces)
  // Also fix the status column cells to match expected text-only output if they contain spans
  const rows = tableClone.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0) {
      // Clean content of cells
      cells.forEach(cell => {
          // If cell has a span with status, just keep text
          if (cell.textContent) cell.textContent = cell.textContent.trim();
      });
    }
  });

  // 5. Extract Footer / Support Info
  // Usually in a table with id 'cssTable' at bottom
  const supportDiv = document.getElementById('ctl00_divSupporthcm');
  const footerP = document.querySelector('p[style*="text-align: center"]');
  
  let footerHtml = '';
  if (supportDiv || footerP) {
      footerHtml = `
      <table>
        <tbody>
          <tr><td>${supportDiv ? supportDiv.innerHTML.replace(/<br\s*\/?>/gi, '').trim() : ''}</td></tr>
          <tr><td>${footerP ? footerP.innerHTML.trim() : ''}</td></tr>
        </tbody>
      </table>`;
      
      // Basic cleanup of footer html
      // Remove class/style from footer
      footerHtml = footerHtml.replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, '');
  }
  
  // 6. Support Links (App Store)
  // Usually in a table at the top right of original page
  const appStoreTable = document.querySelector('.col-md-6 .col-md-12 table');
  let appStoreHtml = '';
  if (appStoreTable) {
      const clone = appStoreTable.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('*').forEach(el => {
          Array.from(el.attributes).forEach(attr => {
             if (!['src', 'href', 'alt', 'colspan'].includes(attr.name)) el.removeAttribute(attr.name);
          });
      });
      appStoreHtml = clone.outerHTML;
  }

  // 7. Construct Final HTML
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>FPT University Academic Portal</title>
</head>
<body>
  <h1>FPT University Academic Portal</h1>
  ${appStoreHtml}
  ${userHeaderHtml}
  ${navHtml}
  <table>
    <tbody>
      <tr>
        <td>
          ${titleHtml}
          <table>
            <tbody>
              <tr>
                <td>
                  ${tableClone.outerHTML}
                  <!-- Placeholder for extra info like Capstone topic if present -->
                </td>
              </tr>
              <tr>
                <td>
                   ${footerHtml}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}