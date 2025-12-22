export interface Task {
  id: string;
  title: string;
  owner: string;
  notes: string | null;
  status: 'open' | 'closed';
  created_at: string;
  current_target_date: string;
  target_date_history: string[];
  completed_at: string | null;
  updated_at: string;
}

export type TaskFormData = {
  title: string;
  owner: string;
  notes: string;
  status: 'open' | 'closed';
  current_target_date: string;
};

export const TEAM_MEMBERS = [
  'Thinesh',
  'Augustin', 
  'Ganesh',
  'Regan',
  'Meenakshi',
  'Vignesh',
  'Sateesh'
] as const;

export const DELETE_PASSWORD = 'SQADMIN';
export const PAGE_SIZE = 20;
