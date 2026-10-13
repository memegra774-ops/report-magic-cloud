import { useRef, useEffect, useState } from 'react';
import { MonthlyReport, MONTHS, Department } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, Header, Footer, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import letterHeading from '@/assets/astu-letter-heading.png.asset.json';
import letterFooter from '@/assets/astu-letter-footer.png.asset.json';
import { useAuth } from '@/contexts/AuthContext';

interface ReportLetterProps {
  report: MonthlyReport;
  department?: Department | null;
  signatory?: string;
  collegeName?: string;
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

const ReportLetter = ({ report, department, signatory, collegeName }: ReportLetterProps) => {
  const { user, profile } = useAuth();
  const contactEmail = user?.email || profile?.email || '';
  const [personalizedHeading, setPersonalizedHeading] = useState<{ email: string; url: string } | null>(null);
  const headingUrl = personalizedHeading?.email === contactEmail ? personalizedHeading.url : '';

  useEffect(() => {
    let cancelled = false;
    if (!contactEmail) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0);
      // Coordinates refer to the supplied 832 x 126 stationery artwork.
      const scale = canvas.width / 832;
      const background = context.getImageData(Math.round(790 * scale), Math.round(10 * scale), 1, 1).data;
      context.fillStyle = `rgb(${background[0]}, ${background[1]}, ${background[2]})`;
      context.fillRect(509 * scale, 8 * scale, 286 * scale, 22 * scale);
      context.fillStyle = '#000000';
      context.font = `${16 * scale}px Arial`;
      context.textBaseline = 'middle';
      context.fillText(`Email: ${contactEmail}`, 512 * scale, 20 * scale, 279 * scale);
      if (!cancelled) setPersonalizedHeading({ email: contactEmail, url: canvas.toDataURL('image/png') });
    };
    image.src = letterHeading.url;
    return () => { cancelled = true; };
  }, [contactEmail]);
  const { data: entries, isLoading } = useReportEntries(report.id);
  const printRef = useRef<HTMLDivElement>(null);
  const [deptHeadName, setDeptHeadName] = useState<string>('');

  const isDepartmentReport = !!report.department_id;
  const departmentName = department?.name || 'Department';
  const resolvedCollegeName = collegeName || entries?.[0]?.college_name || 'College';
  const [avdName, setAvdName] = useState<string>('');

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
            break;
          }
        }
      }
    };

    fetchDeptHead();
  }, [report.department_id]);

  // Fetch AVD user name for college-level reports
  useEffect(() => {
    const fetchAvdUser = async () => {
      if (isDepartmentReport) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'avd');

      if (roleData && roleData.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', roleData[0].user_id)
          .single();

        if (profile) {
          setAvdName(profile.full_name || '');
        }
      }
    };

    fetchAvdUser();
  }, [isDepartmentReport]);

  const headName = signatory || deptHeadName || '<<Department Head name>>';
  const avdDisplayName = avdName || '<<AVD Name>>';

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

  const handlePrint = async () => {
    const printContent = printRef.current;
    if (!printContent || !headingUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printableContent = printContent.cloneNode(true) as HTMLDivElement;
    await Promise.all(Array.from(printableContent.querySelectorAll('img')).map(async image => {
      const response = await fetch(new URL(image.getAttribute('src') || '', window.location.origin));
      const blob = await response.blob();
      image.src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to load letter image'));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }));
    printWindow.document.write(`
      <html>
        <head>
          <title>Staff Report Letter - ${MONTHS[report.report_month - 1]} ${report.report_year}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm 22mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            .letter-stationery { display: block; width: 100%; height: auto; }
            .letter-heading { margin-bottom: 20px; break-inside: avoid; }
            .letter-cc { margin-top: 25px !important; }
            table { page-break-inside: avoid; break-inside: avoid; }
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
            .letter-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              margin-top: 0;
            }
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printableContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    await Promise.all(Array.from(printWindow.document.images).map(image => image.decode().catch(() => undefined)));
    await printWindow.document.fonts.ready;
    printWindow.print();
  };

  const handleExportWord = async () => {
    if (!headingUrl) return;
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
      : `The following table shows statistics of Academic staff (Local, Instructors, Academic and Research Assistants & MSc. Sponsored contract Students) on duty, absent, sick and study leave in ${resolvedCollegeName} for the month of ${monthName} ${report.report_year}. Please kindly find also attached here with ${numberOfPages} pages is detail of the report.`;

    const loadStationery = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to load letter stationery');
      return new Uint8Array(await response.arrayBuffer());
    };
    const [headingData, footerData] = await Promise.all([
      loadStationery(headingUrl),
      loadStationery(letterFooter.url),
    ]);

    const metaParagraphs = isDepartmentReport
      ? [
          new Paragraph({
            children: [new TextRun({ text: 'To: CoEEC Vice Dean for Academic Affairs', bold: true, font: 'Times New Roman', size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Date: _______________`, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'ASTU', bold: true, underline: {}, font: 'Times New Roman', size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Ref: _______________`, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: `Head, Department of ${departmentName}`, bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ spacing: { after: 50 } }),
          new Paragraph({
            children: [new TextRun({ text: headName, bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
        ]
      : [
          new Paragraph({
            children: [new TextRun({ text: 'To: Competence and Human Resource Administration Executive', bold: true, font: 'Times New Roman', size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Date: _______________`, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'ASTU', bold: true, underline: {}, font: 'Times New Roman', size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Ref: _______________`, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
           new Paragraph({ spacing: { after: 100 } }),
           new Paragraph({
             children: [new TextRun({ text: resolvedCollegeName, bold: true, font: 'Times New Roman', size: 24 })],
             alignment: AlignmentType.RIGHT,
           }),
           new Paragraph({
             children: [new TextRun({ text: 'Associate Dean for Academic Affairs', bold: true, font: 'Times New Roman', size: 24 })],
             alignment: AlignmentType.RIGHT,
           }),
          new Paragraph({ spacing: { after: 50 } }),
          new Paragraph({
            children: [new TextRun({ text: avdDisplayName, bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.RIGHT,
          }),
        ];

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 2400, right: 900, bottom: 1000, left: 900, header: 360, footer: 360 },
          }
        },
        headers: { default: new Header({ children: [new Paragraph({
            children: [new ImageRun({ type: 'png', data: headingData, transformation: { width: 674, height: 102 }, altText: { title: 'ASTU letter heading', description: 'Official university letterhead', name: 'ASTU letter heading' } })],
            alignment: AlignmentType.CENTER,
        })] }) },
        footers: { default: new Footer({ children: [new Paragraph({
            children: [new ImageRun({ type: 'png', data: footerData, transformation: { width: 674, height: 21 }, altText: { title: 'ASTU letter footer', description: 'We are dedicated to innovative knowledge!', name: 'ASTU letter footer' } })],
            alignment: AlignmentType.CENTER,
        })] }) },
        children: [
          ...metaParagraphs,
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
                new Paragraph({ children: [new TextRun({ text: `${resolvedCollegeName} Dean`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
                new Paragraph({ children: [new TextRun({ text: `${departmentName} Department`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
              ]
            : [
                new Paragraph({ children: [new TextRun({ text: `${resolvedCollegeName} Dean`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
                new Paragraph({ children: [new TextRun({ text: `${resolvedCollegeName} ADAA`, font: 'Times New Roman', size: 24 })], bullet: { level: 0 } }),
              ]
          ),
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
          <Button variant="outline" onClick={handleExportWord} disabled={!headingUrl}>
            <FileText className="h-4 w-4 mr-2" />
            Export Word
          </Button>
          <Button onClick={handlePrint} disabled={!headingUrl}>
            <Printer className="h-4 w-4 mr-2" />
            Print Letter
          </Button>
        </div>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 rounded-lg border shadow-sm max-w-4xl mx-auto" style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: '1.5' }}>
        <div className="letter-heading mb-5 break-inside-avoid">
          {headingUrl && <img src={headingUrl} alt="ASTU letter heading" className="letter-stationery block w-full h-auto" />}
        </div>

        {/* To / Date / Ref section */}
        {isDepartmentReport ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <div>
                <p><strong>To: {resolvedCollegeName} Vice Dean for Academic Affairs</strong></p>
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
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <div>
                <p><strong>To: Competence and Human Resource Administration Executive</strong></p>
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

            {/* College & AVD info - right aligned */}
            <div style={{ textAlign: 'right', marginBottom: '5px' }}>
              <p><strong>{resolvedCollegeName}</strong></p>
              <p style={{ marginTop: '5px' }}><strong>Associate Dean for Academic Affairs</strong></p>
              <p style={{ marginTop: '5px' }}><strong>{avdDisplayName}</strong></p>
            </div>

            {/* Subject */}
            <p style={{ fontWeight: 'bold', margin: '20px 0 15px' }}>
              <strong>Subject: <u>Academic Staff Member Report of {monthName} {report.report_year}</u></strong>
            </p>

            {/* Body */}
            <p style={{ textAlign: 'justify', marginBottom: '15px', lineHeight: '1.6' }}>
              The following table shows statistics of Academic staff (Local, Instructors, Academic and Research
              Assistants &amp; MSc. Sponsored contract Students) on duty, absent, sick and study leave in {resolvedCollegeName} for the month of <strong><u>{monthName} {report.report_year}</u></strong>.
              Please kindly find also attached here with <strong><u>{numberOfPages}</u></strong> pages is detail of the report.
            </p>
          </>
        )}

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
        <div className="letter-cc" style={{ marginTop: '60px' }}>
          <p><strong><u>CC:</u></strong></p>
          <ul style={{ marginLeft: '30px', listStyleType: 'disc' }}>
            {isDepartmentReport ? (
              <>
                <li>{resolvedCollegeName} Dean</li>
                <li>{departmentName} Department</li>
              </>
            ) : (
              <>
                <li>{resolvedCollegeName} Dean</li>
                <li>{resolvedCollegeName} ADAA</li>
              </>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="letter-footer mt-10">
          <img src={letterFooter.url} alt="We are dedicated to innovative knowledge!" className="letter-stationery block w-full h-auto" />
        </div>
      </div>
    </div>
  );
};

export default ReportLetter;
