import { useState } from 'react';
import { Clock, Check, X, UserPlus, UserMinus, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { usePendingChanges, useApproveChange, useRejectChange, StaffChange } from '@/hooks/useStaffChanges';
import { formatDistanceToNow } from 'date-fns';

const PendingChangesPanel = () => {
  const { user, role, profile } = useAuth();
  const { data: pendingChanges, isLoading } = usePendingChanges();
  const approveChange = useApproveChange();
  const rejectChange = useRejectChange();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [expanded, setExpanded] = useState(true);

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
      return Object.keys(change.new_data).join(', ');
    }
    return '';
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
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
