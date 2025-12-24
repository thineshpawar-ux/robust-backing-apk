import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Shield, User, Crown, Users, UserPlus, Trash2, KeyRound, Settings } from 'lucide-react';
import { useUserRoles, AppRole, UserRole } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TEAM_MEMBERS } from '@/types/task';

interface HODAdminPanelProps {
  currentUserId?: string;
}

export function HODAdminPanel({ currentUserId }: HODAdminPanelProps) {
  const { userRoles, loading, updateUserRole, isHOD, fetchUserRoles } = useUserRoles();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('team_member');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<AppRole>('team_member');
  const [addLoading, setAddLoading] = useState(false);
  const { toast } = useToast();

  const canManageRoles = isHOD(currentUserId);

  // Get list of users not yet registered
  const registeredEmails = userRoles.map(r => r.user_email.toLowerCase());
  const allPossibleUsers = ['Hariharan', ...TEAM_MEMBERS];
  const unregisteredUsers = allPossibleUsers.filter(
    name => !registeredEmails.includes(`${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`)
  );

  const handleRoleChange = async (userId: string) => {
    await updateUserRole(userId, selectedRole);
    toast({
      title: 'Role updated',
      description: 'User role has been changed successfully.'
    });
    setEditingUser(null);
  };

  const handleAddMember = async () => {
    if (!newMemberName || !newMemberPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all fields.',
        variant: 'destructive'
      });
      return;
    }

    if (newMemberPassword.length < 4) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 4 characters.',
        variant: 'destructive'
      });
      return;
    }

    setAddLoading(true);
    const email = `${newMemberName.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;

    try {
      // Sign up the new user
      const { error } = await supabase.auth.signUp({
        email,
        password: newMemberPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'User exists',
            description: 'This user is already registered.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Failed to add user',
            description: error.message,
            variant: 'destructive'
          });
        }
        return;
      }

      // If role is HOD, update it after a short delay (trigger creates team_member by default)
      if (newMemberRole === 'hod') {
        setTimeout(async () => {
          const { data: newUserRole } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('user_email', email)
            .single();
          
          if (newUserRole) {
            await updateUserRole(newUserRole.user_id, 'hod');
          }
          fetchUserRoles();
        }, 2000);
      }

      toast({
        title: 'Member added!',
        description: `${newMemberName} has been registered successfully.`
      });
      
      setAddDialogOpen(false);
      setNewMemberName('');
      setNewMemberPassword('');
      setNewMemberRole('team_member');
      
      // Refresh user list
      setTimeout(() => fetchUserRoles(), 2000);
      
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add team member.',
        variant: 'destructive'
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userRole: UserRole) => {
    // Delete from user_roles table
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userRole.user_id);

    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'User removed',
      description: `${userRole.user_email} has been removed from the team.`
    });
    
    fetchUserRoles();
  };

  const getRoleBadge = (role: AppRole) => {
    if (role === 'hod') {
      return (
        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          HOD
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <User className="h-3 w-3 mr-1" />
        Team Member
      </Badge>
    );
  };

  const hodCount = userRoles.filter(r => r.role === 'hod').length;
  const teamMemberCount = userRoles.filter(r => r.role === 'team_member').length;

  if (!canManageRoles) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Only HOD can access admin panel.</div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Panel
          </CardTitle>
          <CardDescription>
            Manage team members, roles, and permissions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{hodCount}</div>
              <div className="text-xs text-muted-foreground">HOD Users</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{teamMemberCount}</div>
              <div className="text-xs text-muted-foreground">Team Members</div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{unregisteredUsers.length}</div>
              <div className="text-xs text-muted-foreground">Not Registered</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Team Management
          </CardTitle>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
                <DialogDescription>
                  Create an account for a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Select value={newMemberName} onValueChange={setNewMemberName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member name" />
                    </SelectTrigger>
                    <SelectContent>
                      {unregisteredUsers.map(user => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {unregisteredUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">All team members are registered</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Initial Password</Label>
                  <Input
                    type="password"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    placeholder="Set initial password (min 4 chars)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newMemberRole} onValueChange={(v: AppRole) => setNewMemberRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="hod">HOD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={addLoading || !newMemberName}>
                  {addLoading ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Add team members to get started.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((userRole) => {
                    const isCurrentUser = userRole.user_id === currentUserId;
                    const displayName = userRole.user_email.split('@')[0];
                    
                    return (
                      <TableRow key={userRole.id} className="bg-card">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium uppercase">
                              {displayName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium capitalize">{displayName}</div>
                              <div className="text-xs text-muted-foreground">{userRole.user_email}</div>
                            </div>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingUser === userRole.user_id ? (
                            <Select
                              value={selectedRole}
                              onValueChange={(value: AppRole) => setSelectedRole(value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hod">HOD</SelectItem>
                                <SelectItem value="team_member">Team Member</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getRoleBadge(userRole.role)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingUser === userRole.user_id ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleRoleChange(userRole.user_id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUser(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUser(userRole.user_id);
                                  setSelectedRole(userRole.role);
                                }}
                                disabled={isCurrentUser}
                                title="Change role"
                              >
                                <Crown className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={isCurrentUser}
                                    title="Remove user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove <strong className="capitalize">{displayName}</strong> from the team. 
                                      Their tasks will remain but they won't be able to log in.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteUser(userRole)}
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unregistered Users */}
      {unregisteredUsers.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members Not Yet Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unregisteredUsers.map(name => (
                <Badge key={name} variant="outline" className="text-muted-foreground">
                  {name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              These team members haven't signed up yet. Use "Add Member" to create accounts for them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}