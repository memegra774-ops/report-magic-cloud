export type StaffCategory = 
  | 'Local Instructors'
  | 'Not On Duty'
  | 'On Study'
  | 'Not Reporting'
  | 'ARA'
  | 'Not On Duty ARA'
  | 'ASTU Sponsor';

export type SexType = 'M' | 'F';

export type EducationLevel = 'Bsc' | 'BSc' | 'Msc' | 'MSc' | 'PHD' | 'Dip';

export interface Department {
  id: string;
  code: string;
  name: string;
  college_name: string;
  created_at: string;
}

export interface Staff {
  id: string;
  staff_id: string | null;
  full_name: string;
  sex: SexType;
  college_name: string;
  department_id: string | null;
  specialization: string | null;
  education_level: EducationLevel;
  academic_rank: string | null;
  current_status: string;
  category: StaffCategory;
  remark: string | null;
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export interface MonthlyReport {
  id: string;
  report_month: number;
  report_year: number;
  created_at: string;
  created_by: string | null;
}

export interface ReportEntry {
  id: string;
  report_id: string;
  staff_id: string;
  category: StaffCategory;
  current_status: string;
  remark: string | null;
  created_at: string;
  staff?: Staff;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const STAFF_CATEGORIES: StaffCategory[] = [
  'Local Instructors',
  'Not On Duty',
  'On Study',
  'Not Reporting',
  'ARA',
  'Not On Duty ARA',
  'ASTU Sponsor'
];

export const EDUCATION_LEVELS: EducationLevel[] = ['Bsc', 'BSc', 'Msc', 'MSc', 'PHD', 'Dip'];

export const ACADEMIC_RANKS = [
  'Lecturer',
  'S.Lecturer',
  'Senior Lecture',
  'Asst.Prof',
  'Asst.Prof.',
  'Asst. Prof.',
  'Asso.Prof',
  'Asso.Prof.',
  'Asso. Prof.',
  'ARA',
  'SARA',
  'SARA I',
  'SARAI',
  'Chief ARAI',
  'ARA I',
  'Ass. Lecturer',
  'Ass.Lecturer'
];
