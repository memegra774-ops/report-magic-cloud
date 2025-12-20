import { useRef } from 'react';
import { MonthlyReport, MONTHS, Department } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ReportLetterProps {
  report: MonthlyReport;
  department?: Department | null;
  signatory?: string;
}

interface StatusCount {
  status: string;
  male: number;
  female: number;
  total: number;
}

interface CategoryStats {
  category: string;
  displayName: string;
  statuses: StatusCount[];
  mTotal: number;
  fTotal: number;
  total: number;
}

const ReportLetter = ({ report, department, signatory = 'Associate Dean for Academic Affairs' }: ReportLetterProps) => {
  const { data: entries, isLoading } = useReportEntries(report.id);
  const printRef = useRef<HTMLDivElement>(null);

  // Get unique statuses from entries
  const getUniqueStatuses = (): string[] => {
    if (!entries) return [];
    const statuses = new Set<string>();
    entries.forEach(e => {
      if (e.current_status) {
        statuses.add(e.current_status);
      }
    });
    return Array.from(statuses).sort();
  };

  // Calculate statistics with dynamic status columns
  const calculateStats = (): { stats: CategoryStats[]; uniqueStatuses: string[] } => {
    if (!entries) return { stats: [], uniqueStatuses: [] };

    const uniqueStatuses = getUniqueStatuses();
    const categories = [
      { key: 'Local Instructors', display: 'Local Instructors' },
      { key: 'ARA', display: 'Academic and Research Assistants' },
      { key: 'ASTU Sponsor', display: 'ASTU Sponsor Students' }
    ] as const;
    
    const stats: CategoryStats[] = [];

    categories.forEach((cat) => {
      const categoryEntries = entries.filter(e => e.category === cat.key);
      
      const statuses: StatusCount[] = uniqueStatuses.map(status => ({
        status,
        male: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === status).length,
        female: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === status).length,
        total: categoryEntries.filter(e => e.current_status === status).length,
      }));

      stats.push({
        category: cat.key,
        displayName: cat.display,
        statuses,
        mTotal: categoryEntries.filter(e => e.staff?.sex === 'M').length,
        fTotal: categoryEntries.filter(e => e.staff?.sex === 'F').length,
        total: categoryEntries.length,
      });
    });

    return { stats, uniqueStatuses };
  };

  const { stats, uniqueStatuses } = calculateStats();
  
  // Calculate grand totals
  const grandTotals = {
    statuses: uniqueStatuses.map(status => ({
      status,
      male: stats.reduce((acc, row) => acc + (row.statuses.find(s => s.status === status)?.male || 0), 0),
      female: stats.reduce((acc, row) => acc + (row.statuses.find(s => s.status === status)?.female || 0), 0),
      total: stats.reduce((acc, row) => acc + (row.statuses.find(s => s.status === status)?.total || 0), 0),
    })),
    mTotal: stats.reduce((acc, row) => acc + row.mTotal, 0),
    fTotal: stats.reduce((acc, row) => acc + row.fTotal, 0),
    total: stats.reduce((acc, row) => acc + row.total, 0),
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const versionText = report.version > 1 ? ` (Version ${report.version})` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Staff Report Letter - ${MONTHS[report.report_month - 1]} ${report.report_year}${versionText}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            .letterhead {
              text-align: center;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .letterhead h1 { 
              font-size: 16pt; 
              font-weight: bold; 
              margin: 0;
              color: #1e40af;
            }
            .letterhead h2 { 
              font-size: 14pt; 
              margin: 5px 0; 
            }
            .letterhead p { 
              font-size: 10pt; 
              color: #666; 
              margin: 3px 0;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .meta-left, .meta-right {
              font-size: 11pt;
            }
            .recipient {
              margin-bottom: 15px;
            }
            .subject {
              font-weight: bold;
              text-decoration: underline;
              margin: 20px 0;
            }
            .content {
              text-align: justify;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 11pt;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
            }
            th {
              background-color: #1e40af;
              color: white;
              font-weight: bold;
            }
            .category-cell {
              text-align: left;
              padding-left: 8px;
            }
            .total-row {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .signature {
              margin-top: 40px;
            }
            .signature p {
              margin: 5px 0;
            }
            .cc {
              margin-top: 30px;
              font-size: 10pt;
            }
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  const monthName = MONTHS[report.report_month - 1];
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  const versionText = report.version > 1 ? ` (Version ${report.version})` : '';

  // Generate status list for letter text
  const statusListText = uniqueStatuses.length > 0 
    ? uniqueStatuses.join(', ').replace(/, ([^,]*)$/, ' and $1')
    : 'various statuses';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">
          Official Letter - {monthName} {report.report_year}{versionText}
        </h2>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Letter
        </Button>
      </div>

      <div ref={printRef} className="bg-white p-8 rounded-lg border shadow-sm max-w-6xl mx-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
        {/* Letterhead */}
        <div className="letterhead text-center border-b-2 border-primary pb-4 mb-6">
          <p className="text-sm text-muted-foreground">
            P.O. Box: 1888 &nbsp; Tel: +251-221-100026 &nbsp; Fax: +251-022-112-01-50 &nbsp; E-mail: adaa.soeec@astu.et
          </p>
          <h1 className="text-2xl font-bold text-primary mt-2" style={{ fontFamily: "'Times New Roman', serif" }}>
            ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY
          </h1>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "'Times New Roman', serif" }}>
            አዳማ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ
          </h2>
        </div>

        {/* Meta info */}
        <div className="flex justify-between text-sm mb-6" style={{ fontSize: '12pt' }}>
          <div>
            <p><strong>To:</strong> Competence and Human Resource Administration Executive</p>
          </div>
          <div className="text-right">
            <p><strong>Date:</strong> {dateStr}</p>
            <p><strong>Ref:</strong> ASTU</p>
          </div>
        </div>

        {/* From */}
        <div className="mb-4" style={{ fontSize: '12pt' }}>
          <p>College of Electrical Engineering & Computing</p>
          <p>{signatory}</p>
        </div>

        {/* Subject */}
        <p className="font-bold underline my-6" style={{ fontSize: '12pt' }}>
          Subject: Academic Staff Member Report for {monthName} {report.report_year}
        </p>

        {/* Content */}
        <p className="text-justify mb-6" style={{ fontSize: '12pt' }}>
          The following table presents the statistics of academic staff members, including Local Instructors, 
          Academic and Research Assistants, and MSc Sponsored Contract Students, categorized by their current status 
          ({statusListText}) in the College of Electrical Engineering and Computing for the month of {monthName} {report.report_year}. 
          Please find the detailed report attached herewith.
        </p>

        {/* Statistics Table with Dynamic Status Columns */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse" style={{ fontSize: '11pt' }}>
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-foreground/30 p-2">No</th>
                <th className="border border-foreground/30 p-2">Academic Staff</th>
                <th className="border border-foreground/30 p-2">Sex</th>
                {uniqueStatuses.map(status => (
                  <th key={status} className="border border-foreground/30 p-2">{status}</th>
                ))}
                <th className="border border-foreground/30 p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row, index) => (
                <>
                  <tr key={`${row.category}-m`}>
                    <td className="border border-foreground/30 p-2" rowSpan={3}>{index + 1}</td>
                    <td className="border border-foreground/30 p-2 text-left" rowSpan={3}>{row.displayName}</td>
                    <td className="border border-foreground/30 p-2">M</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-m-${s.status}`} className="border border-foreground/30 p-2">
                        {s.male || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-2">{row.mTotal}</td>
                  </tr>
                  <tr key={`${row.category}-f`}>
                    <td className="border border-foreground/30 p-2">F</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-f-${s.status}`} className="border border-foreground/30 p-2">
                        {s.female || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-2">{row.fTotal}</td>
                  </tr>
                  <tr key={`${row.category}-t`} className="bg-muted/30">
                    <td className="border border-foreground/30 p-2 font-semibold">T</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-t-${s.status}`} className="border border-foreground/30 p-2 font-semibold">
                        {s.total || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-2 font-semibold">{row.total}</td>
                  </tr>
                </>
              ))}
              {/* Grand Total */}
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2" rowSpan={3}></td>
                <td className="border border-foreground/30 p-2 text-left" rowSpan={3}>Total</td>
                <td className="border border-foreground/30 p-2">M</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-m-${s.status}`} className="border border-foreground/30 p-2">{s.male}</td>
                ))}
                <td className="border border-foreground/30 p-2">{grandTotals.mTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2">F</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-f-${s.status}`} className="border border-foreground/30 p-2">{s.female}</td>
                ))}
                <td className="border border-foreground/30 p-2">{grandTotals.fTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2">T</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-t-${s.status}`} className="border border-foreground/30 p-2">{s.total}</td>
                ))}
                <td className="border border-foreground/30 p-2">{grandTotals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing */}
        <p className="mb-8" style={{ fontSize: '12pt' }}>With regards,</p>

        {/* Signature */}
        <div className="mt-12">
          <p className="font-semibold" style={{ fontSize: '12pt' }}>{signatory}</p>
        </div>

        {/* CC */}
        <div className="mt-8" style={{ fontSize: '11pt' }}>
          <p className="font-semibold">CC:</p>
          <ul className="ml-4">
            <li>CoEEC Dean</li>
            <li>CoEEC ADAA</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportLetter;