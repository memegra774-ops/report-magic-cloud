import { useState } from 'react';
import { Staff, STAFF_CATEGORIES, EDUCATION_LEVELS, STAFF_STATUSES, StaffCategory, EducationLevel } from '@/types/staff';
import { useUpdateStaff, useDeleteStaff, useDepartments } from '@/hooks/useStaff';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface EditableStaffTableProps {
  staff: Staff[];
  canEdit?: boolean;
  canDelete?: boolean;
}

interface EditingCell {
  staffId: string;
  field: keyof Staff;
  value: string;
}

const EditableStaffTable = ({ staff, canEdit = true, canDelete = true }: EditableStaffTableProps) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const { data: departments } = useDepartments();

  const startEditing = (staffId: string, field: keyof Staff, currentValue: string) => {
    if (!canEdit) return;
    setEditingCell({ staffId, field, value: currentValue });
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    await updateStaff.mutateAsync({
      id: editingCell.staffId,
      [editingCell.field]: editingCell.value || null,
    });
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteStaff.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const renderEditableCell = (
    staffMember: Staff,
    field: keyof Staff,
    displayValue: string,
    type: 'text' | 'select' = 'text',
    options?: string[]
  ) => {
    const isEditing = editingCell?.staffId === staffMember.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {type === 'select' && options ? (
            <Select
              value={editingCell.value}
              onValueChange={(value) => setEditingCell({ ...editingCell, value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={editingCell.value}
              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveEdit}>
            <Check className="h-3 w-3 text-success" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      );
    }

    return (
      <span
        className={canEdit ? 'cursor-pointer hover:bg-muted/50 px-1 rounded' : ''}
        onClick={() => canEdit && startEditing(staffMember.id, field, String(staffMember[field] || ''))}
      >
        {displayValue || '-'}
      </span>
    );
  };

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground w-12">#</TableHead>
              <TableHead className="text-primary-foreground">Staff ID</TableHead>
              <TableHead className="text-primary-foreground">Full Name</TableHead>
              <TableHead className="text-primary-foreground text-center">Sex</TableHead>
              <TableHead className="text-primary-foreground">Dept</TableHead>
              <TableHead className="text-primary-foreground">Specialization</TableHead>
              <TableHead className="text-primary-foreground text-center">Edu.</TableHead>
              <TableHead className="text-primary-foreground">Academic Rank</TableHead>
              <TableHead className="text-primary-foreground">Category</TableHead>
              <TableHead className="text-primary-foreground">Status</TableHead>
              <TableHead className="text-primary-foreground">Remark</TableHead>
              {canDelete && <TableHead className="text-primary-foreground w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s, index) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                  {renderEditableCell(s, 'staff_id', s.staff_id || '')}
                </TableCell>
                <TableCell className="font-medium">
                  {renderEditableCell(s, 'full_name', s.full_name)}
                </TableCell>
                <TableCell className="text-center">
                  {renderEditableCell(s, 'sex', s.sex, 'select', ['M', 'F'])}
                </TableCell>
                <TableCell>{s.departments?.code || '-'}</TableCell>
                <TableCell className="max-w-[120px]">
                  {renderEditableCell(s, 'specialization', s.specialization || '')}
                </TableCell>
                <TableCell className="text-center">
                  {renderEditableCell(s, 'education_level', s.education_level, 'select', EDUCATION_LEVELS as unknown as string[])}
                </TableCell>
                <TableCell>
                  {renderEditableCell(s, 'academic_rank', s.academic_rank || '')}
                </TableCell>
                <TableCell>
                  {renderEditableCell(s, 'category', s.category, 'select', STAFF_CATEGORIES as unknown as string[])}
                </TableCell>
                <TableCell>
                  {renderEditableCell(s, 'current_status', s.current_status, 'select', STAFF_STATUSES as unknown as string[])}
                </TableCell>
                <TableCell className="max-w-[100px]">
                  {renderEditableCell(s, 'remark', s.remark || '')}
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditableStaffTable;
