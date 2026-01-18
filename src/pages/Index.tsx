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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats?.byStatus && Object.entries(stats.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    // Determine color based on status
                    const getStatusColor = (s: string) => {
                      const lower = s.toLowerCase();
                      if (lower === 'on duty') return { bg: 'bg-success/10', text: 'text-success' };
                      if (lower === 'not on duty') return { bg: 'bg-destructive/10', text: 'text-destructive' };
                      if (lower.includes('study')) return { bg: 'bg-info/10', text: 'text-info' };
                      if (lower.includes('sick')) return { bg: 'bg-warning/10', text: 'text-warning' };
                      return { bg: 'bg-muted', text: 'text-foreground' };
                    };
                    const colors = getStatusColor(status);
                    return (
                      <div key={status} className={`flex justify-between items-center p-2.5 ${colors.bg} rounded-lg`}>
                        <span className="text-sm text-muted-foreground">{status}</span>
                        <span className={`text-xl font-bold ${colors.text}`}>{count}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">On Duty Local Instructors by Gender</CardTitle>
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
                      </TableRow>
                      <TableRow className="bg-muted/50">
                        <TableHead></TableHead>
                        <TableHead className="text-center text-info">M</TableHead>
                        <TableHead className="text-center text-warning">F</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeptStats?.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.code}</TableCell>
                          <TableCell className="text-center text-info font-semibold">{dept.genderByStatus?.onDuty?.M || 0}</TableCell>
                          <TableCell className="text-center text-warning font-semibold">{dept.genderByStatus?.onDuty?.F || 0}</TableCell>
                        </TableRow>
                      ))}
                      {filteredDeptStats && filteredDeptStats.length > 1 && (
                        <TableRow className="bg-muted font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-center text-info">{filteredDeptStats.reduce((sum, d) => sum + (d.genderByStatus?.onDuty?.M || 0), 0)}</TableCell>
                          <TableCell className="text-center text-warning">{filteredDeptStats.reduce((sum, d) => sum + (d.genderByStatus?.onDuty?.F || 0), 0)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Staff Status Distribution Pie Chart */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Staff Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ChartContainer
                  config={{
                    onDuty: { label: "On Duty", color: "hsl(var(--success))" },
                    notOnDuty: { label: "Not On Duty", color: "hsl(var(--destructive))" },
                    onStudy: { label: "On Study", color: "hsl(var(--info))" },
                    other: { label: "Other", color: "hsl(var(--muted))" },
                  }}
                  className="h-64"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.byStatus ? Object.entries(stats.byStatus).map(([name, value]) => ({
                          name,
                          value,
                          fill: name.toLowerCase() === 'on duty' ? 'hsl(var(--success))' :
                                name.toLowerCase() === 'not on duty' ? 'hsl(var(--destructive))' :
                                name.toLowerCase().includes('study') ? 'hsl(var(--info))' :
                                'hsl(var(--muted-foreground))'
                        })) : []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats?.byStatus && Object.entries(stats.byStatus).map(([name], index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={name.toLowerCase() === 'on duty' ? 'hsl(var(--success))' :
                                  name.toLowerCase() === 'not on duty' ? 'hsl(var(--destructive))' :
                                  name.toLowerCase().includes('study') ? 'hsl(var(--info))' :
                                  'hsl(var(--muted-foreground))'}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Academic Rank Bar Chart */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">On Duty Staff by Academic Rank</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ChartContainer
                  config={{
                    count: { label: "Count", color: "hsl(var(--primary))" },
                  }}
                  className="h-64"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { rank: 'Lecturer', count: stats?.onDutyByRank?.lecturer || 0 },
                        { rank: 'Asst. Prof.', count: stats?.onDutyByRank?.asstProf || 0 },
                        { rank: 'Assoc. Prof.', count: stats?.onDutyByRank?.assoProf || 0 },
                        { rank: 'Professor', count: stats?.onDutyByRank?.professor || 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                    >
                      <XAxis dataKey="rank" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department Gender Chart */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">On Duty Staff Gender by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptStatsLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ChartContainer
                config={{
                  male: { label: "Male", color: "hsl(var(--info))" },
                  female: { label: "Female", color: "hsl(var(--warning))" },
                }}
                className="h-72"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredDeptStats?.map(dept => ({
                      dept: dept.code,
                      male: dept.genderByStatus?.onDuty?.M || 0,
                      female: dept.genderByStatus?.onDuty?.F || 0,
                    })) || []}
                    margin={{ top: 10, right: 30, left: 10, bottom: 40 }}
                  >
                    <XAxis dataKey="dept" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="male" name="Male" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="female" name="Female" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

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
                      <TableHead className="text-center">On Duty ARA</TableHead>
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
                        <TableCell className="text-center font-semibold text-primary">{dept.onDutyARACount || 0}</TableCell>
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
                        <TableCell className="text-center text-primary">{filteredDeptStats.reduce((sum, d) => sum + (d.onDutyARACount || 0), 0)}</TableCell>
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
