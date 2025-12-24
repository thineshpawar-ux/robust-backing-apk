import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (name: string, isHod: boolean = false) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({ name: name.trim(), is_hod: isHod });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({
            title: 'Member exists',
            description: 'A team member with this name already exists.',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return { success: false };
      }

      toast({
        title: 'Member added',
        description: `${name} has been added to the team.`
      });
      
      await fetchTeamMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive'
      });
      return { success: false };
    }
  };

  const updateTeamMember = async (id: string, updates: Partial<Pick<TeamMember, 'name' | 'is_active' | 'is_hod'>>) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id);

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({
            title: 'Name exists',
            description: 'A team member with this name already exists.',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return { success: false };
      }

      toast({
        title: 'Member updated',
        description: 'Team member has been updated.'
      });
      
      await fetchTeamMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team member',
        variant: 'destructive'
      });
      return { success: false };
    }
  };

  const deleteTeamMember = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Member removed',
        description: `${name} has been removed from the team.`
      });
      
      await fetchTeamMembers();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team member',
        variant: 'destructive'
      });
      return { success: false };
    }
  };

  // Get active members for dropdowns
  const getActiveMembers = () => teamMembers.filter(m => m.is_active);
  
  // Get member names for dropdowns (backwards compatible)
  const getMemberNames = () => getActiveMembers().map(m => m.name);

  useEffect(() => {
    fetchTeamMembers();
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