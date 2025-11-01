export default defineBackground(() => {
  console.log('FPT FAP Helper - Background script loaded');

  // Handle redirect to FAP login
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'redirectToFAP') {
      // Update current tab instead of creating new one
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'navigateToTranscript') {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/Grade/StudentTranscript.aspx'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'navigateToSchedule') {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    // Handle cookie request from content script
    if (message.action === 'getCookies') {
      browser.cookies.getAll({ url: 'https://fap.fpt.edu.vn' })
        .then(cookies => {
          const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          sendResponse({ 
            success: true, 
            cookies: cookieString,
            count: cookies.length,
            names: cookies.map(c => c.name)
          });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    return false;
  });
});
