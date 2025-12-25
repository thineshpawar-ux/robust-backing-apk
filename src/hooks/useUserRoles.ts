import { useState, useEffect } from 'react';
import { localUserRoles, LocalUserRole } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'hod' | 'team_member';

export interface UserRole {
  id: string;
  user_id: string;
  user_email: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRoles = () => {
    const roles = localUserRoles.getAll();
    setUserRoles(roles.sort((a, b) => a.user_email.localeCompare(b.user_email)));
    setLoading(false);
  };

  const fetchCurrentUserRole = (userId: string) => {
    setLoading(true);
    const role = localUserRoles.getByUserId(userId);
    setCurrentUserRole(role?.role || 'team_member');
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    const { error } = localUserRoles.update(userId, newRole);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Role Updated',
      description: 'User role has been updated successfully.',
    });

    fetchUserRoles();
  };

  const isHOD = (userId?: string, userEmail?: string): boolean => {
    // Check currentUserRole first
    if (currentUserRole === 'hod') {
      return true;
    }
    // Fallback: check by role in userRoles array
    if (!userId) return false;
    return localUserRoles.isHOD(userId);
  };

  useEffect(() => {
    fetchUserRoles();

    // Subscribe to changes
    const unsubscribe = localUserRoles.subscribe(() => {
      fetchUserRoles();
    });

    return () => unsubscribe();
  }, []);

  return {
    userRoles,
    currentUserRole,
    loading,
    fetchUserRoles,
    fetchCurrentUserRole,
    updateUserRole,
    isHOD,
  };
}
