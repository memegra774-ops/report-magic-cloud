import { useState } from 'react';
import { Plus, Calendar, Trash2, Eye, FileText, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import ReportView from '@/components/ReportView';
import ReportLetter from '@/components/ReportLetter';
import { useMonthlyReports, useCreateReport, useDeleteReport } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useStaff';
import { MonthlyReport, MONTHS } from '@/types/staff';
import { Button } from '@/components/ui/button';
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
  const { role, profile } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewReport, setViewReport] = useState<MonthlyReport | null>(null);
  const [viewMode, setViewMode] = useState<'report' | 'letter'>('report');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: departments } = useDepartments();
  const { data: reports, isLoading } = useMonthlyReports();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const canCreate = role === 'system_admin' || role === 'department_head' || role === 'avd';
  // Both AVD and department heads can delete their own reports
  const canDelete = role === 'system_admin' || role === 'avd' || role === 'department_head';
  const canViewLetter = role === 'avd' || role === 'system_admin';

  // Filter reports based on role
  const filteredReports = reports?.filter(report => {
    if (role === 'department_head') {
      // Department heads only see their own department's reports
      return report.department_id === profile?.department_id;
    }
    if (role === 'avd') {
      // AVD only sees reports WITHOUT a department_id (their own reports, not department heads')
      return !report.department_id;
    }
    // System admin and management see all
    return true;
  });

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
                <ReportView report={viewReport} />
              </TabsContent>
              <TabsContent value="letter">
                <ReportLetter 
                  report={viewReport} 
                  department={departments?.find(d => d.id === viewReport.department_id)}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <ReportView report={viewReport} />
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
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          )}
        </div>

        {/* Reports Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filteredReports && filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <Card key={report.id} className="shadow-card hover:shadow-card-hover transition-shadow animate-fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="font-serif">
                      {MONTHS[report.report_month - 1]} {report.report_year}
                    </span>
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-1">
                    Created: {new Date(report.created_at).toLocaleDateString()}
                  </p>
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
                    {canCreate && (
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
                    {canDelete && (
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
            ))}
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
      </main>
    </div>
  );
};

export default Reports;