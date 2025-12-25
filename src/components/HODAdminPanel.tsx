import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Shield, User, Crown, Users, UserPlus, Trash2, Edit, Settings, UserCheck, UserX } from 'lucide-react';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';

interface HODAdminPanelProps {
  currentUserId?: string;
}

export function HODAdminPanel({ currentUserId }: HODAdminPanelProps) {
  const { userRoles, loading: rolesLoading, updateUserRole, isHOD } = useUserRoles();
  const { teamMembers, loading: membersLoading, addTeamMember, updateTeamMember, deleteTeamMember } = useTeamMembers();
  
  // Add member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIsHod, setNewMemberIsHod] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  
  // Edit member dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsHod, setEditIsHod] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  
  const { toast } = useToast();

  const canManageRoles = isHOD(currentUserId);

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the team member.',
        variant: 'destructive'
      });
      return;
    }

    setAddLoading(true);
    const result = await addTeamMember(newMemberName, newMemberIsHod);
    
    if (result.success) {
      setAddDialogOpen(false);
      setNewMemberName('');
      setNewMemberIsHod(false);
    }
    setAddLoading(false);
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditIsHod(member.is_hod);
    setEditIsActive(member.is_active);
    setEditDialogOpen(true);
  };

  const handleEditMember = async () => {
    if (!editingMember || !editName.trim()) return;

    setEditLoading(true);
    const result = await updateTeamMember(editingMember.id, {
      name: editName.trim(),
      is_hod: editIsHod,
      is_active: editIsActive
    });
    
    if (result.success) {
      setEditDialogOpen(false);
      setEditingMember(null);
    }
    setEditLoading(false);
  };

  const handleDeleteMember = async (member: TeamMember) => {
    await deleteTeamMember(member.id, member.name);
  };

  const hodCount = teamMembers.filter(m => m.is_hod).length;
  const activeCount = teamMembers.filter(m => m.is_active).length;
  const inactiveCount = teamMembers.filter(m => !m.is_active).length;

  // Check which team members have registered accounts
  const registeredEmails = userRoles.map(r => r.user_email.toLowerCase());

  if (!canManageRoles) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Only HOD can access admin panel.</div>
        </CardContent>
      </Card>
    );
  }

  const loading = rolesLoading || membersLoading;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading...</div>
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
            Manage team members, roles, and permissions (Offline Mode)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="text-xs text-muted-foreground">Total Members</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{hodCount}</div>
              <div className="text-xs text-muted-foreground">HOD Members</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--chart-2))]/20 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-[hsl(var(--chart-2))]" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{inactiveCount}</div>
              <div className="text-xs text-muted-foreground">Inactive</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Management */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Team Members
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
                  Add a new person to the team. They can then sign up to access the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter member name"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-is-hod">HOD Role</Label>
                  <Switch
                    id="new-is-hod"
                    checked={newMemberIsHod}
                    onCheckedChange={setNewMemberIsHod}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={addLoading || !newMemberName.trim()}>
                  {addLoading ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members found. Add members to get started.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Registered</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => {
                    const isRegistered = registeredEmails.includes(member.email?.toLowerCase() || '');
                    
                    return (
                      <TableRow key={member.id} className={!member.is_active ? "bg-muted/30 opacity-60" : "bg-card"}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.is_hod ? (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                              <Crown className="h-3 w-3 mr-1" />
                              HOD
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <User className="h-3 w-3 mr-1" />
                              Member
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.is_active ? (
                            <Badge variant="outline" className="text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isRegistered ? (
                            <Badge variant="outline" className="text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(member)}
                              title="Edit member"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Team Member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove <strong>{member.name}</strong> from the team.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteMember(member)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter member name"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-is-hod">HOD Role</Label>
              <Switch
                id="edit-is-hod"
                checked={editIsHod}
                onCheckedChange={setEditIsHod}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="edit-is-active">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive members won't appear in task dropdowns</p>
              </div>
              <Switch
                id="edit-is-active"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMember} disabled={editLoading || !editName.trim()}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
