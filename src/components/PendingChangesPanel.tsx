import { useState } from 'react';
import { Clock, Check, X, UserPlus, UserMinus, Pencil, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingChanges, useApproveChange, useRejectChange, StaffChange } from '@/hooks/useStaffChanges';
import { formatDistanceToNow } from 'date-fns';

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  sex: 'Sex',
  education_level: 'Education Level',
  academic_rank: 'Academic Rank',
  specialization: 'Specialization',
  current_status: 'Current Status',
  category: 'Category',
  college_name: 'College',
  department_id: 'Department',
  staff_id: 'Staff ID',
  email: 'Email',
  phone_number: 'Phone',
  marital_status: 'Marital Status',
  remark: 'Remark',
  fan_number: 'Fan Number',
  date_of_birth: 'Date of Birth',
  place_of_birth: 'Place of Birth',
  mother_name: 'Mother Name',
  emergency_contact_name: 'Emergency Contact',
  emergency_contact_phone: 'Emergency Phone',
  employment_date_astu: 'Employment Date',
  first_employment_company: 'First Employment',
  hdp_certified: 'HDP Certified',
  mc_certified: 'MC Certified',
  elip_certified: 'ELIP Certified',
};

const PendingChangesPanel = () => {
  const { user, role } = useAuth();
  const { data: pendingChanges, isLoading } = usePendingChanges();
  const approveChange = useApproveChange();
  const rejectChange = useRejectChange();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [detailChange, setDetailChange] = useState<StaffChange | null>(null);

  const isAdmin = role === 'system_admin';
  const isAVD = role === 'avd';
  const canReview = isAdmin || isAVD;

  if (!pendingChanges?.length) return null;

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add': return <UserPlus className="h-4 w-4 text-emerald-600" />;
      case 'delete': return <UserMinus className="h-4 w-4 text-destructive" />;
      case 'update': return <Pencil className="h-4 w-4 text-amber-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'add': return 'Addition';
      case 'delete': return 'Deletion';
      case 'update': return 'Update';
      default: return type;
    }
  };

  const getChangedFields = (change: StaffChange): string => {
    if (change.action_type === 'update' && change.new_data) {
      return Object.keys(change.new_data).map(k => FIELD_LABELS[k] || k).join(', ');
    }
    return '';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const handleApprove = (changeId: string) => {
    if (!user?.id) return;
    approveChange.mutate({ changeId, reviewerId: user.id });
  };

  const handleReject = () => {
    if (!rejectingId || !user?.id) return;
    rejectChange.mutate({ changeId: rejectingId, reviewerId: user.id, note: rejectNote });
    setRejectingId(null);
    setRejectNote('');
  };

  return (
    <div className="bg-card border rounded-xl shadow-card mb-6 animate-fade-in overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Pending Changes</h3>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {pendingChanges.length}
          </Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {expanded && (
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10">Type</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
                {canReview && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingChanges.map((change) => (
                <TableRow key={change.id} className="bg-amber-50/30">
                  <TableCell>{getActionIcon(change.action_type)}</TableCell>
                  <TableCell className="font-medium">{change.staff_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{change.performed_by_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {change.action_type === 'update' ? (
                      <span>Fields: {getChangedFields(change)}</span>
                    ) : (
                      <span>{getActionLabel(change.action_type)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                  </TableCell>
                  {canReview && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:bg-primary/10"
                          onClick={() => setDetailChange(change)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          onClick={() => handleApprove(change.id)}
                          disabled={approveChange.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => setRejectingId(change.id)}
                          disabled={rejectChange.isPending}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Change Details Dialog */}
      <Dialog open={!!detailChange} onOpenChange={(open) => !open && setDetailChange(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailChange && getActionIcon(detailChange.action_type)}
              {detailChange?.action_type === 'add' ? 'New Staff Addition' : 
               detailChange?.action_type === 'delete' ? 'Staff Deletion' : 'Staff Update'} — {detailChange?.staff_name}
            </DialogTitle>
            <DialogDescription>
              Requested by {detailChange?.performed_by_name} · {detailChange && formatDistanceToNow(new Date(detailChange.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          {detailChange?.action_type === 'update' && detailChange.old_data && detailChange.new_data && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase border-b">
                <span>Field</span>
                <span>Previous</span>
                <span>New Value</span>
              </div>
              {Object.keys(detailChange.new_data).map((field) => (
                <div key={field} className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-2 rounded-md bg-muted/40 text-sm">
                  <span className="font-medium text-foreground">{FIELD_LABELS[field] || field}</span>
                  <span className="text-destructive line-through">{formatValue(detailChange.old_data?.[field])}</span>
                  <span className="text-emerald-700 font-medium">{formatValue(detailChange.new_data?.[field])}</span>
                </div>
              ))}
            </div>
          )}

          {detailChange?.action_type === 'add' && detailChange.new_data && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-2">New staff member to be added:</p>
              {Object.entries(detailChange.new_data).map(([field, value]) => (
                <div key={field} className="flex justify-between px-2 py-1.5 rounded-md bg-emerald-50 text-sm">
                  <span className="font-medium">{FIELD_LABELS[field] || field}</span>
                  <span className="text-emerald-700">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}

          {detailChange?.action_type === 'delete' && detailChange.old_data && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-2">Staff member to be deleted:</p>
              {Object.entries(detailChange.old_data).filter(([k]) => !['id', 'created_at', 'updated_at', 'departments'].includes(k)).map(([field, value]) => (
                <div key={field} className="flex justify-between px-2 py-1.5 rounded-md bg-destructive/5 text-sm">
                  <span className="font-medium">{FIELD_LABELS[field] || field}</span>
                  <span className="text-destructive">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}

          {canReview && detailChange && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => { handleApprove(detailChange.id); setDetailChange(null); }}
                disabled={approveChange.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setRejectingId(detailChange.id); setDetailChange(null); }}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject / Undo Change</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the change and revert any applied modifications. Optionally add a note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for rejection (optional)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">
              Reject & Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingChangesPanel;
