import { useState, useEffect } from 'react';
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

const TEAM_MEMBERS_KEY = 'sqtodo_team_members';

// Default team members for initial setup
const DEFAULT_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Hariharan', email: 'hariharan@sqtodo.local', is_active: true, is_hod: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', name: 'Thinesh', email: 'thinesh@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', name: 'Augustin', email: 'augustin@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', name: 'Ganesh', email: 'ganesh@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', name: 'Regan', email: 'regan@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '6', name: 'Meenakshi', email: 'meenakshi@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '7', name: 'Vignesh', email: 'vignesh@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '8', name: 'Sateesh', email: 'sateesh@sqtodo.local', is_active: true, is_hod: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

function getStoredTeamMembers(): TeamMember[] {
  const stored = localStorage.getItem(TEAM_MEMBERS_KEY);
  if (!stored) {
    // Initialize with default members
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(DEFAULT_MEMBERS));
    return DEFAULT_MEMBERS;
  }
  return JSON.parse(stored);
}

function saveTeamMembers(members: TeamMember[]) {
  localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members));
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeamMembers = () => {
    const members = getStoredTeamMembers();
    setTeamMembers(members);
    setLoading(false);
  };

  const addTeamMember = async (name: string, isHod: boolean = false) => {
    try {
      const members = getStoredTeamMembers();
      
      // Check for duplicate
      if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
        toast({
          title: 'Member exists',
          description: 'A team member with this name already exists.',
          variant: 'destructive'
        });
        return { success: false };
      }

      const newMember: TeamMember = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`,
        is_active: true,
        is_hod: isHod,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      members.push(newMember);
      saveTeamMembers(members);
      setTeamMembers(members);

      toast({
        title: 'Member added',
        description: `${name} has been added to the team.`
      });
      
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
      const members = getStoredTeamMembers();
      
      // Check for duplicate name if updating name
      if (updates.name) {
        const existing = members.find(m => m.name.toLowerCase() === updates.name!.toLowerCase() && m.id !== id);
        if (existing) {
          toast({
            title: 'Name exists',
            description: 'A team member with this name already exists.',
            variant: 'destructive'
          });
          return { success: false };
        }
      }

      const updatedMembers = members.map(m => 
        m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
      );
      saveTeamMembers(updatedMembers);
      setTeamMembers(updatedMembers);

      toast({
        title: 'Member updated',
        description: 'Team member has been updated.'
      });
      
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
      const members = getStoredTeamMembers().filter(m => m.id !== id);
      saveTeamMembers(members);
      setTeamMembers(members);

      toast({
        title: 'Member removed',
        description: `${name} has been removed from the team.`
      });
      
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
    
    // Listen for storage events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TEAM_MEMBERS_KEY) {
        fetchTeamMembers();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
