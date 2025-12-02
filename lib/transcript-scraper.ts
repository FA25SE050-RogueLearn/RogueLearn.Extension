// RogueLearn.Extension/lib/transcript-scraper.ts
import type { TranscriptData, ScraperResult, SubjectGrade } from './types';

/**
 * Scrapes transcript data from FAP FAP Grade page
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
    
    // 1. TARGETING FIX: Use the specific ID from your HTML to find the grade container
    const gradeContainer = document.getElementById('ctl00_mainContent_divGrade');
    
    // 2. TABLE FIX: Find the table specifically within that container
    const table = gradeContainer ? gradeContainer.querySelector('table') : document.querySelector('table.table');
    
    if (!table) {
      return {
        success: false,
        error: 'Could not find grade table on page'
      };
    }

    // 3. DYNAMIC HEADER MAPPING: Read <thead> to find exact column indices
    // This makes it work even if FAP adds a new column in the future
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const headers = headerCells.map(th => th.textContent?.trim().toLowerCase() || '');

    // Default indices based on the HTML you provided (0-based index)
    const idx = {
      no: 0,
      term: 1,
      semester: 2,
      code: 3,
      prereq: 4,
      replaced: 5,
      name: 6,
      credit: 7,
      grade: 8,
      status: 9
    };

    // Update indices if headers are found
    if (headers.length > 0) {
      const findIdx = (key: string) => headers.findIndex(h => h.includes(key));
      
      const noIdx = findIdx('no');
      if (noIdx !== -1) idx.no = noIdx;

      const termIdx = findIdx('term');
      if (termIdx !== -1) idx.term = termIdx;

      const semIdx = findIdx('semester');
      if (semIdx !== -1) idx.semester = semIdx;

      const codeIdx = findIdx('subject code');
      if (codeIdx !== -1) idx.code = codeIdx;

      const prereqIdx = findIdx('prerequisite');
      if (prereqIdx !== -1) idx.prereq = prereqIdx;

      const replacedIdx = findIdx('replaced');
      if (replacedIdx !== -1) idx.replaced = replacedIdx;

      const nameIdx = findIdx('subject name');
      if (nameIdx !== -1) idx.name = nameIdx;

      const creditIdx = findIdx('credit');
      if (creditIdx !== -1) idx.credit = creditIdx;

      const gradeIdx = findIdx('grade');
      if (gradeIdx !== -1) idx.grade = gradeIdx;

      const statusIdx = findIdx('status');
      if (statusIdx !== -1) idx.status = statusIdx;
    }

    console.log('Column mapping:', idx);

    const subjects: SubjectGrade[] = [];
    // 4. ROW EXTRACTION: Only look at rows inside the tbody of this specific table
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      
      // Validation: Check if the row has enough cells to cover the Max Index we need
      const maxIndex = Math.max(...Object.values(idx));
      if (cells.length <= maxIndex) return;

      const no = parseInt(cells[idx.no]?.textContent?.trim() || '0');
      const term = parseInt(cells[idx.term]?.textContent?.trim() || '0');
      const semester = cells[idx.semester]?.textContent?.trim() || '';
      const subjectCode = cells[idx.code]?.textContent?.trim() || '';
      const prerequisite = cells[idx.prereq]?.textContent?.trim() || undefined;
      const replacedSubject = cells[idx.replaced]?.textContent?.trim() || undefined;
      const subjectName = cells[idx.name]?.textContent?.trim() || '';
      const credit = parseInt(cells[idx.credit]?.textContent?.trim() || '0');
      const grade = cells[idx.grade]?.textContent?.trim() || '';
      const status = cells[idx.status]?.textContent?.trim() || '';

      // Only add if we have valid data
      if (subjectCode && subjectName) {
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