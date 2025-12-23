import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Shield, User, Crown, Users } from 'lucide-react';
import { useUserRoles, AppRole, UserRole } from '@/hooks/useUserRoles';

interface RoleManagementProps {
  currentUserId?: string;
}

export function RoleManagement({ currentUserId }: RoleManagementProps) {
  const { userRoles, loading, updateUserRole, isHOD } = useUserRoles();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('team_member');

  const canManageRoles = isHOD(currentUserId);

  const handleRoleChange = async (userId: string) => {
    await updateUserRole(userId, selectedRole);
    setEditingUser(null);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading roles...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Role Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Crown className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{hodCount}</div>
              <div className="text-sm text-muted-foreground">HOD Users</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{teamMemberCount}</div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
          </div>
        </div>

        {/* User Roles Table */}
        {userRoles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found. Users will appear here after they sign up.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canManageRoles && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell className="font-medium">{userRole.user_email}</TableCell>
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
                  {canManageRoles && (
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(userRole.user_id);
                            setSelectedRole(userRole.role);
                          }}
                          disabled={userRole.user_id === currentUserId}
                        >
                          Change Role
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!canManageRoles && (
          <div className="text-center py-4 text-sm text-muted-foreground bg-muted/50 rounded-lg">
            Only HOD users can manage roles.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
