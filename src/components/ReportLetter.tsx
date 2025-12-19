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

interface StatsRow {
  category: string;
  mOnDuty: number;
  fOnDuty: number;
  mOnStudy: number;
  fOnStudy: number;
  mNotOnDuty: number;
  fNotOnDuty: number;
  mSick: number;
  fSick: number;
  mOnStudyLeave: number;
  fOnStudyLeave: number;
  mTotal: number;
  fTotal: number;
  total: number;
}

const ReportLetter = ({ report, department, signatory = 'Associate Dean for Academic Affairs' }: ReportLetterProps) => {
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
          <title>Staff Report Letter - ${MONTHS[report.report_month - 1]} ${report.report_year}</title>
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

  // Calculate statistics
  const calculateStats = (): StatsRow[] => {
    if (!entries) return [];

    const categories = ['Local Instructors', 'ARA', 'ASTU Sponsor'] as const;
    const stats: StatsRow[] = [];

    categories.forEach((category) => {
      const categoryEntries = entries.filter(e => e.category === category);
      const row: StatsRow = {
        category: category === 'Local Instructors' ? 'Local Instructors' : category === 'ARA' ? 'ARA' : 'ASTU Sponsor Students',
        mOnDuty: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === 'On Duty').length,
        fOnDuty: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === 'On Duty').length,
        mOnStudy: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === 'On Study').length,
        fOnStudy: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === 'On Study').length,
        mNotOnDuty: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === 'Not On Duty').length,
        fNotOnDuty: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === 'Not On Duty').length,
        mSick: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === 'Sick').length,
        fSick: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === 'Sick').length,
        mOnStudyLeave: categoryEntries.filter(e => e.staff?.sex === 'M' && e.current_status === 'On Study Leave').length,
        fOnStudyLeave: categoryEntries.filter(e => e.staff?.sex === 'F' && e.current_status === 'On Study Leave').length,
        mTotal: categoryEntries.filter(e => e.staff?.sex === 'M').length,
        fTotal: categoryEntries.filter(e => e.staff?.sex === 'F').length,
        total: categoryEntries.length,
      };
      stats.push(row);
    });

    return stats;
  };

  const stats = calculateStats();
  const totals = stats.reduce((acc, row) => ({
    mOnDuty: acc.mOnDuty + row.mOnDuty,
    fOnDuty: acc.fOnDuty + row.fOnDuty,
    mOnStudy: acc.mOnStudy + row.mOnStudy,
    fOnStudy: acc.fOnStudy + row.fOnStudy,
    mNotOnDuty: acc.mNotOnDuty + row.mNotOnDuty,
    fNotOnDuty: acc.fNotOnDuty + row.fNotOnDuty,
    mSick: acc.mSick + row.mSick,
    fSick: acc.fSick + row.fSick,
    mOnStudyLeave: acc.mOnStudyLeave + row.mOnStudyLeave,
    fOnStudyLeave: acc.fOnStudyLeave + row.fOnStudyLeave,
    mTotal: acc.mTotal + row.mTotal,
    fTotal: acc.fTotal + row.fTotal,
    total: acc.total + row.total,
  }), {
    mOnDuty: 0, fOnDuty: 0, mOnStudy: 0, fOnStudy: 0,
    mNotOnDuty: 0, fNotOnDuty: 0, mSick: 0, fSick: 0,
    mOnStudyLeave: 0, fOnStudyLeave: 0, mTotal: 0, fTotal: 0, total: 0
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  const monthName = MONTHS[report.report_month - 1];
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">
          Official Letter - {monthName} {report.report_year}
        </h2>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Letter
        </Button>
      </div>

      <div ref={printRef} className="bg-white p-8 rounded-lg border shadow-sm max-w-5xl mx-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
        {/* Letterhead */}
        <div className="letterhead text-center border-b-2 border-primary pb-4 mb-6">
          <p className="text-sm text-muted-foreground">
            P.O. Box: 1888 &nbsp; Tele: +251-221-100026 &nbsp; Fax: +251-022-112-01-50 &nbsp; E-mail: adaa.soeec@astu.et
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
          Subject: Academic Staff Member Report of {monthName} {report.report_year}
        </p>

        {/* Content */}
        <p className="text-justify mb-6" style={{ fontSize: '12pt' }}>
          The following table shows statistics of Academic staff (Local Instructors, Academic and Research Assistants 
          & MSc. Sponsored contract Students) on duty, absent, sick and study leave in College of Electrical 
          Engineering and Computing for the month of {monthName} {report.report_year}. Please kindly find also 
          attached herewith the detail of the report.
        </p>

        {/* Statistics Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse" style={{ fontSize: '11pt' }}>
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-foreground/30 p-2">No</th>
                <th className="border border-foreground/30 p-2">Academic Staff</th>
                <th className="border border-foreground/30 p-2">Sex</th>
                <th className="border border-foreground/30 p-2">On Duty</th>
                <th className="border border-foreground/30 p-2">On Study</th>
                <th className="border border-foreground/30 p-2">Not On Duty</th>
                <th className="border border-foreground/30 p-2">Sick</th>
                <th className="border border-foreground/30 p-2">On Study Leave</th>
                <th className="border border-foreground/30 p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row, index) => (
                <>
                  <tr key={`${row.category}-m`}>
                    <td className="border border-foreground/30 p-2" rowSpan={3}>{index + 1}</td>
                    <td className="border border-foreground/30 p-2 text-left" rowSpan={3}>{row.category}</td>
                    <td className="border border-foreground/30 p-2">M</td>
                    <td className="border border-foreground/30 p-2">{row.mOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.mOnStudy || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.mNotOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.mSick || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.mOnStudyLeave || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.mTotal}</td>
                  </tr>
                  <tr key={`${row.category}-f`}>
                    <td className="border border-foreground/30 p-2">F</td>
                    <td className="border border-foreground/30 p-2">{row.fOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.fOnStudy || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.fNotOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.fSick || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.fOnStudyLeave || '-'}</td>
                    <td className="border border-foreground/30 p-2">{row.fTotal}</td>
                  </tr>
                  <tr key={`${row.category}-t`} className="bg-muted/30">
                    <td className="border border-foreground/30 p-2 font-semibold">T</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.mOnDuty + row.fOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.mOnStudy + row.fOnStudy || '-'}</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.mNotOnDuty + row.fNotOnDuty || '-'}</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.mSick + row.fSick || '-'}</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.mOnStudyLeave + row.fOnStudyLeave || '-'}</td>
                    <td className="border border-foreground/30 p-2 font-semibold">{row.total}</td>
                  </tr>
                </>
              ))}
              {/* Grand Total */}
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2" rowSpan={3}></td>
                <td className="border border-foreground/30 p-2 text-left" rowSpan={3}>Total</td>
                <td className="border border-foreground/30 p-2">M</td>
                <td className="border border-foreground/30 p-2">{totals.mOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.mOnStudy}</td>
                <td className="border border-foreground/30 p-2">{totals.mNotOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.mSick}</td>
                <td className="border border-foreground/30 p-2">{totals.mOnStudyLeave}</td>
                <td className="border border-foreground/30 p-2">{totals.mTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2">F</td>
                <td className="border border-foreground/30 p-2">{totals.fOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.fOnStudy}</td>
                <td className="border border-foreground/30 p-2">{totals.fNotOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.fSick}</td>
                <td className="border border-foreground/30 p-2">{totals.fOnStudyLeave}</td>
                <td className="border border-foreground/30 p-2">{totals.fTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-2">T</td>
                <td className="border border-foreground/30 p-2">{totals.mOnDuty + totals.fOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.mOnStudy + totals.fOnStudy}</td>
                <td className="border border-foreground/30 p-2">{totals.mNotOnDuty + totals.fNotOnDuty}</td>
                <td className="border border-foreground/30 p-2">{totals.mSick + totals.fSick}</td>
                <td className="border border-foreground/30 p-2">{totals.mOnStudyLeave + totals.fOnStudyLeave}</td>
                <td className="border border-foreground/30 p-2">{totals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing */}
        <p className="mb-8" style={{ fontSize: '12pt' }}>With regards</p>

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
