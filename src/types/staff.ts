// Staff categories for the dropdown (as per user requirement)
export type StaffCategory = 'Local Instructors' | 'ARA' | 'ASTU Sponsor';

// Status types for the report
export type StaffStatus = 'On Duty' | 'On Study' | 'Not On Duty' | 'Sick' | 'On Study Leave';

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
  version: number;
  department_id: string | null;
  created_at: string;
  created_by: string | null;
  departments?: Department;
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

// Updated categories as per user requirement
export const STAFF_CATEGORIES: StaffCategory[] = [
  'Local Instructors',
  'ARA',
  'ASTU Sponsor'
];

// Status options for the monthly reports
export const STAFF_STATUSES: StaffStatus[] = [
  'On Duty',
  'On Study',
  'Not On Duty',
  'Sick',
  'On Study Leave'
];

export const EDUCATION_LEVELS: EducationLevel[] = ['Bsc', 'BSc', 'Msc', 'MSc', 'PHD', 'Dip'];

export const ACADEMIC_RANKS = [
  'Lecturer',
  'S.Lecturer',
  'Senior Lecturer',
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

// CSV template headers
export const CSV_TEMPLATE_HEADERS = [
  'staff_id',
  'full_name',
  'sex',
  'specialization',
  'education_level',
  'academic_rank',
  'current_status',
  'category',
  'remark'
];
