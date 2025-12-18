import { Users, UserCheck, UserX, GraduationCap, BookOpen, Award } from 'lucide-react';
import Header from '@/components/Header';
import StatsCard from '@/components/StatsCard';
import { useStaffStats, useStaff } from '@/hooks/useStaff';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StaffTable from '@/components/StaffTable';

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useStaffStats();
  const { data: recentStaff, isLoading: staffLoading } = useStaff();

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
            Manage academic staff records and generate monthly reports for CoEEC
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
                title="On Duty"
                value={stats?.byCategory['Local Instructors'] || 0}
                icon={UserCheck}
                variant="success"
                description="Active academic staff"
              />
              <StatsCard
                title="On Study"
                value={(stats?.byCategory['On Study'] || 0) + (stats?.byCategory['Not Reporting'] || 0)}
                icon={BookOpen}
                variant="info"
                description="Staff on study leave"
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

        {/* Gender Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl border p-6 shadow-card animate-fade-in">
            <h3 className="font-semibold text-lg mb-4">Gender Distribution</h3>
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
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-card animate-fade-in">
            <h3 className="font-semibold text-lg mb-4">Staff Categories</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Academic Staff</span>
                <span className="font-semibold">{(stats?.byCategory['Local Instructors'] || 0) + (stats?.byCategory['Not On Duty'] || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Research Assistants</span>
                <span className="font-semibold">{(stats?.byCategory['ARA'] || 0) + (stats?.byCategory['Not On Duty ARA'] || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sponsors</span>
                <span className="font-semibold">{stats?.byCategory['ASTU Sponsor'] || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-card animate-fade-in">
            <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/staff">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View All Staff
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
            </div>
          </div>
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
            <StaffTable staff={recentStaff?.slice(0, 10) || []} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
