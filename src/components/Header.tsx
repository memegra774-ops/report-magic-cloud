import { GraduationCap, FileText, Users, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import NotificationsBell from './NotificationsBell';

const Header = () => {
  const location = useLocation();
  const { user, role, signOut, profile } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FileText, roles: ['system_admin', 'department_head', 'avd', 'management'] },
    { path: '/staff', label: 'Staff Directory', icon: Users, roles: ['system_admin', 'department_head', 'avd', 'management'] },
    { path: '/reports', label: 'Monthly Reports', icon: FileText, roles: ['system_admin', 'department_head', 'avd', 'management'] },
    { path: '/users', label: 'User Management', icon: Settings, roles: ['system_admin'] },
  ];

  const filteredNavItems = navItems.filter(item => !role || item.roles.includes(role));

  return (
    <header className="gradient-header text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm group-hover:bg-primary-foreground/20 transition-colors">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight">ASTU Staff Report</h1>
              <p className="text-xs text-primary-foreground/80">College of Electrical Engineering & Computing</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="flex items-center gap-2">
                {/* Notifications bell for AVD and system_admin */}
                {(role === 'avd' || role === 'system_admin') && (
                  <NotificationsBell />
                )}
                <span className="text-sm text-primary-foreground/80 hidden lg:block">
                  {profile?.full_name || user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
