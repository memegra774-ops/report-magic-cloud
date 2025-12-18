import { Staff } from '@/types/staff';
import StatusBadge from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StaffTableProps {
  staff: Staff[];
  showActions?: boolean;
  onEdit?: (staff: Staff) => void;
  onDelete?: (id: string) => void;
  startIndex?: number;
}

const StaffTable = ({ staff, showActions, onEdit, onDelete, startIndex = 0 }: StaffTableProps) => {
  if (staff.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No staff members found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="table-header hover:bg-primary">
            <TableHead className="text-primary-foreground font-semibold w-12">#</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Staff ID</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Full Name</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Sex</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Department</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Specialization</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-center">Education</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Academic Rank</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Status</TableHead>
            <TableHead className="text-primary-foreground font-semibold">Remark</TableHead>
            {showActions && (
              <TableHead className="text-primary-foreground font-semibold text-center">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member, index) => (
            <TableRow key={member.id} className="table-row-hover">
              <TableCell className="font-medium text-muted-foreground">{startIndex + index + 1}</TableCell>
              <TableCell className="font-mono text-sm">{member.staff_id || '-'}</TableCell>
              <TableCell className="font-medium">{member.full_name}</TableCell>
              <TableCell className="text-center">{member.sex}</TableCell>
              <TableCell>{member.departments?.code || '-'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{member.specialization || '-'}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                  {member.education_level}
                </span>
              </TableCell>
              <TableCell>{member.academic_rank || '-'}</TableCell>
              <TableCell>
                <StatusBadge status={member.current_status} category={member.category} />
              </TableCell>
              <TableCell className="max-w-[150px] truncate text-muted-foreground">
                {member.remark || '-'}
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => onEdit?.(member)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete?.(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StaffTable;
