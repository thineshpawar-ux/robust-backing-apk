import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('user_email');

      if (error) throw error;
      
      // Cast the role field to AppRole type
      const typedData = (data || []).map(row => ({
        ...row,
        role: row.role as AppRole
      }));
      
      setUserRoles(typedData);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      if (error) throw error;
      setCurrentUserRole(data as AppRole);
    } catch (error: any) {
      console.error('Error fetching current user role:', error);
      setCurrentUserRole('team_member'); // Default to team_member if error
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: 'User role has been updated successfully.',
      });

      await fetchUserRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const isHOD = (userId?: string, userEmail?: string): boolean => {
    // Check currentUserRole first (from database function)
    if (currentUserRole === 'hod') {
      return true;
    }
    // Fallback: check by role in userRoles array
    if (!userId) return false;
    const userRole = userRoles.find(r => r.user_id === userId);
    return userRole?.role === 'hod';
  };

  useEffect(() => {
    fetchUserRoles();
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
