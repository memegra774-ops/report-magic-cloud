import { cn } from '@/lib/utils';
import { StaffCategory } from '@/types/staff';

interface StatusBadgeProps {
  status: string;
  category?: StaffCategory;
  className?: string;
}

const StatusBadge = ({ status, category, className }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('on duty') && !normalizedStatus.includes('not')) {
      return 'status-on-duty';
    }
    if (normalizedStatus.includes('not on duty') || normalizedStatus.includes('salary hold')) {
      return 'status-not-on-duty';
    }
    if (normalizedStatus.includes('study') || normalizedStatus.includes('research')) {
      return 'status-on-study';
    }
    if (normalizedStatus.includes('sponsor')) {
      return 'status-sponsor';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyles(),
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
