import { useRef } from 'react';
import { MonthlyReport, MONTHS, STAFF_CATEGORIES, StaffCategory, Staff } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import StatusBadge from './StatusBadge';
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

const ReportView = ({ report }: ReportViewProps) => {
  const { data: entries, isLoading } = useReportEntries(report.id);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Report - ${MONTHS[report.report_month - 1]} ${report.report_year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #1e40af; color: white; }
            .header { text-align: center; margin-bottom: 20px; }
            .section-title { background-color: #f3f4f6; font-weight: bold; padding: 10px; margin-top: 20px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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

  const groupedEntries = entries?.reduce((acc, entry) => {
    const category = entry.category as StaffCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(entry);
    return acc;
  }, {} as Record<StaffCategory, typeof entries>);

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">
          {MONTHS[report.report_month - 1]} {report.report_year} Report
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div ref={printRef}>
        <div className="header text-center mb-6">
          <h1 className="text-xl font-bold">Adama Science & Technology University</h1>
          <h2 className="text-lg">College of Electrical Engineering & Computing</h2>
          <p className="text-muted-foreground">
            Staff Report of {MONTHS[report.report_month - 1]}, {report.report_year}
          </p>
        </div>

        {STAFF_CATEGORIES.map((category) => {
          const categoryEntries = groupedEntries?.[category];
          if (!categoryEntries || categoryEntries.length === 0) return null;

          return (
            <div key={category} className="mb-8 animate-slide-up">
              <h3 className="text-lg font-semibold bg-secondary px-4 py-2 rounded-t-lg">
                {getCategoryTitle(category, report.report_month, report.report_year)}
              </h3>
              <div className="rounded-b-lg border border-t-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header hover:bg-primary">
                      <TableHead className="text-primary-foreground w-12">#</TableHead>
                      <TableHead className="text-primary-foreground">Staff ID</TableHead>
                      <TableHead className="text-primary-foreground">Full Name</TableHead>
                      <TableHead className="text-primary-foreground text-center">Sex</TableHead>
                      <TableHead className="text-primary-foreground">Dept</TableHead>
                      <TableHead className="text-primary-foreground">Specialization</TableHead>
                      <TableHead className="text-primary-foreground text-center">Edu.</TableHead>
                      <TableHead className="text-primary-foreground">Academic Rank</TableHead>
                      <TableHead className="text-primary-foreground">Status</TableHead>
                      <TableHead className="text-primary-foreground">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryEntries.map((entry, index) => (
                      <TableRow key={entry.id} className="table-row-hover">
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.staff?.staff_id || '-'}</TableCell>
                        <TableCell className="font-medium">{entry.staff?.full_name}</TableCell>
                        <TableCell className="text-center">{entry.staff?.sex}</TableCell>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getCategoryTitle = (category: StaffCategory, month: number, year: number) => {
  const monthName = MONTHS[month - 1];
  const titles: Record<StaffCategory, string> = {
    'Local Instructors': `On Duty Academic Staff Report of ${monthName}, ${year}`,
    'ARA': `On Duty Academic and Research Assistants Report of ${monthName}, ${year}`,
    'ASTU Sponsor': `ASTU Sponsors Report of ${monthName}, ${year}`,
  };
  return titles[category];
};

export default ReportView;
