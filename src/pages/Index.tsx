import { Users, UserCheck, BookOpen, Award, GraduationCap } from 'lucide-react';
import Header from '@/components/Header';
import StatsCard from '@/components/StatsCard';
import { useStaffStats, useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EditableStaffTable from '@/components/EditableStaffTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { role, profile } = useAuth();
  
  // Department heads only see their department's stats
  const departmentId = role === 'department_head' ? profile?.department_id || undefined : undefined;
  
  const { data: stats, isLoading: statsLoading } = useStaffStats(departmentId);
  const { data: recentStaff, isLoading: staffLoading } = useStaff({
    departmentId,
  });

  const getRoleDisplayName = () => {
    switch (role) {
      case 'system_admin': return 'System Administrator';
      case 'department_head': return 'Department Head';
      case 'avd': return 'Associate Vice Dean';
      case 'management': return 'Management';
      default: return 'User';
    }
  };

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="Total Staff"
                value={stats?.total || 0}
                icon={Users}
                variant="primary"
                description="All registered staff members"
              />
              <StatsCard
                title="Instructors"
                value={stats?.byCategory['Local Instructors'] || 0}
                icon={UserCheck}
                variant="success"
                description="Local instructors"
              />
              <StatsCard
                title="ARAs"
                value={stats?.byCategory['ARA'] || 0}
                icon={BookOpen}
                variant="info"
                description="Academic Research Assistants"
              />
              <StatsCard
                title="PhD Holders"
                value={(stats?.byEducation['PHD'] || 0)}
                icon={Award}
                variant="warning"
                description="Doctoral degree holders"
              />
            </>
          )}
        </div>

        {/* Gender Distribution & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-4 bg-info/10 rounded-lg">
                  <p className="text-3xl font-serif font-bold text-info">{stats?.bySex.M || 0}</p>
                  <p className="text-sm text-muted-foreground">Male</p>
                </div>
                <div className="flex-1 text-center p-4 bg-accent/10 rounded-lg">
                  <p className="text-3xl font-serif font-bold text-accent">{stats?.bySex.F || 0}</p>
                  <p className="text-sm text-muted-foreground">Female</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Staff Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Instructors</span>
                  <span className="font-semibold">{stats?.byCategory['Local Instructors'] || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Research Assistants</span>
                  <span className="font-semibold">{stats?.byCategory['ARA'] || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ASTU Sponsors</span>
                  <span className="font-semibold">{stats?.byCategory['ASTU Sponsor'] || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link to="/staff">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    View Staff Directory
                  </Button>
                </Link>
                <Link to="/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Staff */}
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl font-bold">Recent Staff Members</h2>
            <Link to="/staff">
              <Button variant="ghost">View All →</Button>
            </Link>
          </div>
          {staffLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <EditableStaffTable 
              staff={recentStaff?.slice(0, 10) || []} 
              canEdit={false}
              canDelete={false}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
