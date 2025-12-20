import { Users, UserCheck, BookOpen, Award, GraduationCap, Building2 } from 'lucide-react';
import Header from '@/components/Header';
import StatsCard from '@/components/StatsCard';
import { useStaffStats, useDepartmentStats, useDepartments } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Index = () => {
  const { role, profile } = useAuth();
  
  // Department heads only see their department's stats
  const departmentId = role === 'department_head' ? profile?.department_id || undefined : undefined;
  
  const { data: stats, isLoading: statsLoading } = useStaffStats(departmentId);
  const { data: deptStats, isLoading: deptStatsLoading } = useDepartmentStats();
  const { data: departments } = useDepartments();

  const getRoleDisplayName = () => {
    switch (role) {
      case 'system_admin': return 'System Administrator';
      case 'department_head': return 'Department Head';
      case 'avd': return 'Associate Vice Dean';
      case 'management': return 'Management';
      default: return 'User';
    }
  };

  // Filter department stats for department heads
  const filteredDeptStats = role === 'department_head' && departmentId
    ? deptStats?.filter(d => d.id === departmentId)
    : deptStats;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-slide-up">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
            Staff Monthly Report System
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome, {profile?.full_name || 'User'}! You are logged in as <span className="font-semibold text-primary">{getRoleDisplayName()}</span>
          </p>
        </div>

        {/* Stats Grid - On Duty by Academic Rank */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {statsLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="On Duty Total"
                value={stats?.onDutyByRank?.total || 0}
                icon={Users}
                variant="primary"
                description="All on-duty staff"
              />
              <StatsCard
                title="On Duty Lecturers"
                value={stats?.onDutyByRank?.lecturer || 0}
                icon={UserCheck}
                variant="success"
                description="Lecturer rank"
              />
              <StatsCard
                title="On Duty Asst. Prof."
                value={stats?.onDutyByRank?.asstProf || 0}
                icon={BookOpen}
                variant="info"
                description="Assistant Professor"
              />
              <StatsCard
                title="On Duty Assoc. Prof."
                value={stats?.onDutyByRank?.assoProf || 0}
                icon={Award}
                variant="warning"
                description="Associate Professor"
              />
              <StatsCard
                title="On Duty Professor"
                value={stats?.onDutyByRank?.professor || 0}
                icon={GraduationCap}
                variant="primary"
                description="Full Professor"
              />
            </>
          )}
        </div>

        {/* Status Summary & Gender Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Staff Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                  <span className="text-sm text-muted-foreground">On Duty</span>
                  <span className="text-2xl font-bold text-success">{stats?.byStatus?.['On Duty'] || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                  <span className="text-sm text-muted-foreground">Not On Duty</span>
                  <span className="text-2xl font-bold text-destructive">{stats?.byStatus?.['Not On Duty'] || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-info/10 rounded-lg">
                  <span className="text-sm text-muted-foreground">On Study</span>
                  <span className="text-2xl font-bold text-info">{stats?.byStatus?.['On Study'] || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Gender Distribution by Status & Department</CardTitle>
            </CardHeader>
            <CardContent>
              {deptStatsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead>Department</TableHead>
                        <TableHead className="text-center" colSpan={2}>On Duty</TableHead>
                        <TableHead className="text-center" colSpan={2}>Not On Duty</TableHead>
                        <TableHead className="text-center" colSpan={2}>On Study</TableHead>
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableHead></TableHead>
                        <TableHead className="text-center text-info">M</TableHead>
                        <TableHead className="text-center text-accent">F</TableHead>
                        <TableHead className="text-center text-info">M</TableHead>
                        <TableHead className="text-center text-accent">F</TableHead>
                        <TableHead className="text-center text-info">M</TableHead>
                        <TableHead className="text-center text-accent">F</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeptStats?.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.code}</TableCell>
                          <TableCell className="text-center text-info">{dept.genderByStatus?.onDuty?.M || 0}</TableCell>
                          <TableCell className="text-center text-accent">{dept.genderByStatus?.onDuty?.F || 0}</TableCell>
                          <TableCell className="text-center text-info">{dept.genderByStatus?.notOnDuty?.M || 0}</TableCell>
                          <TableCell className="text-center text-accent">{dept.genderByStatus?.notOnDuty?.F || 0}</TableCell>
                          <TableCell className="text-center text-info">{dept.genderByStatus?.onStudy?.M || 0}</TableCell>
                          <TableCell className="text-center text-accent">{dept.genderByStatus?.onStudy?.F || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link to="/staff">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View Staff Directory
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Department-wise On Duty Staff Statistics */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department-wise On Duty Staff by Academic Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptStatsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">On Duty Total</TableHead>
                      <TableHead className="text-center">Lecturer</TableHead>
                      <TableHead className="text-center">Asst. Prof.</TableHead>
                      <TableHead className="text-center">Assoc. Prof.</TableHead>
                      <TableHead className="text-center">Professor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeptStats?.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.code}</TableCell>
                        <TableCell className="text-center font-bold text-success">{dept.onDutyByRank?.total || 0}</TableCell>
                        <TableCell className="text-center">{dept.onDutyByRank?.lecturer || 0}</TableCell>
                        <TableCell className="text-center">{dept.onDutyByRank?.asstProf || 0}</TableCell>
                        <TableCell className="text-center">{dept.onDutyByRank?.assoProf || 0}</TableCell>
                        <TableCell className="text-center">{dept.onDutyByRank?.professor || 0}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    {filteredDeptStats && filteredDeptStats.length > 1 && (
                      <TableRow className="bg-muted font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center text-success">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyByRank?.total || 0), 0)}</TableCell>
                        <TableCell className="text-center">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyByRank?.lecturer || 0), 0)}</TableCell>
                        <TableCell className="text-center">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyByRank?.asstProf || 0), 0)}</TableCell>
                        <TableCell className="text-center">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyByRank?.assoProf || 0), 0)}</TableCell>
                        <TableCell className="text-center">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyByRank?.professor || 0), 0)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
