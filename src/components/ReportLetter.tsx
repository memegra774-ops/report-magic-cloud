import { useRef } from 'react';
import { MonthlyReport, MONTHS, Department } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

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
            @page { size: A4 portrait; margin: 12mm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 10pt;
              line-height: 1.3;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .letterhead {
              text-align: center;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .letterhead h1 { 
              font-size: 13pt; 
              font-weight: bold; 
              margin: 0;
              color: #1e40af;
            }
            .letterhead h2 { 
              font-size: 11pt; 
              margin: 3px 0; 
            }
            .letterhead p { 
              font-size: 8pt; 
              color: #666; 
              margin: 2px 0;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 10pt;
            }
            .subject {
              font-weight: bold;
              text-decoration: underline;
              margin: 12px 0 8px;
              font-size: 10pt;
            }
            .content {
              text-align: justify;
              margin-bottom: 10px;
              font-size: 10pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9pt;
            }
            th, td {
              border: 1px solid #000;
              padding: 3px 2px;
              text-align: center;
            }
            th {
              background-color: #1e40af;
              color: white;
              font-weight: bold;
              font-size: 8pt;
            }
            .category-cell {
              text-align: left;
              padding-left: 4px;
              font-size: 8pt;
            }
            .total-row {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .signature {
              margin-top: 15px;
              font-size: 10pt;
            }
            .cc {
              margin-top: 10px;
              font-size: 9pt;
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

  const handleExportWord = async () => {
    const monthName = MONTHS[report.report_month - 1];
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const statusListText = uniqueStatuses.length > 0 
      ? uniqueStatuses.join(', ').replace(/, ([^,]*)$/, ' and $1')
      : 'various statuses';

    // Create table rows for docx
    const createTableRows = () => {
      const rows: TableRow[] = [];
      
      // Header row
      const headerCells = [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: '1e40af' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Academic Staff', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: '1e40af' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sex', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: '1e40af' } }),
        ...uniqueStatuses.map(status => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: status, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: '1e40af' } })),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], shading: { fill: '1e40af' } }),
      ];
      rows.push(new TableRow({ children: headerCells }));

      // Data rows
      stats.forEach((row, index) => {
        // Male row
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: String(index + 1), alignment: AlignmentType.CENTER })], rowSpan: 3 }),
            new TableCell({ children: [new Paragraph({ text: row.displayName })], rowSpan: 3 }),
            new TableCell({ children: [new Paragraph({ text: 'M', alignment: AlignmentType.CENTER })] }),
            ...row.statuses.map(s => new TableCell({ children: [new Paragraph({ text: s.male ? String(s.male) : '-', alignment: AlignmentType.CENTER })] })),
            new TableCell({ children: [new Paragraph({ text: String(row.mTotal), alignment: AlignmentType.CENTER })] }),
          ]
        }));
        // Female row
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'F', alignment: AlignmentType.CENTER })] }),
            ...row.statuses.map(s => new TableCell({ children: [new Paragraph({ text: s.female ? String(s.female) : '-', alignment: AlignmentType.CENTER })] })),
            new TableCell({ children: [new Paragraph({ text: String(row.fTotal), alignment: AlignmentType.CENTER })] }),
          ]
        }));
        // Total row
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'T', bold: true })], alignment: AlignmentType.CENTER })] }),
            ...row.statuses.map(s => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s.total ? String(s.total) : '-', bold: true })], alignment: AlignmentType.CENTER })] })),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(row.total), bold: true })], alignment: AlignmentType.CENTER })] }),
          ]
        }));
      });

      // Grand total rows
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '' })], rowSpan: 3 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true })] })], rowSpan: 3 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'M', bold: true })], alignment: AlignmentType.CENTER })] }),
          ...grandTotals.statuses.map(s => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(s.male), bold: true })], alignment: AlignmentType.CENTER })] })),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(grandTotals.mTotal), bold: true })], alignment: AlignmentType.CENTER })] }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'F', bold: true })], alignment: AlignmentType.CENTER })] }),
          ...grandTotals.statuses.map(s => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(s.female), bold: true })], alignment: AlignmentType.CENTER })] })),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(grandTotals.fTotal), bold: true })], alignment: AlignmentType.CENTER })] }),
        ]
      }));
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'T', bold: true })], alignment: AlignmentType.CENTER })] }),
          ...grandTotals.statuses.map(s => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(s.total), bold: true })], alignment: AlignmentType.CENTER })] })),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(grandTotals.total), bold: true })], alignment: AlignmentType.CENTER })] }),
        ]
      }));

      return rows;
    };

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'P.O. Box: 1888 | Tel: +251-221-100026 | E-mail: adaa.soeec@astu.et', size: 18 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY', bold: true, size: 28, color: '1e40af' })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'አዳማ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ', size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: { bottom: { color: '1e40af', size: 12, style: BorderStyle.SINGLE } },
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'To: ', bold: true }),
              new TextRun('Competence and Human Resource Administration Executive'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun(dateStr),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Ref: ', bold: true }),
              new TextRun('ASTU'),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({ text: 'College of Electrical Engineering & Computing' }),
          new Paragraph({ text: signatory }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: `Subject: Academic Staff Member Report for ${monthName} ${report.report_year}`, bold: true, underline: {} })],
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun(`The following table presents the statistics of academic staff members, including Local Instructors, Academic and Research Assistants, and MSc Sponsored Contract Students, categorized by their current status (${statusListText}) in the College of Electrical Engineering and Computing for the month of ${monthName} ${report.report_year}. Please find the detailed report attached herewith.`)],
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: createTableRows(),
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({ text: 'With regards,' }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: signatory, bold: true })] }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: 'CC:', bold: true })] }),
          new Paragraph({ text: '• CoEEC Dean', bullet: { level: 0 } }),
          new Paragraph({ text: '• CoEEC ADAA', bullet: { level: 0 } }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Letter_${monthName}_${report.report_year}.docx`);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportWord}>
            <FileText className="h-4 w-4 mr-2" />
            Export Word
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Letter
          </Button>
        </div>
      </div>

      <div ref={printRef} className="bg-white p-6 rounded-lg border shadow-sm max-w-4xl mx-auto" style={{ fontFamily: "'Times New Roman', serif", fontSize: '10pt' }}>
        {/* Letterhead */}
        <div className="letterhead text-center border-b-2 border-primary pb-3 mb-4">
          <p className="text-xs text-muted-foreground">
            P.O. Box: 1888 | Tel: +251-221-100026 | Fax: +251-022-112-01-50 | E-mail: adaa.soeec@astu.et
          </p>
          <h1 className="text-lg font-bold text-primary mt-1" style={{ fontFamily: "'Times New Roman', serif" }}>
            ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY
          </h1>
          <h2 className="text-base font-semibold" style={{ fontFamily: "'Times New Roman', serif" }}>
            አዳማ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ
          </h2>
        </div>

        {/* Meta info */}
        <div className="flex justify-between text-xs mb-4">
          <div>
            <p><strong>To:</strong> Competence and Human Resource Administration Executive</p>
          </div>
          <div className="text-right">
            <p><strong>Date:</strong> {dateStr}</p>
            <p><strong>Ref:</strong> ASTU</p>
          </div>
        </div>

        {/* From */}
        <div className="mb-3 text-xs">
          <p>College of Electrical Engineering & Computing</p>
          <p>{signatory}</p>
        </div>

        {/* Subject */}
        <p className="font-bold underline my-3 text-xs">
          Subject: Academic Staff Member Report for {monthName} {report.report_year}
        </p>

        {/* Content */}
        <p className="text-justify mb-4 text-xs">
          The following table presents the statistics of academic staff members, including Local Instructors, 
          Academic and Research Assistants, and MSc Sponsored Contract Students, categorized by their current status 
          ({statusListText}) in the College of Electrical Engineering and Computing for the month of {monthName} {report.report_year}. 
          Please find the detailed report attached herewith.
        </p>

        {/* Statistics Table with Dynamic Status Columns */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-foreground/30 p-1">No</th>
                <th className="border border-foreground/30 p-1">Academic Staff</th>
                <th className="border border-foreground/30 p-1">Sex</th>
                {uniqueStatuses.map(status => (
                  <th key={status} className="border border-foreground/30 p-1 text-xs">{status}</th>
                ))}
                <th className="border border-foreground/30 p-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row, index) => (
                <>
                  <tr key={`${row.category}-m`}>
                    <td className="border border-foreground/30 p-1 text-center" rowSpan={3}>{index + 1}</td>
                    <td className="border border-foreground/30 p-1 text-left text-xs" rowSpan={3}>{row.displayName}</td>
                    <td className="border border-foreground/30 p-1 text-center">M</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-m-${s.status}`} className="border border-foreground/30 p-1 text-center">
                        {s.male || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-1 text-center">{row.mTotal}</td>
                  </tr>
                  <tr key={`${row.category}-f`}>
                    <td className="border border-foreground/30 p-1 text-center">F</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-f-${s.status}`} className="border border-foreground/30 p-1 text-center">
                        {s.female || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-1 text-center">{row.fTotal}</td>
                  </tr>
                  <tr key={`${row.category}-t`} className="bg-muted/30">
                    <td className="border border-foreground/30 p-1 text-center font-semibold">T</td>
                    {row.statuses.map(s => (
                      <td key={`${row.category}-t-${s.status}`} className="border border-foreground/30 p-1 text-center font-semibold">
                        {s.total || '-'}
                      </td>
                    ))}
                    <td className="border border-foreground/30 p-1 text-center font-semibold">{row.total}</td>
                  </tr>
                </>
              ))}
              {/* Grand Total */}
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-1" rowSpan={3}></td>
                <td className="border border-foreground/30 p-1 text-left" rowSpan={3}>Total</td>
                <td className="border border-foreground/30 p-1 text-center">M</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-m-${s.status}`} className="border border-foreground/30 p-1 text-center">{s.male}</td>
                ))}
                <td className="border border-foreground/30 p-1 text-center">{grandTotals.mTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-1 text-center">F</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-f-${s.status}`} className="border border-foreground/30 p-1 text-center">{s.female}</td>
                ))}
                <td className="border border-foreground/30 p-1 text-center">{grandTotals.fTotal}</td>
              </tr>
              <tr className="bg-muted font-bold">
                <td className="border border-foreground/30 p-1 text-center">T</td>
                {grandTotals.statuses.map(s => (
                  <td key={`total-t-${s.status}`} className="border border-foreground/30 p-1 text-center">{s.total}</td>
                ))}
                <td className="border border-foreground/30 p-1 text-center">{grandTotals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing */}
        <p className="mb-4 text-xs">With regards,</p>

        {/* Signature */}
        <div className="mt-6">
          <p className="font-semibold text-xs">{signatory}</p>
        </div>

        {/* CC */}
        <div className="mt-4 text-xs">
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