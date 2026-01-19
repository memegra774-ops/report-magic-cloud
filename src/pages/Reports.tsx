import { useState } from 'react';
import { Plus, Calendar, Trash2, Eye, FileText, RefreshCw, GitCompare, Send, CheckCircle2, ThumbsUp, Building2, XCircle, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import ReportView from '@/components/ReportView';
import ReportLetter from '@/components/ReportLetter';
import ReportComparison from '@/components/ReportComparison';
import SubmissionStatusDashboard from '@/components/SubmissionStatusDashboard';
import { useMonthlyReports, useCreateReport, useDeleteReport, useSubmitReport, useApproveReport, useRejectReport, useResubmitReport, useGenerateCollegeReport } from '@/hooks/useReports';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useStaff';
import { MonthlyReport, MONTHS } from '@/types/staff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Reports = () => {
  const { role, profile, user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewReport, setViewReport] = useState<MonthlyReport | null>(null);
  const [viewMode, setViewMode] = useState<'report' | 'letter' | 'compare'>('report');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [comparisonReports, setComparisonReports] = useState<{ previous: MonthlyReport; current: MonthlyReport } | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<MonthlyReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: departments } = useDepartments();
  const { data: reports, isLoading } = useMonthlyReports();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const submitReport = useSubmitReport();
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();
  const resubmitReport = useResubmitReport();
  const generateCollegeReport = useGenerateCollegeReport();
  const createNotification = useCreateNotification();

  const handleCreateReport = async () => {
    await createReport.mutateAsync({ 
      month: selectedMonth, 
      year: selectedYear,
      departmentId: role === 'department_head' ? profile?.department_id : undefined
    });
    setCreateDialogOpen(false);
  };

  const handleRegenerateReport = async (report: MonthlyReport) => {
    setIsRegenerating(true);
    try {
      // Use the regenerate flag to replace existing report
      await createReport.mutateAsync({ 
        month: report.report_month, 
        year: report.report_year,
        departmentId: report.department_id || (role === 'department_head' ? profile?.department_id : undefined),
        regenerate: true
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteReport.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleSubmitReport = async (report: MonthlyReport) => {
    if (!user) return;
    
    await submitReport.mutateAsync({ reportId: report.id, userId: user.id });
    
    // Create notification for AVD
    const dept = departments?.find(d => d.id === report.department_id);
    await createNotification.mutateAsync({
      type: 'report_submitted',
      title: 'Department Report Submitted',
      message: `${dept?.name || 'Unknown Department'} has submitted their ${MONTHS[report.report_month - 1]} ${report.report_year} report.`,
      department_id: report.department_id,
      target_role: 'avd',
      performed_by: profile?.full_name || 'Unknown'
    });
  };

  const handleApproveReport = async (report: MonthlyReport) => {
    await approveReport.mutateAsync(report.id);
  };

  const handleRejectReport = async () => {
    if (!rejectDialogOpen || !user || !rejectionReason.trim()) return;
    
    await rejectReport.mutateAsync({
      reportId: rejectDialogOpen.id,
      rejectionReason: rejectionReason.trim(),
      userId: user.id
    });

    // Create notification for department head
    const dept = departments?.find(d => d.id === rejectDialogOpen.department_id);
    await createNotification.mutateAsync({
      type: 'report_rejected',
      title: 'Report Rejected',
      message: `Your ${MONTHS[rejectDialogOpen.report_month - 1]} ${rejectDialogOpen.report_year} report has been rejected. Reason: ${rejectionReason.trim()}`,
      department_id: rejectDialogOpen.department_id,
      target_role: 'department_head',
      performed_by: profile?.full_name || 'AVD'
    });

    setRejectDialogOpen(null);
    setRejectionReason('');
  };

  const handleResubmitReport = async (report: MonthlyReport) => {
    if (!user) return;
    
    await resubmitReport.mutateAsync({ reportId: report.id, userId: user.id });
    
    // Create notification for AVD
    const dept = departments?.find(d => d.id === report.department_id);
    await createNotification.mutateAsync({
      type: 'report_resubmitted',
      title: 'Report Resubmitted',
      message: `${dept?.name || 'Unknown Department'} has resubmitted their ${MONTHS[report.report_month - 1]} ${report.report_year} report after revision.`,
      department_id: report.department_id,
      target_role: 'avd',
      performed_by: profile?.full_name || 'Unknown'
    });
  };

  const handleGenerateCollegeReport = async () => {
    await generateCollegeReport.mutateAsync({ 
      month: selectedMonth, 
      year: selectedYear 
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const canCreate = role === 'system_admin' || role === 'department_head' || role === 'avd';
  // Both AVD and department heads can delete their own reports
  const canDelete = role === 'system_admin' || role === 'avd' || role === 'department_head';
  const canViewLetter = role === 'avd' || role === 'system_admin' || role === 'department_head';

  // Filter reports based on role - for AVD's own reports and department heads' reports
  const filteredReports = reports?.filter(report => {
    if (role === 'department_head') {
      // Department heads only see their own department's reports
      return report.department_id === profile?.department_id;
    }
    if (role === 'avd') {
      // AVD sees their own reports (no department_id)
      return !report.department_id;
    }
    // System admin and management see all
    return true;
  });

  // For AVD: Get submitted department reports (pending approval) for selected period
  const submittedDepartmentReports = (role === 'avd' || role === 'system_admin') 
    ? reports?.filter(report => 
        report.department_id && 
        report.status === 'submitted' &&
        report.report_month === selectedMonth &&
        report.report_year === selectedYear
      )
    : [];

  // For AVD: Get approved department reports for selected period
  const approvedDepartmentReports = (role === 'avd' || role === 'system_admin')
    ? reports?.filter(report => 
        report.department_id && 
        report.status === 'approved' &&
        report.report_month === selectedMonth &&
        report.report_year === selectedYear
      )
    : [];

  // For department heads: Get rejected reports that need revision
  const rejectedReports = (role === 'department_head')
    ? reports?.filter(report => 
        report.department_id === profile?.department_id && 
        report.status === 'rejected'
      )
    : [];

  const isDepartmentHead = role === 'department_head';

  // Get sorted reports for comparison (newest first)
  const sortedReports = filteredReports?.slice().sort((a, b) => {
    const dateA = a.report_year * 12 + a.report_month;
    const dateB = b.report_year * 12 + b.report_month;
    return dateB - dateA;
  });

  // Find consecutive reports for comparison
  const getConsecutivePairs = () => {
    if (!sortedReports || sortedReports.length < 2) return [];
    const pairs: { previous: MonthlyReport; current: MonthlyReport }[] = [];
    for (let i = 0; i < sortedReports.length - 1; i++) {
      pairs.push({ current: sortedReports[i], previous: sortedReports[i + 1] });
    }
    return pairs;
  };

  const consecutivePairs = getConsecutivePairs();

  // Show comparison view
  if (comparisonReports) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setComparisonReports(null)} className="mb-4">
            ← Back to Reports
          </Button>
          <h2 className="font-serif text-2xl font-bold mb-6">Report Comparison</h2>
          <ReportComparison 
            previousReport={comparisonReports.previous} 
            currentReport={comparisonReports.current} 
          />
        </main>
      </div>
    );
  }

  if (viewReport) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setViewReport(null)} className="mb-4">
            ← Back to Reports
          </Button>
          
          {canViewLetter ? (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'report' | 'letter')}>
              <TabsList className="mb-6">
                <TabsTrigger value="report">Detailed Report</TabsTrigger>
                <TabsTrigger value="letter">Official Letter</TabsTrigger>
              </TabsList>
              <TabsContent value="report">
                <ReportView report={viewReport} isDepartmentHead={isDepartmentHead} />
              </TabsContent>
              <TabsContent value="letter">
                <ReportLetter 
                  report={viewReport} 
                  department={departments?.find(d => d.id === viewReport.department_id)}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <ReportView report={viewReport} isDepartmentHead={isDepartmentHead} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Monthly Reports</h1>
            <p className="text-muted-foreground">
              {role === 'avd' 
                ? 'View and generate combined reports from all departments' 
                : 'Generate and view monthly staff reports'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Month/Year selector for AVD dashboard */}
            {(role === 'avd' || role === 'system_admin') && (
              <>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-[130px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {consecutivePairs.length > 0 && (
              <Select 
                onValueChange={(value) => {
                  const pair = consecutivePairs[parseInt(value)];
                  if (pair) setComparisonReports(pair);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <GitCompare className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Compare Reports" />
                </SelectTrigger>
                <SelectContent>
                  {consecutivePairs.map((pair, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {MONTHS[pair.previous.report_month - 1]} → {MONTHS[pair.current.report_month - 1]} {pair.current.report_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canCreate && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Report
              </Button>
            )}
          </div>
        </div>

        {/* Submission Status Dashboard - For AVD */}
        {(role === 'avd' || role === 'system_admin') && reports && (
          <SubmissionStatusDashboard 
            reports={reports} 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
          />
        )}

        {/* Pending Approval Reports - For AVD */}
        {(role === 'avd' || role === 'system_admin') && submittedDepartmentReports && submittedDepartmentReports.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Pending Approval ({submittedDepartmentReports.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedDepartmentReports.map((report) => (
                <Card key={report.id} className="shadow-card border-green-200 bg-green-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-serif">
                        {MONTHS[report.report_month - 1]} {report.report_year}
                      </span>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Submitted
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {departments?.find(d => d.id === report.department_id)?.name || 'Unknown Department'}
                    </p>
                    {report.submitted_at && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApproveReport(report)}
                        disabled={approveReport.isPending}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-50"
                        onClick={() => setRejectDialogOpen(report)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Generate College Report Button - For AVD */}
        {(role === 'avd' || role === 'system_admin') && (
          <div className="mb-8 flex items-center gap-4">
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              College-Level Reports
            </h2>
            <Button
              variant="outline"
              onClick={handleGenerateCollegeReport}
              disabled={generateCollegeReport.isPending}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {generateCollegeReport.isPending ? 'Generating...' : 'Generate from Approved Reports'}
            </Button>
          </div>
        )}

        {/* Approved Department Reports - For AVD */}
        {(role === 'avd' || role === 'system_admin') && approvedDepartmentReports && approvedDepartmentReports.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-blue-600" />
              Approved Department Reports ({approvedDepartmentReports.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {approvedDepartmentReports.map((report) => (
                <Card key={report.id} className="shadow-card border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-serif">
                        {MONTHS[report.report_month - 1]} {report.report_year}
                      </span>
                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {departments?.find(d => d.id === report.department_id)?.name || 'Unknown'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setViewReport(report)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Reports - For Department Heads */}
        {isDepartmentHead && rejectedReports && rejectedReports.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reports Needing Revision ({rejectedReports.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedReports.map((report) => (
                <Card key={report.id} className="shadow-card border-red-200 bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-serif">
                        {MONTHS[report.report_month - 1]} {report.report_year}
                      </span>
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.rejection_reason && (
                      <div className="bg-red-100 border border-red-200 rounded-md p-3 mb-3">
                        <p className="text-sm font-medium text-red-800 mb-1">Feedback from AVD:</p>
                        <p className="text-sm text-red-700">{report.rejection_reason}</p>
                      </div>
                    )}
                    {report.rejected_at && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Rejected: {new Date(report.rejected_at).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View & Edit
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleResubmitReport(report)}
                        disabled={resubmitReport.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Resubmit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reports Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filteredReports && filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const isSubmitted = report.status === 'submitted';
              const isApproved = report.status === 'approved';
              const isRejected = report.status === 'rejected';
              const canModify = isDepartmentHead ? !(isSubmitted || isApproved) : true;
              
              const getStatusBadge = () => {
                if (isApproved) {
                  return (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  );
                }
                if (isSubmitted) {
                  return (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  );
                }
                if (isRejected) {
                  return (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  );
                }
                return <Badge variant="secondary">Draft</Badge>;
              };
              
              return (
                <Card key={report.id} className="shadow-card hover:shadow-card-hover transition-shadow animate-fade-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="font-serif">
                        {MONTHS[report.report_month - 1]} {report.report_year}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge()}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-1">
                      Created: {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {(isSubmitted || isApproved) && report.submitted_at && (
                      <p className={`text-sm ${isApproved ? 'text-blue-600' : 'text-green-600'} mb-1`}>
                        {isApproved ? 'Approved' : 'Submitted'}: {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                    {report.department_id && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Dept: {departments?.find(d => d.id === report.department_id)?.code || '-'}
                      </p>
                    )}
                    {report.version > 1 && (
                      <p className="text-sm text-primary mb-4">
                        Version: {report.version}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {canViewLetter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewReport(report);
                            setViewMode('letter');
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Submit to AVD button - only for department heads with draft reports */}
                      {isDepartmentHead && !isSubmitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitReport(report)}
                          disabled={submitReport.isPending}
                          title="Submit report to AVD"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Regenerate button - only if can modify */}
                      {canCreate && canModify && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateReport(report)}
                          disabled={isRegenerating}
                          title="Regenerate report with latest data"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      {/* Delete button - only if can modify */}
                      {canDelete && canModify && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(report.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border shadow-card">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-serif text-xl font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first monthly report to get started
            </p>
            {canCreate && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            )}
          </div>
        )}

        {/* Create Report Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Generate Monthly Report</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReport} disabled={createReport.isPending}>
                {createReport.isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Report</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this report? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rejection Dialog */}
        <Dialog open={!!rejectDialogOpen} onOpenChange={() => { setRejectDialogOpen(null); setRejectionReason(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Reject Report
              </DialogTitle>
              <DialogDescription>
                This will send the report back to the department for revision.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Reason for rejection *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please explain what needs to be corrected or improved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
              {rejectDialogOpen && (
                <div className="text-sm text-muted-foreground">
                  Report: {MONTHS[rejectDialogOpen.report_month - 1]} {rejectDialogOpen.report_year} - {departments?.find(d => d.id === rejectDialogOpen.department_id)?.name}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectDialogOpen(null); setRejectionReason(''); }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectReport}
                disabled={!rejectionReason.trim() || rejectReport.isPending}
              >
                {rejectReport.isPending ? 'Rejecting...' : 'Reject Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Reports;