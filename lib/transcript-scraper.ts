import type { TranscriptData, ScraperResult, SubjectGrade } from './types';

/**
 * Scrapes transcript data from FPT FAP Grade page
 */
export async function scrapeTranscript(): Promise<ScraperResult<TranscriptData>> {
  try {
    // Check if we're on the correct page
    if (!window.location.href.includes('fap.fpt.edu.vn/Grade/StudentTranscript.aspx')) {
      return {
        success: false,
        error: 'Not on transcript page. Please navigate to the Grade page first.'
      };
    }

    // Get student info from page title or header
    const pageTitle = document.querySelector('.PageTitle') || document.querySelector('h1');
    const titleText = pageTitle?.textContent || '';
    
    // Extract student ID and name (format: "Grade report for transcipt SE183456 - BIT_SE_NET_18A")
    const studentIdMatch = titleText.match(/SE\d+|[A-Z]{2}\d+/);
    const studentId = studentIdMatch ? studentIdMatch[0] : 'Unknown';
    
    // Find the main grade table
    const table = document.querySelector('table[class*="table"]') || document.querySelector('table');
    
    if (!table) {
      return {
        success: false,
        error: 'Could not find grade table on page'
      };
    }

    const subjects: SubjectGrade[] = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      
      // Skip if not enough cells (header rows or empty rows)
      if (cells.length < 7) return;

      const no = parseInt(cells[0]?.textContent?.trim() || '0');
      const term = parseInt(cells[1]?.textContent?.trim() || '0');
      const semester = cells[2]?.textContent?.trim() || '';
      const subjectCode = cells[3]?.textContent?.trim() || '';
      const prerequisite = cells[4]?.textContent?.trim() || undefined;
      const replacedSubject = cells[5]?.textContent?.trim() || undefined;
      const subjectName = cells[6]?.textContent?.trim() || '';
      const credit = parseInt(cells[7]?.textContent?.trim() || '0');
      const grade = cells[8]?.textContent?.trim() || '';
      const status = cells[9]?.textContent?.trim() || '';

      // Only add if we have valid data
      if (no && subjectCode && subjectName) {
        subjects.push({
          no,
          term,
          semester,
          subjectCode,
          prerequisite,
          replacedSubject,
          subjectName,
          credit,
          grade,
          status
        });
      }
    });

    if (subjects.length === 0) {
      return {
        success: false,
        error: 'No subjects found in table'
      };
    }

    return {
      success: true,
      data: {
        studentId,
        studentName: titleText.replace(/Grade report for transcipt\s*/i, '').split('-')[0].trim(),
        subjects
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Error scraping transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
