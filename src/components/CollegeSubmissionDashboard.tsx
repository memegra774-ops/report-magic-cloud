import { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MonthlyReport, MONTHS } from '@/types/staff';
import { useColleges } from '@/hooks/useColleges';

interface CollegeSubmissionDashboardProps {
  reports: MonthlyReport[];
  selectedMonth: number;
  selectedYear: number;
}

interface CollegeStatus {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'submitted' | 'approved';
  report?: MonthlyReport;
}

const CollegeSubmissionDashboard = ({ reports, selectedMonth, selectedYear }: CollegeSubmissionDashboardProps) => {
  const { data: colleges } = useColleges();

  const collegeStatuses = useMemo((): CollegeStatus[] => {
    if (!colleges) return [];

    return colleges.map(college => {
      // Find college-level report (department_id is null, college_id matches)
      const report = reports.find(
        r => !r.department_id && 
             r.college_id === college.id && 
             r.report_month === selectedMonth && 
             r.report_year === selectedYear
      );

      let status: CollegeStatus['status'] = 'pending';
      if (report?.status === 'approved') status = 'approved';
      else if (report) status = 'submitted';

      return {
        id: college.id,
        name: college.name,
        code: college.code,
        status,
        report
      };
    });
  }, [colleges, reports, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const approved = collegeStatuses.filter(c => c.status === 'approved').length;
    const submitted = collegeStatuses.filter(c => c.status === 'submitted').length;
    const pending = collegeStatuses.filter(c => c.status === 'pending').length;
    const total = collegeStatuses.length;
    const progress = total > 0 ? ((approved + submitted) / total) * 100 : 0;
    return { approved, submitted, pending, total, progress };
  }, [collegeStatuses]);

  const getStatusIcon = (status: CollegeStatus['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: CollegeStatus['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Report Ready</Badge>;
      case 'submitted':
        return <Badge className="bg-green-600 hover:bg-green-700">Report Generated</Badge>;
      case 'pending':
        return <Badge variant="secondary">No Report</Badge>;
    }
  };

  return (
    <Card className="mb-8 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="font-serif flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          College Report Status — {MONTHS[selectedMonth - 1]} {selectedYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            <div className="text-xs text-muted-foreground">Ready</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
            <div className="text-xs text-muted-foreground">Generated</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="bg-muted p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Colleges</div>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(stats.progress)}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {collegeStatuses.map(college => (
            <div 
              key={college.id} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(college.status)}
                <div>
                  <div className="font-medium text-sm">{college.name}</div>
                  <div className="text-xs text-muted-foreground">{college.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {college.report?.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(college.report.created_at).toLocaleDateString()}
                  </span>
                )}
                {getStatusBadge(college.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CollegeSubmissionDashboard;
