import { useState } from 'react';
import { Bell, Check, Trash2, UserPlus, UserMinus, CheckCheck, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { usePendingChanges, useApproveChange, useRejectChange } from '@/hooks/useStaffChanges';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationsBell = () => {
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const { data: pendingChanges } = usePendingChanges();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const approveChange = useApproveChange();
  const rejectChange = useRejectChange();
  const { role, user } = useAuth();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const isAdmin = role === 'system_admin';

  const getIcon = (type: string) => {
    switch (type) {
      case 'staff_added':
        return <UserPlus className="h-4 w-4 text-success" />;
      case 'staff_deleted':
        return <UserMinus className="h-4 w-4 text-destructive" />;
      case 'change_add':
        return <UserPlus className="h-4 w-4 text-amber-600" />;
      case 'change_delete':
        return <UserMinus className="h-4 w-4 text-amber-600" />;
      case 'change_update':
        return <Pencil className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const isChangeNotification = (type: string) =>
    type === 'change_add' || type === 'change_delete' || type === 'change_update';

  // Find matching pending change for a notification
  const findPendingChange = (notification: { staff_name: string | null; type: string }) => {
    if (!pendingChanges || !notification.staff_name) return null;
    const actionType = notification.type.replace('change_', '');
    return pendingChanges.find(
      (ch) => ch.staff_name === notification.staff_name && ch.action_type === actionType && ch.status === 'pending'
    );
  };

  const handleApprove = (changeId: string) => {
    if (!user?.id) return;
    approveChange.mutate({ changeId, reviewerId: user.id });
  };

  const handleRejectConfirm = () => {
    if (!rejectingId || !user?.id) return;
    rejectChange.mutate({ changeId: rejectingId, reviewerId: user.id, note: rejectNote });
    setRejectingId(null);
    setRejectNote('');
  };

  const totalBadge = (unreadCount || 0);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Bell className="h-5 w-5" />
            {totalBadge > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalBadge > 9 ? '9+' : totalBadge}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ScrollArea className="h-80">
              <div className="divide-y">
                {notifications.map((notification) => {
                  const pendingChange = isAdmin && isChangeNotification(notification.type) 
                    ? findPendingChange(notification) 
                    : null;

                  return (
                    <div
                      key={notification.id}
                      className={`p-3 transition-colors ${
                        notification.is_read ? 'bg-background' : 'bg-primary/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sm truncate">
                              {notification.title}
                            </span>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                            {isChangeNotification(notification.type) && pendingChange && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px] border-amber-400 text-amber-700 bg-amber-50 shrink-0">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Approve / Reject buttons for admin on change notifications */}
                          {isAdmin && pendingChange && (
                            <div className="flex gap-1.5 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleApprove(pendingChange.id)}
                                disabled={approveChange.isPending}
                              >
                                <Check className="h-3 w-3 mr-0.5" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setRejectingId(pendingChange.id)}
                                disabled={rejectChange.isPending}
                              >
                                <Trash2 className="h-3 w-3 mr-0.5" />
                                Undo
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            <div className="flex gap-0.5">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => markRead.mutate(notification.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteNotification.mutate(notification.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject / Undo Change</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the change and revert any applied modifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for rejection (optional)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive hover:bg-destructive/90">
              Reject & Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NotificationsBell;
