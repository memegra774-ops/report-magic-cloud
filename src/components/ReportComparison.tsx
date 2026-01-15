import { MonthlyReport, MONTHS } from '@/types/staff';
import { useReportEntries } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReportComparisonProps {
  previousReport: MonthlyReport;
  currentReport: MonthlyReport;
}

interface StaffChange {
  id: string;
  staffId: string;
  fullName: string;
  department: string;
  category: string;
  status: string;
  changeType: 'added' | 'removed' | 'status_changed';
  previousStatus?: string;
}

const ReportComparison = ({ previousReport, currentReport }: ReportComparisonProps) => {
  const { data: previousEntries, isLoading: loadingPrevious } = useReportEntries(previousReport.id);
  const { data: currentEntries, isLoading: loadingCurrent } = useReportEntries(currentReport.id);

  if (loadingPrevious || loadingCurrent) {
    return <div className="text-center py-8">Loading comparison...</div>;
  }

  // Build lookup maps using staff_id_number or staff_id
  const getStaffKey = (entry: any): string => {
    return entry.staff_id_number || entry.staff?.staff_id || entry.staff_id || entry.id;
  };

  const previousMap = new Map<string, any>();
  previousEntries?.forEach(entry => {
    previousMap.set(getStaffKey(entry), entry);
  });

  const currentMap = new Map<string, any>();
  currentEntries?.forEach(entry => {
    currentMap.set(getStaffKey(entry), entry);
  });

  const changes: StaffChange[] = [];

  // Find added staff (in current but not in previous)
  currentEntries?.forEach(entry => {
    const key = getStaffKey(entry);
    if (!previousMap.has(key)) {
      changes.push({
        id: entry.id,
        staffId: entry.staff_id_number || entry.staff?.staff_id || '-',
        fullName: entry.full_name || entry.staff?.full_name || '-',
        department: entry.department_code || entry.staff?.departments?.code || '-',
        category: entry.category,
        status: entry.current_status,
        changeType: 'added',
      });
    } else {
      // Check for status changes
      const prevEntry = previousMap.get(key);
      if (prevEntry && prevEntry.current_status !== entry.current_status) {
        changes.push({
          id: entry.id,
          staffId: entry.staff_id_number || entry.staff?.staff_id || '-',
          fullName: entry.full_name || entry.staff?.full_name || '-',
          department: entry.department_code || entry.staff?.departments?.code || '-',
          category: entry.category,
          status: entry.current_status,
          changeType: 'status_changed',
          previousStatus: prevEntry.current_status,
        });
      }
    }
  });

  // Find removed staff (in previous but not in current)
  previousEntries?.forEach(entry => {
    const key = getStaffKey(entry);
    if (!currentMap.has(key)) {
      changes.push({
        id: entry.id,
        staffId: entry.staff_id_number || entry.staff?.staff_id || '-',
        fullName: entry.full_name || entry.staff?.full_name || '-',
        department: entry.department_code || entry.staff?.departments?.code || '-',
        category: entry.category,
        status: entry.current_status,
        changeType: 'removed',
      });
    }
  });

  const addedCount = changes.filter(c => c.changeType === 'added').length;
  const removedCount = changes.filter(c => c.changeType === 'removed').length;
  const statusChangedCount = changes.filter(c => c.changeType === 'status_changed').length;

  const previousLabel = `${MONTHS[previousReport.report_month - 1]} ${previousReport.report_year}`;
  const currentLabel = `${MONTHS[currentReport.report_month - 1]} ${currentReport.report_year}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 text-lg font-semibold">
        <span>{previousLabel}</span>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <span>{currentLabel}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
          <UserPlus className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{addedCount}</p>
          <p className="text-sm text-green-600 dark:text-green-400">Staff Added</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <UserMinus className="h-8 w-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{removedCount}</p>
          <p className="text-sm text-red-600 dark:text-red-400">Staff Removed</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
          <ArrowRight className="h-8 w-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusChangedCount}</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">Status Changed</p>
        </div>
      </div>

      {/* Changes Table */}
      {changes.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">No changes detected between these two reports.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary">
                <TableHead className="text-primary-foreground">Change</TableHead>
                <TableHead className="text-primary-foreground">Staff ID</TableHead>
                <TableHead className="text-primary-foreground">Full Name</TableHead>
                <TableHead className="text-primary-foreground">Department</TableHead>
                <TableHead className="text-primary-foreground">Category</TableHead>
                <TableHead className="text-primary-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow 
                  key={change.id}
                  className={
                    change.changeType === 'added' 
                      ? 'bg-green-50 dark:bg-green-950/50' 
                      : change.changeType === 'removed'
                        ? 'bg-red-50 dark:bg-red-950/50'
                        : 'bg-yellow-50 dark:bg-yellow-950/50'
                  }
                >
                  <TableCell>
                    {change.changeType === 'added' && (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Added
                      </Badge>
                    )}
                    {change.changeType === 'removed' && (
                      <Badge className="bg-red-600 hover:bg-red-700">
                        <UserMinus className="h-3 w-3 mr-1" />
                        Removed
                      </Badge>
                    )}
                    {change.changeType === 'status_changed' && (
                      <Badge className="bg-yellow-600 hover:bg-yellow-700">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Changed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{change.staffId}</TableCell>
                  <TableCell className="font-medium">{change.fullName}</TableCell>
                  <TableCell>{change.department}</TableCell>
                  <TableCell>{change.category}</TableCell>
                  <TableCell>
                    {change.changeType === 'status_changed' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through">{change.previousStatus}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{change.status}</span>
                      </div>
                    ) : (
                      change.status
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ReportComparison;
