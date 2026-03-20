import { useState, useRef, useMemo } from 'react';
import { Upload, Download, FileSpreadsheet, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { STAFF_CATEGORIES, EDUCATION_LEVELS, StaffCategory, EducationLevel } from '@/types/staff';
import { useUpdateStaff, useCreateStaff, useDepartments } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
}

// All importable fields with labels
const IMPORTABLE_FIELDS = [
  { key: 'staff_id', label: 'Staff ID (Primary Key)', required: true },
  { key: 'fan_number', label: 'FAN Number' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'sex', label: 'Sex' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'education_level', label: 'Education Level' },
  { key: 'academic_rank', label: 'Academic Rank' },
  { key: 'current_status', label: 'Current Status' },
  { key: 'category', label: 'Category' },
  { key: 'remark', label: 'Remark' },
  { key: 'mother_name', label: 'Mother Name' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'employment_date_astu', label: 'Employment Date at ASTU' },
  { key: 'first_employment_company', label: 'First Employment Company' },
  { key: 'marital_status', label: 'Marital Status' },
  { key: 'hdp_certified', label: 'HDP Certified (Y/N)' },
  { key: 'mc_certified', label: 'MC Certified (Y/N)' },
  { key: 'elip_certified', label: 'ELIP Certified (Y/N)' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
] as const;

const CSV_HEADERS = IMPORTABLE_FIELDS.map(f => f.key);

type ParsedRow = Record<string, string>;

const CSVImport = ({ open, onClose }: CSVImportProps) => {
  const auth = useAuth();
  const profile = auth?.profile;
  const role = auth?.role;
  const user = auth?.user;
  const isAdmin = role === 'system_admin';
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(CSV_HEADERS));
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff({
    isAdmin,
    userId: user?.id,
    performedBy: profile?.full_name || profile?.email || 'User',
  });
  const { data: departments } = useDepartments();

  const needsDepartmentSelect = role === 'system_admin' || role === 'avd';
  const effectiveDepartmentId = needsDepartmentSelect ? selectedDepartmentId : profile?.department_id;

  // Detect which fields are present in the uploaded CSV
  const [csvFields, setCsvFields] = useState<string[]>([]);

  const downloadTemplate = () => {
    const headers = CSV_HEADERS.join(',');
    const exampleRow = [
      'STF001', 'John Doe', 'M', 'Computer Science', 'Msc', 'Lecturer',
      'On Duty', 'Local Instructors', '', 'Jane Doe', '0911223344',
      'FAN001', 'john@example.com', '15/03/1990', 'Addis Ababa',
      '2020-01-15', 'ABC Corp', 'Single', 'Y', 'N', 'N', 'Jane Doe', '0922334455',
    ].join(',');
    const csvContent = `${headers}\n${exampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      setCsvFields(headers.filter(h => (CSV_HEADERS as readonly string[]).includes(h)));

      // Auto-select only fields present in CSV + reference keys always
      const presentFields = new Set(headers.filter(h => (CSV_HEADERS as readonly string[]).includes(h)));
      presentFields.add('staff_id');
      setSelectedFields(presentFields);

      const data: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: ParsedRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        // Require staff_id or full_name for records
        if (row.staff_id || row.full_name) data.push(row);
      }
      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const toggleField = (key: string) => {
    if (key === 'staff_id') return; // primary key always included
    const next = new Set(selectedFields);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedFields(next);
  };

  const selectAll = () => setSelectedFields(new Set(csvFields.length ? csvFields : CSV_HEADERS));
  const deselectAll = () => setSelectedFields(new Set(['staff_id']));

  const parseBool = (val: string): boolean =>
    ['y', 'yes', 'true', '1'].includes(val.toLowerCase().trim());

  const handleImport = async () => {
    if (!parsedData.length) {
      toast.error('No data to import');
      return;
    }
    if (!effectiveDepartmentId) {
      toast.error(needsDepartmentSelect ? 'Please select a department' : 'No department assigned');
      return;
    }

    setImporting(true);
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    const { data: deptData } = await supabase
      .from('departments')
      .select('name')
      .eq('id', effectiveDepartmentId)
      .single();
    const departmentName = deptData?.name || 'Unknown Department';
    const performedBy = profile?.full_name || profile?.email || 'User';

    for (const row of parsedData) {
      try {
        // Match by staff_id within the target department
        let existingStaff: { id: string } | null = null;

        if (row.staff_id) {
          const { data } = await supabase
            .from('staff')
            .select('id')
            .eq('staff_id', row.staff_id)
            .eq('department_id', effectiveDepartmentId)
            .maybeSingle();
          existingStaff = data;
        }

        // Build payload with only selected fields (exclude primary key on existing)
        const payload: Record<string, any> = {};

        for (const field of selectedFields) {
          if (field === 'staff_id' && existingStaff) continue;
          if (!(field in row) || row[field] === '') continue;

          const val = row[field];
          switch (field) {
            case 'sex':
              payload.sex = val.toUpperCase() === 'F' ? 'F' : 'M';
              break;
            case 'category':
              payload.category = STAFF_CATEGORIES.find(c => c.toLowerCase() === val.toLowerCase()) || 'Local Instructors';
              break;
            case 'education_level':
              payload.education_level = EDUCATION_LEVELS.find(e => e.toLowerCase() === val.toLowerCase()) || 'Msc';
              break;
            case 'date_of_birth': {
              const parts = val.split('/');
              payload.date_of_birth = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : val;
              break;
            }
            case 'hdp_certified':
            case 'mc_certified':
            case 'elip_certified':
              payload[field] = parseBool(val);
              break;
            default:
              payload[field] = val || null;
          }
        }

        if (existingStaff) {
          // Update only selected fields
          if (Object.keys(payload).length > 0) {
            await updateStaff.mutateAsync({ id: existingStaff.id, ...payload });
            updatedCount++;
          }
        } else {
          // Create new staff - require full_name for creation
          const fullName = row.full_name || row.staff_id || 'Unknown';
          await createStaff.mutateAsync({
            full_name: fullName,
            staff_id: row.staff_id || null,
            fan_number: row.fan_number || null,
            college_name: 'CoEEC',
            department_id: effectiveDepartmentId,
            sex: payload.sex || 'M',
            education_level: payload.education_level || 'Msc',
            category: payload.category || 'Local Instructors',
            current_status: payload.current_status || 'On Duty',
            ...payload,
            notificationOptions: {
              departmentName,
              performedBy,
              skipNotification: createdCount > 0,
              isAdmin,
              userId: user?.id,
            },
          } as any);
          createdCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Error importing row:', error);
      }
    }

    setImporting(false);
    const parts = [];
    if (createdCount > 0) parts.push(`${createdCount} added`);
    if (updatedCount > 0) parts.push(`${updatedCount} updated`);
    if (errorCount > 0) parts.push(`${errorCount} failed`);
    toast.success(`Import complete: ${parts.join(', ')}`);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setCsvFields([]);
    setSelectedFields(new Set(CSV_HEADERS));
    setSelectedDepartmentId('');
    onClose();
  };

  // Fields available for selection (only those in CSV, or all if no CSV yet)
  const availableFields = useMemo(() => {
    if (csvFields.length === 0) return IMPORTABLE_FIELDS;
    return IMPORTABLE_FIELDS.filter(f => csvFields.includes(f.key));
  }, [csvFields]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Import Staff from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Department selector for AVD / System Admin */}
          {needsDepartmentSelect && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <Label className="font-medium">Import to Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">CSV Template</p>
                <p className="text-sm text-muted-foreground">
                  Download the full template. You can include only the columns you need — select which fields to import below.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{parsedData.length} staff records found</p>
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setParsedData([]); setCsvFields([]); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">Existing staff matched by Staff ID or FAN Number will be updated</p>
              </>
            )}
          </div>

          {/* Field selection */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Select fields to import/update</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Only selected fields will be imported. Unselected fields on existing staff will remain unchanged.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableFields.map(field => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={selectedFields.has(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                      disabled={field.key === 'staff_id' || field.key === 'fan_number'}
                    />
                    <Label htmlFor={`field-${field.key}`} className="text-xs cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium text-sm">
                Preview ({parsedData.length} staff records)
              </div>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Staff ID / FAN</th>
                      <th className="px-3 py-2 text-left">Full Name</th>
                      <th className="px-3 py-2 text-left">Fields to Update</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, index) => {
                      const fieldCount = [...selectedFields].filter(f => f !== 'staff_id' && f !== 'fan_number' && row[f]).length;
                      return (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2 font-medium text-xs">{row.staff_id || row.fan_number || '—'}</td>
                          <td className="px-3 py-2 font-medium">{row.full_name || '—'}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">Create / Update</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t">
                    ... and {parsedData.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData.length || importing || (needsDepartmentSelect && !selectedDepartmentId)}
          >
            {importing ? 'Importing...' : `Import ${parsedData.length} Staff`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
