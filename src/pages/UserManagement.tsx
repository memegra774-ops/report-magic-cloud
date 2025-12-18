import { useState } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDepartments } from '@/hooks/useStaff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'department_head', label: 'Department Head' },
  { value: 'avd', label: 'AVD (Associate Dean)' },
  { value: 'management', label: 'Management' },
];

const UserManagement = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'department_head' as AppRole,
    department_id: '',
  });

  const { data: departments } = useDepartments();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, departments(code, name)');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

      return profiles.map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || null,
      }));
    },
  });

  const inviteUser = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Sign up the user with default password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: '12345678',
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update profile with department
      if (data.department_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            department_id: data.department_id,
            full_name: data.full_name,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: data.role,
        });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setInviteDialogOpen(false);
      setFormData({ email: '', full_name: '', role: 'department_head', department_id: '' });
      toast.success('User invited successfully. Default password: 12345678');
    },
    onError: (error) => {
      toast.error('Failed to invite user: ' + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Note: This only removes the role, not the actual user account
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setDeleteUserId(null);
      toast.success('User role removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove user: ' + error.message);
    },
  });

  const handleInvite = () => {
    inviteUser.mutate(formData);
  };

  if (role !== 'system_admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
            </CardContent>
          </Card>
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
            <h1 className="font-serif text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Invite and manage system users</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.role && (
                          <Badge variant="secondary">
                            {user.role === 'system_admin' ? 'System Admin' :
                             user.role === 'department_head' ? 'Department Head' :
                             user.role === 'avd' ? 'AVD' : 'Management'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.departments?.code || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== 'system_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'department_head' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(v) => setFormData({ ...formData, department_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Default password: <code className="bg-muted px-1 rounded">12345678</code>
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteUser.isPending}>
                {inviteUser.isPending ? 'Inviting...' : 'Invite User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User Access</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this user's role? They will no longer have access to the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default UserManagement;
