// Types for scraped data
export interface SubjectGrade {
  no: number;
  term: number;
  semester: string;
  subjectCode: string;
  prerequisite?: string;
  replacedSubject?: string;
  subjectName: string;
  credit: number;
  grade: string;
  status: string;
}

export interface TranscriptData {
  studentId: string;
  studentName: string;
  subjects: SubjectGrade[];
}

export interface TimeSlot {
  slot: number;
  time: string;
}

export interface ClassSession {
  slotNumber: number;
  day: string;
  date: string;
  subjectCode: string;
  subjectName: string;
  room: string;
  instructor: string;
  status?: string;
}

export interface ScheduleData {
  weekRange: string;
  sessions: ClassSession[];
}

export interface ScraperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
