import { useState } from 'react';
import { Trash2, UserPlus, Edit } from 'lucide-react';
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
import emailjs from '@emailjs/browser';

// EmailJS configuration - using public API key
const EMAILJS_PUBLIC_KEY = 'U7ON9nZCHj4tFvcvG';
const EMAILJS_SERVICE_ID = 'service_mgzytra'; // User needs to configure this
const EMAILJS_TEMPLATE_ID = 'template_gwsmq1l'; // User needs to configure this

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'department_head', label: 'Department Head' },
  { value: 'avd', label: 'AVD (Associate Dean)' },
  { value: 'management', label: 'Management' },
];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  departments?: { code: string; name: string } | null;
  role: AppRole | null;
}

// Send invitation email using EmailJS
const sendInvitationEmail = async (name: string, email: string) => {
  try {
    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);
    
    const templateParams = {
      to_name: name,
      to_email: email,
      name: name,
      subject: 'Invitation to Join Staff Reporting Portal',
      message: `Dear ${name},

Please join the reporting portal using the following login information:

Username: ${email}
Password: 12345678

Please change your password after your first login.

Best regards,
ASTU Staff Report System`,
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );
    
    console.log('Invitation email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return false;
  }
};

const UserManagement = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'department_head' as AppRole,
    department_id: '',
  });
  const [editFormData, setEditFormData] = useState({
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
      })) as UserWithRole[];
    },
  });

  const inviteUser = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: '12345678',
          role: data.role,
          full_name: data.full_name,
          department_id: data.department_id || null,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      // Send email using EmailJS
      const emailSent = await sendInvitationEmail(data.full_name || 'User', data.email);

      return { ...result, email_sent: emailSent };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setInviteDialogOpen(false);
      setFormData({ email: '', full_name: '', role: 'department_head', department_id: '' });
      if (data?.email_sent) {
        toast.success('User invited successfully. Email notification sent with login credentials.');
      } else {
        toast.success('User invited successfully. Email could not be sent. Default password: 12345678');
      }
    },
    onError: (error) => {
      toast.error('Failed to invite user: ' + error.message);
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, newRole, departmentId }: { userId: string; newRole: AppRole; departmentId?: string }) => {
      const { data: result, error } = await supabase.functions.invoke('update-user-role', {
        body: {
          user_id: userId,
          new_role: newRole,
          department_id: departmentId,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setEditDialogOpen(false);
      setEditingUser(null);
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user role: ' + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setDeleteUserId(null);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  const handleInvite = () => {
    inviteUser.mutate(formData);
  };

  const handleEditClick = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFormData({
      role: user.role || 'department_head',
      department_id: user.department_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!editingUser) return;
    updateUserRole.mutate({
      userId: editingUser.id,
      newRole: editFormData.role,
      departmentId: editFormData.department_id,
    });
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(user)}
                            >
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
                An email will be sent to the user with login credentials. Default password: <code className="bg-muted px-1 rounded">12345678</code>
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

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Edit User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Input value={editingUser?.full_name || editingUser?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(v) => setEditFormData({ ...editFormData, role: v as AppRole })}
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
              {editFormData.role === 'department_head' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={editFormData.department_id}
                    onValueChange={(v) => setEditFormData({ ...editFormData, department_id: v })}
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateUserRole.isPending}>
                {updateUserRole.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This will remove their account, profile, and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default UserManagement;
