import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { changeAdminPassword } from '@/lib/firestore/adminService';
import { Eye, EyeSlash, Lock, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface AdminChangePasswordDialogProps {
  adminId: string;
  adminName: string;
  currentPassword: string;
  onSuccess: () => void;
}

export function AdminChangePasswordDialog({
  adminId,
  adminName,
  currentPassword,
  onSuccess
}: AdminChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (): boolean => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return false;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (newPassword === currentPassword) {
      toast.error('New password cannot be the same as temporary password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setLoading(true);
    try {
      await changeAdminPassword(adminId, currentPassword, newPassword);
      toast.success('Password changed successfully! Redirecting...');

      // Wait a moment before redirecting
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-purple-600 dark:text-purple-400" weight="duotone" />
          </div>
          <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
          <CardDescription>
            Welcome, <span className="font-semibold text-foreground">{adminName}</span>!<br />
            This is your first login. Please create a new password for your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={8}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeSlash size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeSlash size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-md space-y-2">
                <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                  Password Requirements:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      size={16}
                      weight={newPassword.length >= 8 ? 'fill' : 'regular'}
                      className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}
                    />
                    <span className={`text-xs ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      At least 8 characters
                    </span>
                  </div>
                  {confirmPassword && (
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        size={16}
                        weight={newPassword === confirmPassword ? 'fill' : 'regular'}
                        className={newPassword === confirmPassword ? 'text-green-600' : 'text-gray-400'}
                      />
                      <span className={`text-xs ${newPassword === confirmPassword ? 'text-green-600' : 'text-gray-500'}`}>
                        Passwords match
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Security Notice:</strong> Keep your password secure and do not share it with anyone.
                As an admin, you have access to sensitive information.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
