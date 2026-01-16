import { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, Building2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MonthlyReport, MONTHS } from '@/types/staff';
import { useDepartments } from '@/hooks/useStaff';

interface SubmissionStatusDashboardProps {
  reports: MonthlyReport[];
  selectedMonth: number;
  selectedYear: number;
}

interface DepartmentStatus {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  report?: MonthlyReport;
}

const SubmissionStatusDashboard = ({ reports, selectedMonth, selectedYear }: SubmissionStatusDashboardProps) => {
  const { data: departments } = useDepartments();

  const departmentStatuses = useMemo((): DepartmentStatus[] => {
    if (!departments) return [];

    return departments.map(dept => {
      const report = reports.find(
        r => r.department_id === dept.id && 
             r.report_month === selectedMonth && 
             r.report_year === selectedYear
      );

      let status: DepartmentStatus['status'] = 'pending';
      if (report?.status === 'approved') status = 'approved';
      else if (report?.status === 'submitted') status = 'submitted';
      else if (report?.status === 'rejected') status = 'rejected';

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        status,
        report
      };
    });
  }, [departments, reports, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const approved = departmentStatuses.filter(d => d.status === 'approved').length;
    const submitted = departmentStatuses.filter(d => d.status === 'submitted').length;
    const rejected = departmentStatuses.filter(d => d.status === 'rejected').length;
    const pending = departmentStatuses.filter(d => d.status === 'pending').length;
    const total = departmentStatuses.length;
    const progress = total > 0 ? ((approved + submitted) / total) * 100 : 0;
    
    return { approved, submitted, rejected, pending, total, progress };
  }, [departmentStatuses]);

  const getStatusIcon = (status: DepartmentStatus['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: DepartmentStatus['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-green-600 hover:bg-green-700">Submitted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Department Submission Status - {MONTHS[selectedMonth - 1]} {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
            <div className="text-sm text-muted-foreground">Submitted</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Depts</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Submission Progress</span>
            <span className="font-medium">{Math.round(stats.progress)}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>

        {/* Department List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {departmentStatuses.map(dept => (
            <div 
              key={dept.id} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(dept.status)}
                <div>
                  <div className="font-medium text-sm">{dept.name}</div>
                  <div className="text-xs text-muted-foreground">{dept.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dept.report?.submitted_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(dept.report.submitted_at).toLocaleDateString()}
                  </span>
                )}
                {getStatusBadge(dept.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionStatusDashboard;
