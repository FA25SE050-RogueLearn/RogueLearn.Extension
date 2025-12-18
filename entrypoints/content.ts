// User/entrypoints/content.ts
import { scrapeTranscript } from '@/lib/transcript-scraper';
import { scrapeSchedule } from '@/lib/schedule-scraper';

export default defineContentScript({
  matches: [
    '*://fap.fpt.edu.vn/*',
  ],
  main() {
    console.log('RogueLearn Student - Content script loaded');

    // Auto-continue schedule scraping if in progress
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

      // --- NEW: Handle Copy HTML Request ---
      if (message.action === 'copyPageHtml') {
        try {
          const html = document.documentElement.outerHTML;
          navigator.clipboard.writeText(html).then(() => {
            sendResponse({ success: true, length: html.length });
          }).catch(err => {
            sendResponse({ success: false, error: err.message });
          });
        } catch (e: any) {
          sendResponse({ success: false, error: e.message });
        }
        return true; // Async response
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