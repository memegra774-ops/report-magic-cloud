import { useState, useMemo } from 'react';
import { Staff, STAFF_CATEGORIES, EDUCATION_LEVELS, STAFF_STATUSES, StaffCategory, EducationLevel, ACADEMIC_RANKS } from '@/types/staff';
import { useUpdateStaff, useDeleteStaff, useDepartments } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

interface ColumnFilters {
  sex?: string;
  education_level?: string;
  academic_rank?: string;
  category?: string;
  current_status?: string;
  department?: string;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'staff_id' | 'full_name' | 'sex' | 'department' | 'specialization' | 'education_level' | 'academic_rank' | 'category' | 'current_status' | 'remark';

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

const EditableStaffTable = ({ staff, canEdit = true, canDelete = true }: EditableStaffTableProps) => {
  const { profile } = useAuth();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [deleteStaffMember, setDeleteStaffMember] = useState<Staff | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: null });
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const { data: departments } = useDepartments();

  // Get unique values for filters
  const uniqueRanks = useMemo(() => {
    const ranks = new Set(staff.map(s => s.academic_rank).filter(Boolean));
    return Array.from(ranks) as string[];
  }, [staff]);

  const uniqueDepts = useMemo(() => {
    const depts = new Set(staff.map(s => s.departments?.code).filter(Boolean));
    return Array.from(depts) as string[];
  }, [staff]);

  // Apply column filters
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (columnFilters.sex && s.sex !== columnFilters.sex) return false;
      if (columnFilters.education_level && s.education_level !== columnFilters.education_level) return false;
      if (columnFilters.academic_rank && s.academic_rank !== columnFilters.academic_rank) return false;
      if (columnFilters.category && s.category !== columnFilters.category) return false;
      if (columnFilters.current_status && s.current_status !== columnFilters.current_status) return false;
      if (columnFilters.department && s.departments?.code !== columnFilters.department) return false;
      return true;
    });
  }, [staff, columnFilters]);

  // Apply sorting
  const sortedStaff = useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) return filteredStaff;
    
    return [...filteredStaff].sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';
      
      switch (sortConfig.field) {
        case 'staff_id':
          aValue = a.staff_id || '';
          bValue = b.staff_id || '';
          break;
        case 'full_name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'sex':
          aValue = a.sex || '';
          bValue = b.sex || '';
          break;
        case 'department':
          aValue = a.departments?.code || '';
          bValue = b.departments?.code || '';
          break;
        case 'specialization':
          aValue = a.specialization || '';
          bValue = b.specialization || '';
          break;
        case 'education_level':
          aValue = a.education_level || '';
          bValue = b.education_level || '';
          break;
        case 'academic_rank':
          aValue = a.academic_rank || '';
          bValue = b.academic_rank || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'current_status':
          aValue = a.current_status || '';
          bValue = b.current_status || '';
          break;
        case 'remark':
          aValue = a.remark || '';
          bValue = b.remark || '';
          break;
      }
      
      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredStaff, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field: null, direction: null };
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

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
    if (deleteStaffMember) {
      await deleteStaff.mutateAsync({
        id: deleteStaffMember.id,
        options: {
          staffName: deleteStaffMember.full_name,
          departmentName: deleteStaffMember.departments?.name,
          performedBy: profile?.full_name || profile?.email || 'Department User',
        },
      });
      setDeleteStaffMember(null);
    }
  };

  const clearFilter = (key: keyof ColumnFilters) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const renderFilterPopover = (
    label: string,
    filterKey: keyof ColumnFilters,
    options: string[]
  ) => {
    const hasFilter = !!columnFilters[filterKey];
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ml-1 ${hasFilter ? 'text-accent' : 'text-primary-foreground/60'}`}>
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Filter {label}</p>
            <Select
              value={columnFilters[filterKey] || 'all'}
              onValueChange={(v) => {
                if (v === 'all') {
                  clearFilter(filterKey);
                } else {
                  setColumnFilters(prev => ({ ...prev, [filterKey]: v }));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    );
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

  const activeFiltersCount = Object.keys(columnFilters).length;

  return (
    <>
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          <span className="text-muted-foreground">Active filters: {activeFiltersCount}</span>
          <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})}>
            Clear all
          </Button>
        </div>
      )}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground w-12">#</TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('staff_id')}>
                <span className="flex items-center">Staff ID {getSortIcon('staff_id')}</span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                <span className="flex items-center">Full Name {getSortIcon('full_name')}</span>
              </TableHead>
              <TableHead className="text-primary-foreground text-center cursor-pointer select-none" onClick={() => handleSort('sex')}>
                <span className="flex items-center justify-center">
                  Sex {getSortIcon('sex')}
                  {renderFilterPopover('Sex', 'sex', ['M', 'F'])}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('department')}>
                <span className="flex items-center">
                  Dept {getSortIcon('department')}
                  {renderFilterPopover('Department', 'department', uniqueDepts)}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('specialization')}>
                <span className="flex items-center">Specialization {getSortIcon('specialization')}</span>
              </TableHead>
              <TableHead className="text-primary-foreground text-center cursor-pointer select-none" onClick={() => handleSort('education_level')}>
                <span className="flex items-center justify-center">
                  Edu. {getSortIcon('education_level')}
                  {renderFilterPopover('Education', 'education_level', EDUCATION_LEVELS as unknown as string[])}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('academic_rank')}>
                <span className="flex items-center">
                  Academic Rank {getSortIcon('academic_rank')}
                  {renderFilterPopover('Rank', 'academic_rank', uniqueRanks)}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('category')}>
                <span className="flex items-center">
                  Category {getSortIcon('category')}
                  {renderFilterPopover('Category', 'category', STAFF_CATEGORIES as unknown as string[])}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('current_status')}>
                <span className="flex items-center">
                  Status {getSortIcon('current_status')}
                  {renderFilterPopover('Status', 'current_status', STAFF_STATUSES as unknown as string[])}
                </span>
              </TableHead>
              <TableHead className="text-primary-foreground cursor-pointer select-none" onClick={() => handleSort('remark')}>
                <span className="flex items-center">Remark {getSortIcon('remark')}</span>
              </TableHead>
              {canDelete && <TableHead className="text-primary-foreground w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStaff.map((s, index) => (
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
                  {renderEditableCell(s, 'academic_rank', s.academic_rank || '', 'select', ACADEMIC_RANKS)}
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
                      onClick={() => setDeleteStaffMember(s)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {sortedStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={canDelete ? 12 : 11} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStaffMember} onOpenChange={(open) => !open && setDeleteStaffMember(null)}>
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