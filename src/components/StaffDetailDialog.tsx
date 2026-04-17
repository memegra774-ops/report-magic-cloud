import { useState } from 'react';
import { Staff } from '@/types/staff';
import { useUpdateStaff, useDepartments } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X, User, Phone, Mail, Briefcase, GraduationCap, MapPin, Calendar, Shield, Heart, Building2 } from 'lucide-react';

interface StaffDetailDialogProps {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

const StaffDetailDialog = ({ staff, open, onClose, canEdit }: StaffDetailDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const updateStaff = useUpdateStaff();

  if (!staff) return null;

  const startEditing = () => {
    setFormData({
      mother_name: staff.mother_name || '',
      phone_number: staff.phone_number || '',
      fan_number: staff.fan_number || '',
      employment_date_astu: staff.employment_date_astu || '',
      place_of_birth: staff.place_of_birth || '',
      date_of_birth: staff.date_of_birth || '',
      first_employment_company: staff.first_employment_company || '',
      email: staff.email || '',
      hdp_certified: staff.hdp_certified ?? false,
      mc_certified: staff.mc_certified ?? false,
      elip_certified: staff.elip_certified ?? false,
      marital_status: staff.marital_status || '',
      emergency_contact_name: staff.emergency_contact_name || '',
      emergency_contact_phone: staff.emergency_contact_phone || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData({});
  };

  const saveChanges = async () => {
    await updateStaff.mutateAsync({
      id: staff.id,
      mother_name: formData.mother_name || null,
      phone_number: formData.phone_number || null,
      fan_number: formData.fan_number || null,
      employment_date_astu: formData.employment_date_astu || null,
      place_of_birth: formData.place_of_birth || null,
      date_of_birth: formData.date_of_birth || null,
      first_employment_company: formData.first_employment_company || null,
      email: formData.email || null,
      hdp_certified: formData.hdp_certified,
      mc_certified: formData.mc_certified,
      elip_certified: formData.elip_certified,
      marital_status: formData.marital_status || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
    } as any);
    setIsEditing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || '-'}</p>
      </div>
    </div>
  );

  const EditField = ({ label, field, type = 'text', icon: Icon }: { label: string; field: string; type?: string; icon?: any }) => (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      <Input
        type={type}
        value={formData[field] || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => { cancelEditing(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              {staff.full_name}
            </DialogTitle>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Details
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelEditing}>
                  <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
                <Button size="sm" onClick={saveChanges} disabled={updateStaff.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Basic Info Summary */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary">{staff.category}</Badge>
          <Badge variant="outline">{staff.current_status}</Badge>
          <Badge variant="outline">{staff.education_level}</Badge>
          {staff.academic_rank && <Badge variant="outline">{staff.academic_rank}</Badge>}
        </div>
        <div className="text-sm text-muted-foreground mb-1">
          <span className="font-medium">Staff ID:</span> {staff.staff_id || '-'} &nbsp;|&nbsp;
          <span className="font-medium">Sex:</span> {staff.sex === 'M' ? 'Male' : 'Female'} &nbsp;|&nbsp;
          <span className="font-medium">Dept:</span> {staff.departments?.name || '-'}
        </div>

        <Separator />

        {isEditing ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Mother's Name" field="mother_name" icon={User} />
              <EditField label="Phone Number" field="phone_number" icon={Phone} />
              <EditField label="FAN Number" field="fan_number" icon={Shield} />
              <EditField label="Email" field="email" type="email" icon={Mail} />
              <EditField label="Place of Birth" field="place_of_birth" icon={MapPin} />
              <EditField label="Date of Birth (YYYY-MM-DD)" field="date_of_birth" type="date" icon={Calendar} />
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5"><Heart className="h-3 w-3" />Marital Status</Label>
                <Select value={formData.marital_status || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, marital_status: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Employment Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Employment Date at ASTU" field="employment_date_astu" type="date" icon={Calendar} />
              <EditField label="First Employment Company" field="first_employment_company" icon={Briefcase} />
            </div>

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Certifications</h3>
            <div className="grid grid-cols-3 gap-3">
              {['hdp_certified', 'mc_certified', 'elip_certified'].map((field) => {
                const label = field.replace('_certified', '').toUpperCase();
                return (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1.5"><GraduationCap className="h-3 w-3" />{label} Certified</Label>
                    <Select value={formData[field] ? 'Y' : 'N'} onValueChange={(v) => setFormData(prev => ({ ...prev, [field]: v === 'Y' }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Yes</SelectItem>
                        <SelectItem value="N">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Contact Name" field="emergency_contact_name" icon={User} />
              <EditField label="Contact Phone" field="emergency_contact_phone" icon={Phone} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-2 gap-x-6">
              <DetailRow label="Mother's Name" value={staff.mother_name || '-'} icon={User} />
              <DetailRow label="Phone Number" value={staff.phone_number || '-'} icon={Phone} />
              <DetailRow label="FAN Number" value={staff.fan_number || '-'} icon={Shield} />
              <DetailRow label="Email" value={staff.email || '-'} icon={Mail} />
              <DetailRow label="Place of Birth" value={staff.place_of_birth || '-'} icon={MapPin} />
              <DetailRow label="Date of Birth" value={formatDate(staff.date_of_birth)} icon={Calendar} />
              <DetailRow label="Marital Status" value={staff.marital_status || '-'} icon={Heart} />
              <DetailRow label="Specialization" value={staff.specialization || '-'} icon={GraduationCap} />
            </div>

            <Separator />

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Employment Information</h3>
            <div className="grid grid-cols-2 gap-x-6">
              <DetailRow label="Employment Date at ASTU" value={formatDate(staff.employment_date_astu)} icon={Calendar} />
              <DetailRow label="First Employment Company" value={staff.first_employment_company || '-'} icon={Briefcase} />
            </div>

            <Separator />

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Certifications</h3>
            <div className="grid grid-cols-3 gap-x-6">
              <DetailRow label="HDP Certified" value={staff.hdp_certified ? 'Yes' : 'No'} icon={GraduationCap} />
              <DetailRow label="MC Certified" value={staff.mc_certified ? 'Yes' : 'No'} icon={GraduationCap} />
              <DetailRow label="ELIP Certified" value={staff.elip_certified ? 'Yes' : 'No'} icon={GraduationCap} />
            </div>

            <Separator />

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-x-6">
              <DetailRow label="Contact Name" value={staff.emergency_contact_name || '-'} icon={User} />
              <DetailRow label="Contact Phone" value={staff.emergency_contact_phone || '-'} icon={Phone} />
            </div>

            {staff.remark && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Remark</p>
                  <p className="text-sm">{staff.remark}</p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffDetailDialog;
