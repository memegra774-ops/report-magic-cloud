import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { STAFF_CATEGORIES, EDUCATION_LEVELS, StaffCategory, EducationLevel } from '@/types/staff';
import { useCreateStaff, useUpdateStaff } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
}

// Full CSV template headers including all extended fields
const FULL_CSV_HEADERS = [
  'staff_id',
  'full_name',
  'sex',
  'specialization',
  'education_level',
  'academic_rank',
  'current_status',
  'category',
  'remark',
  'mother_name',
  'phone_number',
  'fan_number',
  'email',
  'date_of_birth',
  'place_of_birth',
  'employment_date_astu',
  'first_employment_company',
  'marital_status',
  'hdp_certified',
  'mc_certified',
  'elip_certified',
  'emergency_contact_name',
  'emergency_contact_phone',
];

interface ParsedRow {
  staff_id: string;
  full_name: string;
  sex: 'M' | 'F';
  specialization: string;
  education_level: EducationLevel;
  academic_rank: string;
  current_status: string;
  category: StaffCategory;
  remark: string;
  mother_name: string;
  phone_number: string;
  fan_number: string;
  email: string;
  date_of_birth: string;
  place_of_birth: string;
  employment_date_astu: string;
  first_employment_company: string;
  marital_status: string;
  hdp_certified: string;
  mc_certified: string;
  elip_certified: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

const CSVImport = ({ open, onClose }: CSVImportProps) => {
  const auth = useAuth();
  const profile = auth?.profile;
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const downloadTemplate = () => {
    const headers = FULL_CSV_HEADERS.join(',');
    const exampleRow = [
      'STF001',
      'John Doe',
      'M',
      'Computer Science',
      'Msc',
      'Lecturer',
      'On Duty',
      'Local Instructors',
      '',
      'Jane Doe',
      '0911223344',
      'FAN001',
      'john@example.com',
      '15/03/1990',
      'Addis Ababa',
      '2020-01-15',
      'ABC Corp',
      'Single',
      'Y',
      'N',
      'N',
      'Jane Doe',
      '0922334455',
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
      const data: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Handle CSV values that might contain commas within quotes
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const category = row.category as string;
        const validCategory = STAFF_CATEGORIES.find(c => 
          c.toLowerCase() === category?.toLowerCase()
        ) || 'Local Instructors';

        const educationLevel = row.education_level as string;
        const validEducation = EDUCATION_LEVELS.find(e => 
          e.toLowerCase() === educationLevel?.toLowerCase()
        ) || 'Msc';

        data.push({
          staff_id: row.staff_id || '',
          full_name: row.full_name || '',
          sex: (row.sex?.toUpperCase() === 'F' ? 'F' : 'M') as 'M' | 'F',
          specialization: row.specialization || '',
          education_level: validEducation as EducationLevel,
          academic_rank: row.academic_rank || '',
          current_status: row.current_status || 'On Duty',
          category: validCategory as StaffCategory,
          remark: row.remark || '',
          mother_name: row.mother_name || '',
          phone_number: row.phone_number || '',
          fan_number: row.fan_number || '',
          email: row.email || '',
          date_of_birth: row.date_of_birth || '',
          place_of_birth: row.place_of_birth || '',
          employment_date_astu: row.employment_date_astu || '',
          first_employment_company: row.first_employment_company || '',
          marital_status: row.marital_status || '',
          hdp_certified: row.hdp_certified || '',
          mc_certified: row.mc_certified || '',
          elip_certified: row.elip_certified || '',
          emergency_contact_name: row.emergency_contact_name || '',
          emergency_contact_phone: row.emergency_contact_phone || '',
        });
      }

      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const parseBool = (val: string): boolean => {
    return ['y', 'yes', 'true', '1'].includes(val.toLowerCase().trim());
  };

  const handleImport = async () => {
    if (!parsedData.length || !profile?.department_id) {
      toast.error('No data to import or no department assigned');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    const { data: deptData } = await supabase
      .from('departments')
      .select('name')
      .eq('id', profile.department_id)
      .single();
    
    const departmentName = deptData?.name || 'Unknown Department';
    const performedBy = profile?.full_name || profile?.email || 'Department User';

    for (const row of parsedData) {
      if (!row.full_name) continue;

      const staffPayload: any = {
        full_name: row.full_name,
        sex: row.sex,
        college_name: 'CoEEC',
        department_id: profile.department_id,
        specialization: row.specialization || null,
        education_level: row.education_level,
        academic_rank: row.academic_rank || null,
        current_status: row.current_status,
        category: row.category,
        remark: row.remark || null,
        mother_name: row.mother_name || null,
        phone_number: row.phone_number || null,
        fan_number: row.fan_number || null,
        email: row.email || null,
        place_of_birth: row.place_of_birth || null,
        first_employment_company: row.first_employment_company || null,
        marital_status: row.marital_status || null,
        emergency_contact_name: row.emergency_contact_name || null,
        emergency_contact_phone: row.emergency_contact_phone || null,
      };

      // Parse date fields
      if (row.date_of_birth) {
        // Support DD/MM/YYYY format
        const parts = row.date_of_birth.split('/');
        if (parts.length === 3) {
          staffPayload.date_of_birth = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          staffPayload.date_of_birth = row.date_of_birth;
        }
      }
      if (row.employment_date_astu) {
        staffPayload.employment_date_astu = row.employment_date_astu;
      }

      // Parse boolean fields
      if (row.hdp_certified) staffPayload.hdp_certified = parseBool(row.hdp_certified);
      if (row.mc_certified) staffPayload.mc_certified = parseBool(row.mc_certified);
      if (row.elip_certified) staffPayload.elip_certified = parseBool(row.elip_certified);

      try {
        // Check if staff_id exists for update
        if (row.staff_id) {
          const { data: existingStaff } = await supabase
            .from('staff')
            .select('id')
            .eq('staff_id', row.staff_id)
            .maybeSingle();
          
          if (existingStaff) {
            // Update existing staff
            await updateStaff.mutateAsync({
              id: existingStaff.id,
              ...staffPayload,
              staff_id: row.staff_id,
            });
            updatedCount++;
            continue;
          }
        }

        // Create new staff
        await createStaff.mutateAsync({
          ...staffPayload,
          staff_id: row.staff_id || null,
          notificationOptions: {
            departmentName,
            performedBy,
            skipNotification: successCount > 0,
          },
        } as any);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error importing row:', error);
      }
    }

    setImporting(false);
    const parts = [];
    if (successCount > 0) parts.push(`${successCount} added`);
    if (updatedCount > 0) parts.push(`${updatedCount} updated`);
    if (errorCount > 0) parts.push(`${errorCount} failed`);
    toast.success(`Import complete: ${parts.join(', ')}`);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setUpdateCount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Import Staff from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">CSV Template</p>
                <p className="text-sm text-muted-foreground">
                  Download the template with all fields. Existing staff (matched by Staff ID) will be updated.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{parsedData.length} rows found</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setParsedData([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </>
            )}
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium">
                Preview ({parsedData.length} staff members)
              </div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Staff ID</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Sex</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{row.staff_id || '-'}</td>
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.sex}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.current_status}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {row.staff_id ? 'Create/Update' : 'Create'}
                        </td>
                      </tr>
                    ))}
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!parsedData.length || importing}>
            {importing ? 'Importing...' : `Import ${parsedData.length} Staff`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
