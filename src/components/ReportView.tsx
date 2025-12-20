import { useRef } from 'react';
import { MonthlyReport, MONTHS, Staff, STAFF_STATUSES } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer, FileSpreadsheet } from 'lucide-react';
import StatusBadge from './StatusBadge';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReportViewProps {
  report: MonthlyReport;
}

// Report sections matching the PDF template exactly
type ReportSection = {
  id: string;
  title: string;
  categoryFilter: string;
  statusFilter?: string;
};

const REPORT_SECTIONS: ReportSection[] = [
  { id: 'local-on-duty', title: 'On Duty Academic Staff Report', categoryFilter: 'Local Instructors', statusFilter: 'On Duty' },
  { id: 'local-not-on-duty', title: 'Not On Duty Academic Staff Report', categoryFilter: 'Local Instructors', statusFilter: 'Not On Duty' },
  { id: 'local-on-study', title: 'On Study Academic Staff Report', categoryFilter: 'Local Instructors', statusFilter: 'On Study' },
  { id: 'local-not-reporting', title: 'Not Reporting On Study Academic Staff Report', categoryFilter: 'Local Instructors', statusFilter: 'On Study Leave' },
  { id: 'local-sick', title: 'Sick Academic Staff Report', categoryFilter: 'Local Instructors', statusFilter: 'Sick' },
  { id: 'ara-on-duty', title: 'On Duty Academic and Research Assistances Report', categoryFilter: 'ARA', statusFilter: 'On Duty' },
  { id: 'ara-not-on-duty', title: 'Not On Duty Academic and Research Assistances Report', categoryFilter: 'ARA', statusFilter: 'Not On Duty' },
  { id: 'ara-on-study', title: 'On Study Academic and Research Assistances Report', categoryFilter: 'ARA', statusFilter: 'On Study' },
  { id: 'ara-sick', title: 'Sick Academic and Research Assistances Report', categoryFilter: 'ARA', statusFilter: 'Sick' },
  { id: 'astu-sponsor', title: 'ASTU Sponsors Report', categoryFilter: 'ASTU Sponsor' },
];

const ReportView = ({ report }: ReportViewProps) => {
  const { data: entries, isLoading } = useReportEntries(report.id);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const versionText = report.version > 1 ? ` (Version ${report.version})` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Report - ${MONTHS[report.report_month - 1]} ${report.report_year}${versionText}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 10mm; 
            }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              padding: 10px; 
            }
            .section-container {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 30px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 4px 6px; 
              text-align: left; 
              font-size: 11pt; 
            }
            th { 
              background-color: #1e40af; 
              color: white; 
              font-weight: bold;
            }
            .section-header { 
              text-align: center; 
              margin-bottom: 10px; 
            }
            .section-header h1 { 
              font-size: 14pt; 
              font-weight: bold; 
              margin: 0;
            }
            .section-header h2 { 
              font-size: 12pt; 
              margin: 3px 0;
            }
            .section-title { 
              background-color: #f3f4f6; 
              font-weight: bold; 
              padding: 8px; 
              margin-top: 15px;
              font-size: 12pt;
              border: 1px solid #000;
            }
            .text-center { text-align: center; }
            .footer-signatures {
              margin-top: 40px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-row {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .signature-block {
              width: 45%;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              width: 200px;
              margin-top: 30px;
            }
            .hide-in-section {
              display: none;
            }
            .last-page-only {
              display: block;
            }
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .section-container { page-break-inside: avoid; break-inside: avoid; }
              .hide-in-section { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = () => {
    if (!entries || entries.length === 0) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create data for each section
    REPORT_SECTIONS.forEach((section) => {
      const sectionEntries = getEntriesForSection(section);
      if (sectionEntries.length === 0) return;

      const data = sectionEntries.map((entry, index) => ({
        '#': index + 1,
        'Staff ID': entry.staff?.staff_id || '-',
        'Full Name': entry.staff?.full_name || '-',
        'Sex': entry.staff?.sex || '-',
        'College': entry.staff?.college_name || 'CoEEC',
        'Department': entry.staff?.departments?.code || '-',
        'Specialization': entry.staff?.specialization || '-',
        'Edu. Level': entry.staff?.education_level || '-',
        'Academic Rank': entry.staff?.academic_rank || '-',
        'Current Status': entry.current_status || '-',
        'Remark': entry.remark || '-',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Shorten the sheet name to max 31 characters (Excel limitation)
      const sheetName = section.title.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Create a summary sheet with all entries
    const allData = entries.map((entry, index) => ({
      '#': index + 1,
      'Staff ID': entry.staff?.staff_id || '-',
      'Full Name': entry.staff?.full_name || '-',
      'Sex': entry.staff?.sex || '-',
      'College': entry.staff?.college_name || 'CoEEC',
      'Department': entry.staff?.departments?.code || '-',
      'Specialization': entry.staff?.specialization || '-',
      'Edu. Level': entry.staff?.education_level || '-',
      'Academic Rank': entry.staff?.academic_rank || '-',
      'Category': entry.category || '-',
      'Current Status': entry.current_status || '-',
      'Remark': entry.remark || '-',
    }));

    const summaryWs = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'All Staff');

    // Download the file
    const fileName = `Report_${MONTHS[report.report_month - 1]}_${report.report_year}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Filter entries by section
  const getEntriesForSection = (section: ReportSection) => {
    if (!entries) return [];
    return entries.filter(entry => {
      const categoryMatch = entry.category === section.categoryFilter;
      if (section.statusFilter) {
        return categoryMatch && entry.current_status === section.statusFilter;
      }
      return categoryMatch;
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  const versionText = report.version > 1 ? ` (Version ${report.version})` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">
          {MONTHS[report.report_month - 1]} {report.report_year} Report{versionText}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div ref={printRef}>
        {REPORT_SECTIONS.map((section, sectionIndex) => {
          const sectionEntries = getEntriesForSection(section);
          if (sectionEntries.length === 0) return null;

          // Check if this is the last section with entries
          const remainingSections = REPORT_SECTIONS.slice(sectionIndex + 1);
          const isLastSection = !remainingSections.some(s => getEntriesForSection(s).length > 0);

          return (
            <div key={section.id} className="section-container mb-6 animate-slide-up" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              {/* Section Header */}
              <div className="section-header text-center mb-3">
                <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: '14pt', fontWeight: 'bold' }}>
                  Adama Science & Technology University
                </h1>
                <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt' }}>
                  College of Electrical Engineering & Computing
                </h2>
                <p style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', fontWeight: 'bold', marginTop: '5px' }}>
                  {section.title} of {MONTHS[report.report_month - 1]}, {report.report_year}
                </p>
              </div>
              
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header hover:bg-primary">
                      <TableHead className="text-primary-foreground w-10 text-center">#</TableHead>
                      <TableHead className="text-primary-foreground">Staff ID</TableHead>
                      <TableHead className="text-primary-foreground">Full Name</TableHead>
                      <TableHead className="text-primary-foreground text-center w-12">Sex</TableHead>
                      <TableHead className="text-primary-foreground">College</TableHead>
                      <TableHead className="text-primary-foreground w-16">Dep</TableHead>
                      <TableHead className="text-primary-foreground">Specialization</TableHead>
                      <TableHead className="text-primary-foreground text-center w-16">Edu. Level</TableHead>
                      <TableHead className="text-primary-foreground">Academic Rank</TableHead>
                      <TableHead className="text-primary-foreground">Current Status</TableHead>
                      <TableHead className="text-primary-foreground">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionEntries.map((entry, index) => (
                      <TableRow key={entry.id} className="table-row-hover">
                        <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.staff?.staff_id || '-'}</TableCell>
                        <TableCell className="font-medium">{entry.staff?.full_name}</TableCell>
                        <TableCell className="text-center">{entry.staff?.sex}</TableCell>
                        <TableCell>{entry.staff?.college_name || 'CoEEC'}</TableCell>
                        <TableCell>{entry.staff?.departments?.code || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{entry.staff?.specialization || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                            {entry.staff?.education_level}
                          </span>
                        </TableCell>
                        <TableCell>{entry.staff?.academic_rank || '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={entry.current_status} />
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate text-muted-foreground">
                          {entry.remark || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer with Prepared by and Approved by - Only on last page */}
              {isLastSection && (
                <div className="footer-signatures mt-8 last-page-only" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="grid grid-cols-2 gap-8 mt-6">
                    <div className="space-y-2">
                      <p style={{ fontFamily: "'Times New Roman', serif" }}>
                        <strong>Prepared by:</strong> ______________________________
                      </p>
                      <p style={{ fontFamily: "'Times New Roman', serif", marginTop: '20px' }}>
                        <strong>Signature:</strong> ______________________________
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p style={{ fontFamily: "'Times New Roman', serif" }}>
                        <strong>Approved by:</strong> ______________________________
                      </p>
                      <p style={{ fontFamily: "'Times New Roman', serif", marginTop: '20px' }}>
                        <strong>Signature:</strong> ______________________________
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportView;