// Local Storage Service - Replaces Supabase for offline usage
// This can be replaced with Firebase later

import { Task } from '@/types/task';

// Generate UUID without external dependency
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Storage Keys
const STORAGE_KEYS = {
  TASKS: 'sq_tasks',
  TEAM_MEMBERS: 'sq_team_members',
  USER_ROLES: 'sq_user_roles',
  NOTIFICATIONS: 'sq_notifications',
  CURRENT_USER: 'sq_current_user',
  USERS: 'sq_users'
};

// Types
export interface LocalUser {
  id: string;
  email: string;
  name: string;
  password: string; // In real app, this would be hashed
  securityAnswer?: string;
  created_at: string;
}

export interface LocalTeamMember {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_hod: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalUserRole {
  id: string;
  user_id: string;
  user_email: string;
  role: 'hod' | 'team_member';
  security_answer?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  task_id?: string;
  created_at: string;
}

// Helper functions
const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Event system for real-time updates simulation
type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export const subscribe = (key: string, listener: Listener): (() => void) => {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(listener);
  return () => {
    listeners[key] = listeners[key].filter(l => l !== listener);
  };
};

const notify = (key: string) => {
  if (listeners[key]) {
    listeners[key].forEach(l => l());
  }
};

// ============= USERS / AUTH =============
export const localAuth = {
  getCurrentUser: (): LocalUser | null => {
    return getItem<LocalUser | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser: (user: LocalUser | null): void => {
    if (user) {
      setItem(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    notify('auth');
  },

  getAllUsers: (): LocalUser[] => {
    return getItem<LocalUser[]>(STORAGE_KEYS.USERS, []);
  },

  signUp: (name: string, password: string, securityAnswer?: string): { user: LocalUser | null; error: string | null } => {
    const users = localAuth.getAllUsers();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    
    if (users.find(u => u.email === email)) {
      return { user: null, error: 'User already exists' };
    }

    const newUser: LocalUser = {
      id: generateId(),
      email,
      name,
      password,
      securityAnswer: securityAnswer?.toLowerCase().trim(),
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    setItem(STORAGE_KEYS.USERS, users);

    // Create user role
    const roles = getItem<LocalUserRole[]>(STORAGE_KEYS.USER_ROLES, []);
    const teamMembers = getItem<LocalTeamMember[]>(STORAGE_KEYS.TEAM_MEMBERS, []);
    const member = teamMembers.find(m => m.name.toLowerCase() === name.toLowerCase());
    
    roles.push({
      id: generateId(),
      user_id: newUser.id,
      user_email: email,
      role: member?.is_hod ? 'hod' : 'team_member',
      security_answer: securityAnswer?.toLowerCase().trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setItem(STORAGE_KEYS.USER_ROLES, roles);

    localAuth.setCurrentUser(newUser);
    notify('userRoles');
    return { user: newUser, error: null };
  },

  signIn: (name: string, password: string): { user: LocalUser | null; error: string | null } => {
    const users = localAuth.getAllUsers();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return { user: null, error: 'Invalid login credentials' };
    }

    localAuth.setCurrentUser(user);
    return { user, error: null };
  },

  signOut: (): void => {
    localAuth.setCurrentUser(null);
  },

  updatePassword: (userId: string, newPassword: string): { error: string | null } => {
    const users = localAuth.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      return { error: 'User not found' };
    }

    users[index].password = newPassword;
    setItem(STORAGE_KEYS.USERS, users);
    
    if (localAuth.getCurrentUser()?.id === userId) {
      localAuth.setCurrentUser(users[index]);
    }
    
    return { error: null };
  },

  verifySecurityAnswer: (email: string, answer: string): { valid: boolean; userId?: string } => {
    const roles = getItem<LocalUserRole[]>(STORAGE_KEYS.USER_ROLES, []);
    const role = roles.find(r => r.user_email === email);
    
    if (!role || !role.security_answer) {
      return { valid: false };
    }

    return {
      valid: role.security_answer === answer.toLowerCase().trim(),
      userId: role.user_id
    };
  },

  subscribeToAuth: (listener: Listener) => subscribe('auth', listener)
};

// ============= TEAM MEMBERS =============
export const localTeamMembers = {
  getAll: (): LocalTeamMember[] => {
    return getItem<LocalTeamMember[]>(STORAGE_KEYS.TEAM_MEMBERS, []);
  },

  getActive: (): LocalTeamMember[] => {
    return localTeamMembers.getAll().filter(m => m.is_active);
  },

  add: (name: string, isHod: boolean = false): { member: LocalTeamMember | null; error: string | null } => {
    const members = localTeamMembers.getAll();
    
    if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      return { member: null, error: 'Member already exists' };
    }

    const email = `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    const newMember: LocalTeamMember = {
      id: generateId(),
      name: name.trim(),
      email,
      is_active: true,
      is_hod: isHod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    members.push(newMember);
    setItem(STORAGE_KEYS.TEAM_MEMBERS, members);
    notify('teamMembers');
    return { member: newMember, error: null };
  },

  update: (id: string, updates: Partial<Pick<LocalTeamMember, 'name' | 'is_active' | 'is_hod'>>): { error: string | null } => {
    const members = localTeamMembers.getAll();
    const index = members.findIndex(m => m.id === id);
    
    if (index === -1) {
      return { error: 'Member not found' };
    }

    if (updates.name) {
      const duplicate = members.find(m => m.id !== id && m.name.toLowerCase() === updates.name!.toLowerCase());
      if (duplicate) {
        return { error: 'Member with this name already exists' };
      }
      members[index].email = `${updates.name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    }

    members[index] = { ...members[index], ...updates, updated_at: new Date().toISOString() };
    setItem(STORAGE_KEYS.TEAM_MEMBERS, members);
    notify('teamMembers');
    return { error: null };
  },

  delete: (id: string): { error: string | null } => {
    const members = localTeamMembers.getAll();
    const filtered = members.filter(m => m.id !== id);
    setItem(STORAGE_KEYS.TEAM_MEMBERS, filtered);
    notify('teamMembers');
    return { error: null };
  },

  subscribe: (listener: Listener) => subscribe('teamMembers', listener)
};

// ============= USER ROLES =============
export const localUserRoles = {
  getAll: (): LocalUserRole[] => {
    return getItem<LocalUserRole[]>(STORAGE_KEYS.USER_ROLES, []);
  },

  getByUserId: (userId: string): LocalUserRole | null => {
    return localUserRoles.getAll().find(r => r.user_id === userId) || null;
  },

  update: (userId: string, role: 'hod' | 'team_member'): { error: string | null } => {
    const roles = localUserRoles.getAll();
    const index = roles.findIndex(r => r.user_id === userId);
    
    if (index === -1) {
      return { error: 'User role not found' };
    }

    roles[index].role = role;
    roles[index].updated_at = new Date().toISOString();
    setItem(STORAGE_KEYS.USER_ROLES, roles);
    notify('userRoles');
    return { error: null };
  },

  isHOD: (userId: string): boolean => {
    const role = localUserRoles.getByUserId(userId);
    return role?.role === 'hod';
  },

  subscribe: (listener: Listener) => subscribe('userRoles', listener)
};

// ============= TASKS =============
export const localTasks = {
  getAll: (): Task[] => {
    return getItem<Task[]>(STORAGE_KEYS.TASKS, []);
  },

  add: (task: Omit<Task, 'id' | 'updated_at'>): { task: Task | null; error: string | null } => {
    const tasks = localTasks.getAll();
    const newTask: Task = {
      ...task,
      id: generateId(),
      updated_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    setItem(STORAGE_KEYS.TASKS, tasks);
    notify('tasks');
    return { task: newTask, error: null };
  },

  update: (id: string, updates: Partial<Task>): { error: string | null } => {
    const tasks = localTasks.getAll();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return { error: 'Task not found' };
    }

    tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
    setItem(STORAGE_KEYS.TASKS, tasks);
    notify('tasks');
    return { error: null };
  },

  delete: (id: string): { error: string | null } => {
    const tasks = localTasks.getAll();
    const filtered = tasks.filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TASKS, filtered);
    notify('tasks');
    return { error: null };
  },

  subscribe: (listener: Listener) => subscribe('tasks', listener)
};

// ============= NOTIFICATIONS =============
export const localNotifications = {
  getByUserId: (userId: string): LocalNotification[] => {
    return getItem<LocalNotification[]>(STORAGE_KEYS.NOTIFICATIONS, [])
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  add: (notification: Omit<LocalNotification, 'id' | 'created_at' | 'read'>): void => {
    const notifications = getItem<LocalNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifications.unshift({
      ...notification,
      id: generateId(),
      read: false,
      created_at: new Date().toISOString()
    });
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    notify('notifications');
  },

  markAsRead: (id: string): void => {
    const notifications = getItem<LocalNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
      notify('notifications');
    }
  },

  markAllAsRead: (userId: string): void => {
    const notifications = getItem<LocalNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifications.forEach(n => {
      if (n.user_id === userId) n.read = true;
    });
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    notify('notifications');
  },

  subscribe: (listener: Listener) => subscribe('notifications', listener)
};

// Initialize with default team members if empty
export const initializeDefaultData = () => {
  const members = localTeamMembers.getAll();
  if (members.length === 0) {
    const defaultMembers = [
      { name: 'Hariharan', is_hod: true },
      { name: 'Ramesh', is_hod: false },
      { name: 'Suresh', is_hod: false },
      { name: 'Ganesh', is_hod: false },
      { name: 'Mahesh', is_hod: false }
    ];
    
    defaultMembers.forEach(m => {
      localTeamMembers.add(m.name, m.is_hod);
    });
  }
};
