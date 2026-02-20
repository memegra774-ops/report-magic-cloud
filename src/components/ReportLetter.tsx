import { useRef, useEffect, useState } from 'react';
import { MonthlyReport, MONTHS, Department } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import astuLogo from '@/assets/astu-logo.png';

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

const FIXED_STATUSES = ['Not On Duty', 'On Duty', 'On Study', 'On Study and Not Reporting', 'Sick'];

const ReportLetter = ({ report, department, signatory }: ReportLetterProps) => {
  const { data: entries, isLoading } = useReportEntries(report.id);
  const printRef = useRef<HTMLDivElement>(null);
  const [deptHeadName, setDeptHeadName] = useState<string>('');
  const [deptHeadEmail, setDeptHeadEmail] = useState<string>('');

  const isDepartmentReport = !!report.department_id;
  const departmentName = department?.name || 'Department';

  // Fetch department head name and email from profiles + user_roles
  useEffect(() => {
    const fetchDeptHead = async () => {
      if (!report.department_id) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, id')
        .eq('department_id', report.department_id);

      if (data && data.length > 0) {
        // Find which of these profiles has the department_head role
        for (const profile of data) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .eq('role', 'department_head')
            .single();

          if (roleData) {
            setDeptHeadName(profile.full_name || '');
            setDeptHeadEmail(profile.email || '');
            break;
          }
        }
      }
    };

    fetchDeptHead();
  }, [report.department_id]);

  const headName = signatory || deptHeadName || '<<Department Head name>>';
  const contactEmail = deptHeadEmail || '<<department email>>';

  // Calculate statistics with fixed status columns
  const calculateStats = (): CategoryStats[] => {
    if (!entries) return [];

    const categories = [
      { key: 'Local Instructors', display: 'Local Instructors' },
      { key: 'ARA', display: 'Academic and Research Assistants' },
      { key: 'ASTU Sponsor', display: 'ASTU Sponsor Students' }
    ] as const;

    return categories.map((cat) => {
      const categoryEntries = entries.filter(e => e.category === cat.key);

      const statuses: StatusCount[] = FIXED_STATUSES.map(status => ({
        status,
        male: categoryEntries.filter(e => (e.sex || e.staff?.sex) === 'M' && e.current_status === status).length,
        female: categoryEntries.filter(e => (e.sex || e.staff?.sex) === 'F' && e.current_status === status).length,
        total: categoryEntries.filter(e => e.current_status === status).length,
      }));

      return {
        category: cat.key,
        displayName: cat.display,
        statuses,
        mTotal: categoryEntries.filter(e => (e.sex || e.staff?.sex) === 'M').length,
        fTotal: categoryEntries.filter(e => (e.sex || e.staff?.sex) === 'F').length,
        total: categoryEntries.length,
      };
    });
  };

  const stats = calculateStats();

  // Calculate number of staff report pages (rough estimate: ~30 entries per page)
  const totalEntries = entries?.length || 0;
  const numberOfPages = Math.max(1, Math.ceil(totalEntries / 30));

  const grandTotals = {
    statuses: FIXED_STATUSES.map(status => ({
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

    printWindow.document.write(`
      <html>
        <head>
          <title>Staff Report Letter - ${MONTHS[report.report_month - 1]} ${report.report_year}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            .contact-bar {
              background-color: #2c5aa0;
              color: white;
              padding: 4px 10px;
              font-size: 9pt;
              display: flex;
              justify-content: space-between;
              margin-bottom: 0;
            }
            .letterhead {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              padding: 10px 0;
              border-bottom: 3px solid #2c5aa0;
              margin-bottom: 20px;
            }
            .letterhead img {
              height: 60px;
              width: 60px;
            }
            .letterhead-text {
              text-align: center;
            }
            .letterhead-text h1 { 
              font-size: 16pt; 
              font-weight: bold;
              letter-spacing: 1px;
            }
            .letterhead-text h2 { 
              font-size: 13pt;
              font-weight: normal;
            }
            .meta-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 12pt;
            }
            .meta-left { text-align: left; }
            .meta-right { text-align: right; }
            .meta-right p { margin-bottom: 3px; }
            .subject {
              font-weight: bold;
              margin: 20px 0 15px;
              font-size: 12pt;
            }
            .subject u { text-decoration: underline; }
            .content-para {
              text-align: justify;
              margin-bottom: 15px;
              font-size: 12pt;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 11pt;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
              text-align: center;
            }
            th {
              font-weight: bold;
              font-size: 11pt;
            }
            .cat-cell { text-align: left; }
            .total-label { text-align: left; font-weight: bold; }
            .bold { font-weight: bold; }
            .regards { margin-top: 20px; font-size: 12pt; }
            .cc-section {
              margin-top: 40px;
              font-size: 12pt;
            }
            .cc-section u { text-decoration: underline; font-weight: bold; }
            .cc-section ul { margin-left: 30px; list-style-type: disc; }
            .footer-line {
              position: fixed;
              bottom: 10mm;
              left: 0;
              right: 0;
              text-align: center;
              border-top: 2px solid #000;
              padding-top: 5px;
              font-size: 11pt;
              font-style: italic;
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

    const createTableRows = () => {
      const rows: TableRow[] = [];

      // Header row
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Academic Staff', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sex', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })] }),
          ...FIXED_STATUSES.map(status => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: status, bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })] })),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })] }),
        ]
      }));

      stats.forEach((row, index) => {
        const makeCell = (text: string, bold = false) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })]
        });

        // Male row
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(index + 1), font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })], rowSpan: 3 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.displayName, font: 'Times New Roman', size: 22 })] })], rowSpan: 3 }),
            makeCell('M'),
            ...row.statuses.map(s => makeCell(s.male ? String(s.male) : '-')),
            makeCell(String(row.mTotal)),
          ]
        }));
        // Female row
        rows.push(new TableRow({
          children: [
            makeCell('F'),
            ...row.statuses.map(s => makeCell(s.female ? String(s.female) : '-')),
            makeCell(String(row.fTotal)),
          ]
        }));
        // Total row
        rows.push(new TableRow({
          children: [
            makeCell('T', true),
            ...row.statuses.map(s => makeCell(s.total ? String(s.total) : '-', true)),
            makeCell(String(row.total), true),
          ]
        }));
      });

      // Grand total rows
      const makeBoldCell = (text: string) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })]
      });

      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '' })], rowSpan: 3 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, font: 'Times New Roman', size: 22 })] })], rowSpan: 3 }),
          makeBoldCell('M'),
          ...grandTotals.statuses.map(s => makeBoldCell(String(s.male))),
          makeBoldCell(String(grandTotals.mTotal)),
        ]
      }));
      rows.push(new TableRow({
        children: [
          makeBoldCell('F'),
          ...grandTotals.statuses.map(s => makeBoldCell(String(s.female))),
          makeBoldCell(String(grandTotals.fTotal)),
        ]
      }));
      rows.push(new TableRow({
        children: [
          makeBoldCell('T'),
          ...grandTotals.statuses.map(s => makeBoldCell(String(s.total))),
          makeBoldCell(String(grandTotals.total)),
        ]
      }));

      return rows;
    };

    const bodyText = isDepartmentReport
      ? `The following table shows statistics of Academic staff (Local, Instructors, Academic and Research Assistants & MSc. Sponsored contract Students) on duty, absent, sick and study leave in ${departmentName} for the month of ${monthName} ${report.report_year}. Please kindly find also attached here with ${numberOfPages} pages is detail of the report.`
      : `The following table presents the statistics of academic staff members in the College of Electrical Engineering and Computing for the month of ${monthName} ${report.report_year}. Please find the detailed report attached herewith.`;

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } }
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: `P.O. Box: 1888   Tele: +251-221-100026  Fax: +251-022-112-01-50    E-mail: ${contactEmail}`, size: 18, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY', bold: true, size: 32, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'አዳማ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ', size: 26, font: 'Times New Roman' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: { bottom: { color: '2c5aa0', size: 12, style: BorderStyle.SINGLE } },
          }),
          new Paragraph({ spacing: { after: 200 } }),
          // To and Date row
          new Paragraph({
            children: [
              new TextRun({ text: 'To: CoEEC Vice Dean for Academic Affairs', bold: true, font: 'Times New Roman', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: _______________`, font: 'Times New Roman', size: 24 }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'ASTU', bold: true, underline: {}, font: 'Times New Roman', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ref: _______________`, font: 'Times New Roman', size: 24 }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `Head, Department of ${departmentName}`, bold: true, font: 'Times New Roman', size: 24 }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 50 } }),
          new Paragraph({
            children: [
              new TextRun({ text: headName, bold: true, font: 'Times New Roman', size: 24 }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject: ', bold: true, font: 'Times New Roman', size: 24 }),
              new TextRun({ text: `Academic Staff Member Report of ${monthName} ${report.report_year}`, bold: true, underline: {}, font: 'Times New Roman', size: 24 }),
            ],
          }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: bodyText, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: createTableRows(),
          }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: 'With regards', font: 'Times New Roman', size: 24 })] }),
          new Paragraph({ spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: 'CC:', bold: true, underline: {}, font: 'Times New Roman', size: 24 })] }),
          ...(isDepartmentReport
            ? [
                new Paragraph({ children: [new TextRun({ text: `CoEEC Dean`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
                new Paragraph({ children: [new TextRun({ text: `${departmentName} Department`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
              ]
            : [
                new Paragraph({ children: [new TextRun({ text: `CoEEC Dean`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
                new Paragraph({ children: [new TextRun({ text: `CoEEC ADAA`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
              ]
          ),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: 'We are dedicated to Innovative Knowledge', italics: true, font: 'Times New Roman', size: 22 })],
            alignment: AlignmentType.CENTER,
            border: { top: { color: '000000', size: 6, style: BorderStyle.SINGLE } },
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Letter_${monthName}_${report.report_year}${isDepartmentReport ? `_${departmentName}` : ''}.docx`);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  const monthName = MONTHS[report.report_month - 1];
  const versionText = report.version > 1 ? ` (Version ${report.version})` : '';

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

      <div ref={printRef} className="bg-white text-black p-8 rounded-lg border shadow-sm max-w-4xl mx-auto" style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: '1.5' }}>
        {/* Contact bar */}
        <div style={{ backgroundColor: '#2c5aa0', color: 'white', padding: '4px 10px', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', marginBottom: 0 }}>
          <span><strong>P.O. Box: 1888</strong></span>
          <span>Tele: +251-<strong>221</strong>-100026</span>
          <span>Fax: +251-022-112-01-50</span>
          <span>E-mail: {contactEmail}</span>
        </div>

        {/* Letterhead with logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '10px 0', borderBottom: '3px solid #2c5aa0', marginBottom: '20px' }}>
          <img src={astuLogo} alt="ASTU Logo" style={{ height: '60px', width: '60px' }} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '16pt', fontWeight: 'bold', fontFamily: "'Times New Roman', serif", letterSpacing: '1px', margin: 0 }}>
              ADAMA SCIENCE AND TECHNOLOGY UNIVERSITY
            </h1>
            <h2 style={{ fontSize: '13pt', fontWeight: 'normal', fontFamily: "'Times New Roman', serif", margin: 0 }}>
              አዳማ ሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ
            </h2>
          </div>
        </div>

        {/* To / Date / Ref section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div>
            <p><strong>To: CoEEC Vice Dean for Academic Affairs</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p><strong>Date:</strong> _______________</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div>
            <p><strong><u>ASTU</u></strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p><strong>Ref:</strong> _______________</p>
          </div>
        </div>

        {/* Head, Department info - right aligned */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <p><strong>Head, Department of {departmentName}</strong></p>
          <p style={{ marginTop: '5px' }}><strong>{headName}</strong></p>
        </div>

        {/* Subject */}
        <p style={{ fontWeight: 'bold', margin: '20px 0 15px' }}>
          <strong>Subject: <u>Academic Staff Member Report of {monthName} {report.report_year}</u></strong>
        </p>

        {/* Body */}
        <p style={{ textAlign: 'justify', marginBottom: '15px', lineHeight: '1.6' }}>
          The following table shows statistics of Academic staff (Local, Instructors, Academic and Research
          Assistants &amp; MSc. Sponsored contract Students) on duty, absent, sick and study leave in {departmentName} for the month of <strong><u>{monthName} {report.report_year}</u></strong>.
          Please kindly find also attached here with <strong><u>{numberOfPages}</u></strong> pages is detail of the report.
        </p>

        {/* Statistics Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0', fontSize: '11pt', fontFamily: "'Times New Roman', serif" }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Academic Staff</th>
              <th style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Sex</th>
              {FIXED_STATUSES.map(status => (
                <th key={status} style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{status}</th>
              ))}
              <th style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row, index) => (
              <>
                <tr key={`${row.category}-m`}>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }} rowSpan={3}>{index + 1}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }} rowSpan={3}>{row.displayName}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>M</td>
                  {row.statuses.map(s => (
                    <td key={`${row.category}-m-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>
                      {s.male || '-'}
                    </td>
                  ))}
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{row.mTotal}</td>
                </tr>
                <tr key={`${row.category}-f`}>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>F</td>
                  {row.statuses.map(s => (
                    <td key={`${row.category}-f-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>
                      {s.female || '-'}
                    </td>
                  ))}
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{row.fTotal}</td>
                </tr>
                <tr key={`${row.category}-t`}>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>T</td>
                  {row.statuses.map(s => (
                    <td key={`${row.category}-t-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                      {s.total || '-'}
                    </td>
                  ))}
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{row.total}</td>
                </tr>
              </>
            ))}
            {/* Grand Total */}
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '4px 6px' }} rowSpan={3}></td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }} rowSpan={3}>Total</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>M</td>
              {grandTotals.statuses.map(s => (
                <td key={`total-m-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{s.male}</td>
              ))}
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotals.mTotal}</td>
            </tr>
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>F</td>
              {grandTotals.statuses.map(s => (
                <td key={`total-f-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{s.female}</td>
              ))}
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotals.fTotal}</td>
            </tr>
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>T</td>
              {grandTotals.statuses.map(s => (
                <td key={`total-t-${s.status}`} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{s.total}</td>
              ))}
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotals.total}</td>
            </tr>
          </tbody>
        </table>

        {/* With regards */}
        <p style={{ marginTop: '20px' }}>With regards</p>

        {/* CC */}
        <div style={{ marginTop: '60px' }}>
          <p><strong><u>CC:</u></strong></p>
          <ul style={{ marginLeft: '30px', listStyleType: 'disc' }}>
            {isDepartmentReport ? (
              <>
                <li>CoEEC Dean</li>
                <li>{departmentName} Department</li>
              </>
            ) : (
              <>
                <li>CoEEC Dean</li>
                <li>CoEEC ADAA</li>
              </>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', borderTop: '2px solid #000', paddingTop: '5px', textAlign: 'center', fontStyle: 'italic', fontSize: '11pt' }}>
          We are dedicated to Innovative Knowledge
        </div>
      </div>
    </div>
  );
};

export default ReportLetter;
