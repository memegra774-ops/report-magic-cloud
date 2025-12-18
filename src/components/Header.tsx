import { GraduationCap, FileText, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FileText },
    { path: '/staff', label: 'Staff Directory', icon: Users },
    { path: '/reports', label: 'Monthly Reports', icon: FileText },
  ];

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

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
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
        </div>
      </div>
    </header>
  );
};

export default Header;
