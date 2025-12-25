import { useState, useEffect } from 'react';
import { localTeamMembers, LocalTeamMember } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_hod: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeamMembers = () => {
    const members = localTeamMembers.getAll();
    setTeamMembers(members.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const addTeamMember = async (name: string, isHod: boolean = false) => {
    const { member, error } = localTeamMembers.add(name, isHod);

    if (error) {
      if (error.includes('exists')) {
        toast({
          title: 'Member exists',
          description: 'A team member with this name already exists.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
      }
      return { success: false };
    }

    toast({
      title: 'Member added',
      description: `${name} has been added to the team.`
    });
    
    return { success: true };
  };

  const updateTeamMember = async (id: string, updates: Partial<Pick<TeamMember, 'name' | 'is_active' | 'is_hod'>>) => {
    const { error } = localTeamMembers.update(id, updates);

    if (error) {
      if (error.includes('exists')) {
        toast({
          title: 'Name exists',
          description: 'A team member with this name already exists.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
      }
      return { success: false };
    }

    toast({
      title: 'Member updated',
      description: 'Team member has been updated.'
    });
    
    return { success: true };
  };

  const deleteTeamMember = async (id: string, name: string) => {
    const { error } = localTeamMembers.delete(id);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      return { success: false };
    }

    toast({
      title: 'Member removed',
      description: `${name} has been removed from the team.`
    });
    
    return { success: true };
  };

  // Get active members for dropdowns
  const getActiveMembers = () => teamMembers.filter(m => m.is_active);
  
  // Get member names for dropdowns (backwards compatible)
  const getMemberNames = () => getActiveMembers().map(m => m.name);

  useEffect(() => {
    fetchTeamMembers();

    // Subscribe to changes
    const unsubscribe = localTeamMembers.subscribe(() => {
      fetchTeamMembers();
    });

    return () => unsubscribe();
  }, []);

  return {
    teamMembers,
    loading,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    getActiveMembers,
    getMemberNames
  };
}
