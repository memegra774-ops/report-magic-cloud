import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Staff } from '@/types/staff';

export interface ReportColumn {
  key: string;
  label: string;
  get: (s: Staff) => string;
}

export const ALL_COLUMNS: ReportColumn[] = [
  { key: 'staff_id', label: 'Staff ID', get: (s) => s.staff_id || '' },
  { key: 'full_name', label: 'Full Name', get: (s) => s.full_name || '' },
  { key: 'sex', label: 'Sex', get: (s) => s.sex || '' },
  { key: 'college', label: 'College', get: (s) => s.departments?.college_name || s.college_name || '' },
  { key: 'department', label: 'Department', get: (s) => s.departments?.name || '' },
  { key: 'category', label: 'Category', get: (s) => s.category || '' },
  { key: 'current_status', label: 'Status', get: (s) => s.current_status || '' },
  { key: 'education_level', label: 'Education', get: (s) => s.education_level || '' },
  { key: 'academic_rank', label: 'Rank', get: (s) => s.academic_rank || '' },
  { key: 'specialization', label: 'Specialization', get: (s) => s.specialization || '' },
  { key: 'hdp_certified', label: 'HDP', get: (s) => (s.hdp_certified ? 'Yes' : 'No') },
  { key: 'mc_certified', label: 'MC', get: (s) => (s.mc_certified ? 'Yes' : 'No') },
  { key: 'elip_certified', label: 'ELIP', get: (s) => (s.elip_certified ? 'Yes' : 'No') },
  { key: 'marital_status', label: 'Marital', get: (s) => s.marital_status || '' },
  { key: 'date_of_birth', label: 'DOB', get: (s) => s.date_of_birth || '' },
  { key: 'employment_date_astu', label: 'Employed', get: (s) => s.employment_date_astu || '' },
  { key: 'phone_number', label: 'Phone', get: (s) => s.phone_number || '' },
  { key: 'email', label: 'Email', get: (s) => s.email || '' },
];

export const exportCustomReportXlsx = (
  staff: Staff[],
  columns: ReportColumn[],
  title: string
) => {
  const headers = columns.map((c) => c.label);
  const rows = staff.map((s) => columns.map((c) => c.get(s)));
  const ws = XLSX.utils.aoa_to_sheet([
    [title],
    [`Generated: ${new Date().toLocaleString()}  •  Total: ${staff.length}`],
    [],
    headers,
    ...rows,
  ]);
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Custom Report');
  XLSX.writeFile(wb, `custom-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportCustomReportPdf = (
  staff: Staff[],
  columns: ReportColumn[],
  title: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleString()}   •   Total records: ${staff.length}`,
    40,
    58
  );

  autoTable(doc, {
    startY: 75,
    head: [columns.map((c) => c.label)],
    body: staff.map((s) => columns.map((c) => c.get(s))),
    styles: { font: 'times', fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    margin: { left: 30, right: 30 },
  });

  doc.save(`custom-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};
