export interface Task {
  id: string;
  title: string;
  owner: string;
  status: 'open' | 'closed';
  created_at: string;
  current_target_date: string;
  target_date_history: string[];
  completed_at: string | null;
  updated_at: string;
  date_change_pending: boolean;
  date_change_reason: string | null;
  date_change_requested_date: string | null;
  date_change_approved_by: string | null;
}

export type TaskFormData = {
  title: string;
  owner: string;
  status: 'open' | 'closed';
  current_target_date: string;
};

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  task_id: string | null;
  created_at: string;
}

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
