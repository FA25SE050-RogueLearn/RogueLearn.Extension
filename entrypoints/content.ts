import { scrapeTranscript } from '@/lib/transcript-scraper';
import { scrapeSchedule } from '@/lib/schedule-scraper';

export default defineContentScript({
  matches: ['*://fap.fpt.edu.vn/*'],
  main() {
    console.log('FPT FAP Helper - Content script loaded');
    console.log('Current URL:', window.location.href);

    // Auto-continue schedule scraping if in progress
    if (window.location.href.includes('fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx')) {
      // Check if there's a scraping session in progress
      const progressData = sessionStorage.getItem('scheduleScrapingProgress');
      if (progressData) {
        console.log('Detected schedule scraping in progress, auto-continuing...');
        // Wait for page to fully load, then auto-trigger scraping
        setTimeout(() => {
          scrapeSchedule().then(result => {
            if (!result.success && (result.error?.includes('Scraping in progress') || result.error?.includes('Transitioning'))) {
              console.log('Progress update:', result.error);
              // Send progress update to popup
              browser.runtime.sendMessage({
                action: 'scrapingProgress',
                type: 'schedule',
                message: result.error
              });
            } else if (result.success) {
              console.log('Scraping complete!', result.data);
              // Notify popup that scraping is complete
              browser.runtime.sendMessage({
                action: 'scrapingComplete',
                data: result.data
              });
            } else {
              // Error occurred
              console.error('Scraping error:', result.error);
              browser.runtime.sendMessage({
                action: 'scrapingError',
                error: result.error
              });
            }
          });
        }, 1500); // Wait 1.5s for page to fully load
      }
    }

    // Listen for messages from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'checkLoginStatus') {
        const isLoggedIn = checkIfLoggedIn();
        console.log('Login status check:', isLoggedIn);
        sendResponse({ isLoggedIn });
        return true;
      }

      if (message.action === 'scrapeTranscript') {
        scrapeTranscript().then(result => {
          sendResponse(result);
        });
        return true; // Keep message channel open for async response
      }

      if (message.action === 'scrapeSchedule') {
        scrapeSchedule().then(result => {
          sendResponse(result);
        });
        return true;
      }

      return false;
    });
  },
});

function checkIfLoggedIn(): boolean {
  // Check if user is logged in by looking for common elements on FAP site
  console.log('Checking login status...');
  
  // Primary method: Check if current URL is a logged-in page
  const currentUrl = window.location.href;
  console.log('Current URL:', currentUrl);
  
  // These URLs only exist when logged in
  if (currentUrl.includes('fap.fpt.edu.vn/Student.aspx') || 
      currentUrl.includes('fap.fpt.edu.vn/Thongbao.aspx') ||
      currentUrl.includes('/Grade/') || 
      currentUrl.includes('/Report/')) {
    console.log('URL indicates logged in page');
    return true;
  }
  
  // Check if we're NOT on the login page (login page has specific form)
  const loginForm = document.querySelector('form[action*="login"], input[name="ctl00$mainContent$tbUserName"]');
  if (!loginForm && currentUrl.includes('fap.fpt.edu.vn')) {
    console.log('No login form found on FAP domain - assuming logged in');
    return true;
  } else if (loginForm) {
    console.log('Login form found - not logged in');
  }
  
  // Check for any links to Student/Grade/Report pages (only visible when logged in)
  const loggedInLink = document.querySelector('a[href*="Student.aspx"], a[href*="Thongbao.aspx"], a[href*="Grade"], a[href*="Report"]');
  if (loggedInLink) {
    console.log('Found logged-in navigation link');
    return true;
  }
  
  console.log('Not logged in');
  return false;
}

