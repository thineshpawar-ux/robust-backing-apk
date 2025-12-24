import { useState, useEffect } from 'react';
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

const USERS_KEY = 'sqtodo_users';

interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  securityAnswer?: string;
}

function getStoredUsers(): LocalUser[] {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRoles = () => {
    try {
      const users = getStoredUsers();
      const roles: UserRole[] = users.map(u => ({
        id: u.id,
        user_id: u.id,
        user_email: u.email,
        role: u.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setUserRoles(roles);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = (userId: string) => {
    setLoading(true);
    try {
      const users = getStoredUsers();
      const user = users.find(u => u.id === userId);
      setCurrentUserRole(user?.role || 'team_member');
    } catch (error: any) {
      console.error('Error fetching current user role:', error);
      setCurrentUserRole('team_member');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      const users = getStoredUsers();
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      );
      saveUsers(updatedUsers);

      toast({
        title: 'Role Updated',
        description: 'User role has been updated successfully.',
      });

      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const isHOD = (userId?: string, userEmail?: string): boolean => {
    if (currentUserRole === 'hod') {
      return true;
    }
    if (!userId) return false;
    const users = getStoredUsers();
    const user = users.find(u => u.id === userId);
    return user?.role === 'hod';
  };

  useEffect(() => {
    fetchUserRoles();
    
    // Listen for storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === USERS_KEY) {
        fetchUserRoles();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
