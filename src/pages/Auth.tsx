import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const { signIn, user, isLoading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading && profile) {
      // Check if user needs to change password
      checkPasswordChangeRequired();
    }
  }, [user, isLoading, profile, navigate]);

  const checkPasswordChangeRequired = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('password_change_required')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error checking password change:', error);
      navigate('/');
      return;
    }

    if (data?.password_change_required) {
      setShowPasswordChange(true);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Logged in successfully');
      // The useEffect will handle navigation after profile loads
    }

    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        throw passwordError;
      }

      // Update profile to remove password change requirement
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_change_required: false })
        .eq('id', user?.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Password changed successfully');
      setShowPasswordChange(false);
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to change password: ' + error.message);
    }

    setLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show password change form if required
  if (showPasswordChange && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-3 bg-warning/10 rounded-xl w-fit">
              <KeyRound className="h-12 w-12 text-warning" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl">Change Your Password</CardTitle>
              <CardDescription className="text-base mt-2">
                For security, please set a new password before continuing.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Password must be at least 8 characters long.
              </p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password & Continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-3 bg-primary/10 rounded-xl w-fit">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>
          <div>
            <CardTitle className="font-serif text-2xl">ASTU Staff Report System</CardTitle>
            <CardDescription className="text-base mt-2">
              College of Electrical Engineering & Computing
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
