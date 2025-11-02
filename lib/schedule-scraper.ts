import type { ScheduleData, ScraperResult, ClassSession } from './types';

/**
 * Parse schedule table from document
 */
function parseScheduleTable(doc: Document): ClassSession[] {
  const sessions: ClassSession[] = [];
  
  // Find the main schedule table (has thead with Year/Week selectors)
  const tables = doc.querySelectorAll('table');
  let scheduleTable: Element | null = null;
  
  for (const table of tables) {
    if (table.querySelector('select[name*="drpSelectWeek"]')) {
      scheduleTable = table;
      break;
    }
  }
  
  if (!scheduleTable) {
    console.log('Schedule table not found');
    return sessions;
  }

  console.log('Found schedule table');

  // Get day headers from thead (dates like "27/10", "28/10", etc.)
  const dayHeaders: string[] = [];
  const dayNames: string[] = [];
  
  const headerRows = scheduleTable.querySelectorAll('thead tr');
  if (headerRows.length >= 2) {
    // First row after Year/Week has day names (Mon, Tue, etc.)
    const dayNameCells = headerRows[0].querySelectorAll('th');
    dayNameCells.forEach((th, index) => {
      if (index > 0) { // Skip first cell (Year/Week selector)
        dayNames.push(th.textContent?.trim() || '');
      }
    });
    
    // Second row has dates (27/10, 28/10, etc.)
    const dateCells = headerRows[1].querySelectorAll('th');
    dateCells.forEach(th => {
      dayHeaders.push(th.textContent?.trim() || '');
    });
  }

  console.log('Day names:', dayNames);
  console.log('Day headers:', dayHeaders);

  // Process tbody rows
  const tbody = scheduleTable.querySelector('tbody');
  if (!tbody) {
    console.log('tbody not found');
    return sessions;
  }

  const rows = tbody.querySelectorAll('tr');
  console.log('Found rows:', rows.length);
  
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;

    // First cell contains slot info
    const slotCell = cells[0];
    const slotText = slotCell?.textContent?.trim() || '';
    const slotMatch = slotText.match(/Slot\s*(\d+)/i);
    if (!slotMatch) return;
    
    const slotNumber = parseInt(slotMatch[1]);

    // Process each day column (skip first cell which is slot number)
    // Note: cells.length might be less than dayNames.length due to empty days
    for (let cellIndex = 1; cellIndex < cells.length; cellIndex++) {
      const cell = cells[cellIndex];
      const cellContent = cell.textContent?.trim();
      
      if (!cellContent || cellContent === '-') continue;

      // Map cell index to day index (accounting for 7 days of the week)
      const dayIndex = (cellIndex - 1) % 7;
      const date = dayHeaders[dayIndex] || '';
      const dayName = dayNames[dayIndex] || '';

      const cellHTML = cell.innerHTML;
      
      // Extract subject code (e.g., MLN131, VNR202, SEP490)
      const subjectMatch = cellHTML.match(/([A-Z]{3}\d{3})/);
      
      if (subjectMatch) {
        const subjectCode = subjectMatch[1];
        
        // Extract room info
        const roomMatch = cellHTML.match(/at\s+([^<-]+?)(?:-|<|\()/i);
        const room = roomMatch ? roomMatch[1].trim() : 'TBA';
        
        // Extract time info
        const timeMatch = cellHTML.match(/\((\d+:\d+-\d+:\d+)\)/);
        const time = timeMatch ? timeMatch[1] : '';
        
        // Check for status
        let status: string | undefined;
        if (cellHTML.includes('attended')) {
          status = 'attended';
        } else if (cellHTML.includes('Not yet')) {
          status = 'upcoming';
        } else if (cellHTML.includes('absent')) {
          status = 'absent';
        }

        // Check if online
        const isOnline = cellHTML.includes('Online');
        
        console.log('Found session:', {
          slotNumber,
          dayName,
          date,
          subjectCode,
          room,
          time,
          status,
          isOnline
        });

        sessions.push({
          slotNumber,
          day: dayName,
          date,
          subjectCode,
          subjectName: time,
          room: isOnline ? `${room} (Online)` : room,
          instructor: '',
          status
        });
      }
    }
  });

  return sessions;
}

/**
 * Scrapes schedule data for current week and next 10 weeks
 */
/**
 * Cancels the current scraping operation
 */
export function cancelScraping(): void {
  const storageKey = 'scheduleScrapingProgress';
  sessionStorage.removeItem(storageKey);
  console.log('Scraping cancelled by user');
}

/**
 * Scrapes schedule data for the current week and next 5 weeks
 * by actually changing the dropdown and waiting for page reloads
 */
export async function scrapeSchedule(): Promise<ScraperResult<ScheduleData>> {
  try {
    if (!window.location.href.includes('fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx')) {
      return {
        success: false,
        error: 'Not on schedule page. Please navigate to the Schedule page first.'
      };
    }

    // Check if user cancelled scraping
    const storageKey = 'scheduleScrapingProgress';
    const cancelledKey = 'scheduleScrapingCancelled';
    if (sessionStorage.getItem(cancelledKey) === 'true') {
      sessionStorage.removeItem(cancelledKey);
      sessionStorage.removeItem(storageKey);
      return {
        success: false,
        error: 'Scraping cancelled by user'
      };
    }

    // Get current week number from dropdown
    const weekDropdown = document.querySelector('select[name*="drpSelectWeek"]') as HTMLSelectElement;
    if (!weekDropdown) {
      return {
        success: false,
        error: 'Week dropdown not found'
      };
    }

    const currentWeekNumber = parseInt(weekDropdown.value);
    console.log('Current page is showing week:', currentWeekNumber);

    // Check if there's a year dropdown for year transition handling
    const yearDropdown = document.querySelector('select[name*="drpSelectYear"]') as HTMLSelectElement;
    const currentYear = yearDropdown ? parseInt(yearDropdown.value) : new Date().getFullYear();
    
    // Get max week number from dropdown options
    const weekOptions = Array.from(weekDropdown.options);
    const maxWeekInYear = Math.max(...weekOptions.map(opt => parseInt(opt.value) || 0));
    console.log('Max week in current year:', maxWeekInYear);

    // Check if we've already stored progress in sessionStorage
    const progressData = sessionStorage.getItem(storageKey);
    
    let allSessions: ClassSession[] = [];
    let weeksToScrape: number[] = [];
    let startWeek = currentWeekNumber;
    let scrapingYear = currentYear;
    
    if (progressData) {
      // Resume from previous scraping
      const progress = JSON.parse(progressData);
      allSessions = progress.sessions || [];
      weeksToScrape = progress.weeksToScrape || [];
      startWeek = progress.startWeek || currentWeekNumber;
      scrapingYear = progress.scrapingYear || currentYear;
      
      console.log('Resuming scraping from week', startWeek, 'year', scrapingYear);
      console.log('Already scraped:', allSessions.length, 'sessions');
      console.log('Weeks to scrape:', weeksToScrape);
    } else {
      // First time - set up weeks to scrape (current + next 5)
      startWeek = currentWeekNumber;
      scrapingYear = currentYear;
      for (let i = 0; i <= 5; i++) {
        weeksToScrape.push(currentWeekNumber + i);
      }
      console.log('Starting new scraping session');
      console.log('Will scrape weeks:', weeksToScrape);
    }

    // Parse current page
    const currentSessions = parseScheduleTable(document);
    console.log('Found', currentSessions.length, 'sessions on week', currentWeekNumber);
    
    // Add current sessions (avoid duplicates by checking if we already have sessions from this week)
    const hasThisWeek = allSessions.some(s => {
      const firstCurrentDate = currentSessions[0]?.date;
      return firstCurrentDate && s.date === firstCurrentDate;
    });
    
    if (!hasThisWeek && currentSessions.length > 0) {
      console.log('Adding', currentSessions.length, 'new sessions from week', currentWeekNumber);
      allSessions.push(...currentSessions);
    } else {
      console.log('Week', currentWeekNumber, 'already scraped, skipping');
    }

    // Find next week to scrape (must be greater than current week)
    const remainingWeeks = weeksToScrape.filter(w => w > currentWeekNumber);
    
    if (remainingWeeks.length > 0) {
      // More weeks to scrape - save progress and navigate to next week
      let nextWeek = remainingWeeks[0];
      let targetYear = scrapingYear;
      
      // Check if we need to transition to next year
      const needsYearTransition = nextWeek > maxWeekInYear;
      
      if (needsYearTransition) {
        // We're at the last week of the year, need to go to next year
        targetYear = scrapingYear + 1;
        
        // Adjust nextWeek to be week 1 of next year (or the appropriate week)
        // If we're scraping weeks 50, 51, 52, 53, 54, 55 and max is 52,
        // then weeks 53, 54, 55 should become weeks 1, 2, 3 of next year
        const weeksOverflow = nextWeek - maxWeekInYear;
        nextWeek = weeksOverflow;
        
        console.log(`Week ${remainingWeeks[0]} exceeds max week ${maxWeekInYear}, transitioning to week ${nextWeek} of year ${targetYear}`);
      }
      
      sessionStorage.setItem(storageKey, JSON.stringify({
        sessions: allSessions,
        weeksToScrape: weeksToScrape,
        startWeek: startWeek,
        scrapingYear: targetYear,
        originalWeek: remainingWeeks[0] // Store original week number for progress tracking
      }));
      
      if (needsYearTransition && yearDropdown) {
        console.log('Transitioning to next year:', targetYear);
        
        // First, check if we need to change the year dropdown
        const currentYearValue = parseInt(yearDropdown.value);
        
        if (currentYearValue !== targetYear) {
          // Change year first
          yearDropdown.value = targetYear.toString();
          
          // Trigger year change postback
          const doPostBack = (window as any).__doPostBack;
          if (doPostBack) {
            doPostBack(yearDropdown.name.replace('ctl00$mainContent$', '').replace('ctl00_mainContent_', ''), '');
          } else {
            yearDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          return {
            success: false,
            error: `Transitioning to year ${targetYear}...`
          };
        } else {
          // Year is already correct, just change week
          console.log('Year already set to', targetYear, 'changing to week', nextWeek);
        }
      }
      
      console.log('Changing dropdown to week', nextWeek, `(${weeksToScrape.indexOf(remainingWeeks[0]) + 1}/${weeksToScrape.length})`);
      
      // Change the dropdown value
      weekDropdown.value = nextWeek.toString();
      
      // Trigger the postback by calling the ASP.NET function
      const doPostBack = (window as any).__doPostBack;
      if (doPostBack) {
        const controlName = weekDropdown.name.replace('ctl00$mainContent$', '').replace('ctl00_mainContent_', '');
        doPostBack(controlName, '');
      } else {
        // Fallback: trigger change event
        weekDropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      const currentProgress = weeksToScrape.indexOf(remainingWeeks[0]) + 1;
      
      // Return a pending status
      return {
        success: false,
        error: `Scraping in progress... Loading week ${remainingWeeks[0]} (${currentProgress}/${weeksToScrape.length})`
      };
    } else {
      // All weeks scraped - clear progress and return results
      sessionStorage.removeItem(storageKey);
      
      if (allSessions.length === 0) {
        return {
          success: false,
          error: 'No schedule sessions found in any of the 6 weeks'
        };
      }

      const weekRange = `Week ${weeksToScrape[0]} - ${weeksToScrape[weeksToScrape.length - 1]}`;
      console.log(`Scraping complete! Found ${allSessions.length} total sessions across 6 weeks`);

      return {
        success: true,
        data: {
          weekRange,
          sessions: allSessions
        }
      };
    }
  } catch (error) {
    // Clear progress on error
    sessionStorage.removeItem('scheduleScrapingProgress');
    return {
      success: false,
      error: `Error scraping schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
