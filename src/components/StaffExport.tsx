import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Staff } from '@/types/staff';
import { toast } from 'sonner';

interface StaffExportProps {
  staff: Staff[];
}

const StaffExport = ({ staff }: StaffExportProps) => {
  const exportToCSV = () => {
    if (!staff.length) {
      toast.error('No staff data to export');
      return;
    }

    const headers = [
      'Staff ID',
      'Full Name',
      'Sex',
      'Department',
      'College',
      'Specialization',
      'Education Level',
      'Academic Rank',
      'Current Status',
      'Category',
      'Remark',
      'Mother Name',
      'Phone Number',
      'FAN Number',
      'Email',
      'Date of Birth',
      'Place of Birth',
      'Employment Date at ASTU',
      'First Employment Company',
      'Marital Status',
      'HDP Certified',
      'MC Certified',
      'ELIP Certified',
      'Emergency Contact Name',
      'Emergency Contact Phone',
    ];

    const rows = staff.map(s => [
      s.staff_id || '',
      s.full_name || '',
      s.sex || '',
      s.departments?.name || '',
      s.college_name || '',
      s.specialization || '',
      s.education_level || '',
      s.academic_rank || '',
      s.current_status || '',
      s.category || '',
      s.remark || '',
      s.mother_name || '',
      s.phone_number || '',
      s.fan_number || '',
      s.email || '',
      s.date_of_birth || '',
      s.place_of_birth || '',
      s.employment_date_astu || '',
      s.first_employment_company || '',
      s.marital_status || '',
      s.hdp_certified ? 'Yes' : 'No',
      s.mc_certified ? 'Yes' : 'No',
      s.elip_certified ? 'Yes' : 'No',
      s.emergency_contact_name || '',
      s.emergency_contact_phone || '',
    ]);

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_directory_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${staff.length} staff members`);
  };

  return (
    <Button variant="outline" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};

export default StaffExport;
