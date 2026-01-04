# Firebase Realtime Database Integration Guide

This guide shows how to replace the `localStorage` implementation with Firebase Realtime Database.

## Task Delete Password
**Password: `SQADMIN`**

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the steps
3. Once created, go to "Realtime Database" → "Create Database"
4. Choose "Start in test mode" for development
5. Go to Project Settings → General → Your apps → Add Web App
6. Copy the config values

## Step 2: Install Firebase

```bash
npm install firebase
```

## Step 3: Create Firebase Config

Create `src/lib/firebaseConfig.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```

## Step 4: Replace localStorage.ts

Replace `src/lib/localStorage.ts` with Firebase version. Here are the key changes:

### Import Firebase

```typescript
import { ref, set, get, remove, update, onValue, off } from 'firebase/database';
import { db } from './firebaseConfig';
```

### Helper Functions

```typescript
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const snapshotToArray = <T>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ ...data[key], id: key }));
};
```

### Replace Team Members (Example)

**Before (localStorage):**
```typescript
export const localTeamMembers = {
  getAll: (): LocalTeamMember[] => {
    return getItem<LocalTeamMember[]>(STORAGE_KEYS.TEAM_MEMBERS, []);
  },
  add: (name: string, isHod: boolean = false) => {
    const members = localTeamMembers.getAll();
    // ... sync code
  }
};
```

**After (Firebase):**
```typescript
export const localTeamMembers = {
  getAll: async (): Promise<LocalTeamMember[]> => {
    const snapshot = await get(ref(db, 'team_members'));
    return snapshotToArray<LocalTeamMember>(snapshot);
  },
  add: async (name: string, isHod: boolean = false) => {
    const members = await localTeamMembers.getAll();
    // ... same logic but async
    await set(ref(db, `team_members/${id}`), newMember);
  }
};
```

## Step 5: Update Hooks to be Async

### useTasks.ts Changes

```typescript
// Before
const fetchTasks = useCallback(() => {
  const allTasks = localTasks.getAll();
  setTasks(allTasks);
}, []);

// After
const fetchTasks = useCallback(async () => {
  const allTasks = await localTasks.getAll();
  setTasks(allTasks);
}, []);
```

### useTeamMembers.ts Changes

```typescript
// Before
const fetchTeamMembers = () => {
  const members = localTeamMembers.getAll();
  setTeamMembers(members);
};

// After
const fetchTeamMembers = async () => {
  const members = await localTeamMembers.getAll();
  setTeamMembers(members);
};
```

## Step 6: Firebase Realtime Listeners

For real-time updates, use `onValue`:

```typescript
useEffect(() => {
  const membersRef = ref(db, 'team_members');
  
  const unsubscribe = onValue(membersRef, (snapshot) => {
    const members = snapshotToArray<LocalTeamMember>(snapshot);
    setTeamMembers(members);
  });
  
  return () => off(membersRef);
}, []);
```

## Step 7: Firebase Security Rules

For production, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "team_members": {
      ".read": true,
      ".write": true
    },
    "user_roles": {
      ".read": true,
      ".write": true
    },
    "tasks": {
      ".read": true,
      ".write": true
    },
    "notifications": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Complete Firebase localStorage.ts

Here's the complete Firebase version of `localStorage.ts`:

```typescript
// Firebase Storage Service - Replaces localStorage

import { ref, set, get, remove, update, onValue, off } from 'firebase/database';
import { db } from './firebaseConfig';
import { Task } from '@/types/task';

const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const snapshotToArray = <T>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ ...data[key], id: key }));
};

// Types
export interface LocalUser {
  id: string;
  email: string;
  name: string;
  password: string;
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

// Current user in sessionStorage
const CURRENT_USER_KEY = 'sq_current_user';

// Event system
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

// ============= AUTH =============
export const localAuth = {
  getCurrentUser: (): LocalUser | null => {
    try {
      const item = sessionStorage.getItem(CURRENT_USER_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser: (user: LocalUser | null): void => {
    if (user) {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    }
    notify('auth');
  },

  getAllUsers: async (): Promise<LocalUser[]> => {
    const snapshot = await get(ref(db, 'users'));
    return snapshotToArray<LocalUser>(snapshot);
  },

  signUp: async (name: string, password: string, securityAnswer?: string): Promise<{ user: LocalUser | null; error: string | null }> => {
    const users = await localAuth.getAllUsers();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    
    if (users.find(u => u.email === email)) {
      return { user: null, error: 'User already exists' };
    }

    const id = generateId();
    const newUser: LocalUser = {
      id,
      email,
      name,
      password,
      securityAnswer: securityAnswer?.toLowerCase().trim(),
      created_at: new Date().toISOString()
    };

    await set(ref(db, `users/${id}`), newUser);

    // Get team members to check HOD status
    const teamSnapshot = await get(ref(db, 'team_members'));
    const teamMembers = snapshotToArray<LocalTeamMember>(teamSnapshot);
    const member = teamMembers.find(m => m.name.toLowerCase() === name.toLowerCase());
    
    // Create user role
    const roleId = generateId();
    const newRole: LocalUserRole = {
      id: roleId,
      user_id: id,
      user_email: email,
      role: member?.is_hod ? 'hod' : 'team_member',
      security_answer: securityAnswer?.toLowerCase().trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await set(ref(db, `user_roles/${roleId}`), newRole);

    localAuth.setCurrentUser(newUser);
    notify('userRoles');
    return { user: newUser, error: null };
  },

  signIn: async (name: string, password: string): Promise<{ user: LocalUser | null; error: string | null }> => {
    const users = await localAuth.getAllUsers();
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

  updatePassword: async (userId: string, newPassword: string): Promise<{ error: string | null }> => {
    try {
      await update(ref(db, `users/${userId}`), { password: newPassword });
      
      const currentUser = localAuth.getCurrentUser();
      if (currentUser?.id === userId) {
        localAuth.setCurrentUser({ ...currentUser, password: newPassword });
      }
      
      return { error: null };
    } catch {
      return { error: 'Failed to update password' };
    }
  },

  verifySecurityAnswer: async (email: string, answer: string): Promise<{ valid: boolean; userId?: string }> => {
    const snapshot = await get(ref(db, 'user_roles'));
    const roles = snapshotToArray<LocalUserRole>(snapshot);
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
  getAll: async (): Promise<LocalTeamMember[]> => {
    const snapshot = await get(ref(db, 'team_members'));
    return snapshotToArray<LocalTeamMember>(snapshot);
  },

  getActive: async (): Promise<LocalTeamMember[]> => {
    const members = await localTeamMembers.getAll();
    return members.filter(m => m.is_active);
  },

  add: async (name: string, isHod: boolean = false): Promise<{ member: LocalTeamMember | null; error: string | null }> => {
    const members = await localTeamMembers.getAll();
    
    if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      return { member: null, error: 'Member already exists' };
    }

    const id = generateId();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
    const newMember: LocalTeamMember = {
      id,
      name: name.trim(),
      email,
      is_active: true,
      is_hod: isHod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await set(ref(db, `team_members/${id}`), newMember);
    notify('teamMembers');
    return { member: newMember, error: null };
  },

  update: async (id: string, updates: Partial<Pick<LocalTeamMember, 'name' | 'is_active' | 'is_hod'>>): Promise<{ error: string | null }> => {
    try {
      const members = await localTeamMembers.getAll();
      const member = members.find(m => m.id === id);
      
      if (!member) return { error: 'Member not found' };

      if (updates.name) {
        const duplicate = members.find(m => m.id !== id && m.name.toLowerCase() === updates.name!.toLowerCase());
        if (duplicate) return { error: 'Member with this name already exists' };
      }

      const updateData: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      if (updates.name) {
        updateData.email = `${updates.name.toLowerCase().replace(/\s+/g, '')}@sqtodo.local`;
      }

      await update(ref(db, `team_members/${id}`), updateData);
      notify('teamMembers');
      return { error: null };
    } catch {
      return { error: 'Failed to update member' };
    }
  },

  delete: async (id: string): Promise<{ error: string | null }> => {
    try {
      await remove(ref(db, `team_members/${id}`));
      notify('teamMembers');
      return { error: null };
    } catch {
      return { error: 'Failed to delete member' };
    }
  },

  subscribe: (listener: Listener) => subscribe('teamMembers', listener)
};

// ============= USER ROLES =============
export const localUserRoles = {
  getAll: async (): Promise<LocalUserRole[]> => {
    const snapshot = await get(ref(db, 'user_roles'));
    return snapshotToArray<LocalUserRole>(snapshot);
  },

  getByUserId: async (userId: string): Promise<LocalUserRole | null> => {
    const roles = await localUserRoles.getAll();
    return roles.find(r => r.user_id === userId) || null;
  },

  update: async (userId: string, role: 'hod' | 'team_member'): Promise<{ error: string | null }> => {
    try {
      const roles = await localUserRoles.getAll();
      const userRole = roles.find(r => r.user_id === userId);
      
      if (!userRole) return { error: 'User role not found' };

      await update(ref(db, `user_roles/${userRole.id}`), {
        role,
        updated_at: new Date().toISOString()
      });
      notify('userRoles');
      return { error: null };
    } catch {
      return { error: 'Failed to update role' };
    }
  },

  isHOD: async (userId: string): Promise<boolean> => {
    const role = await localUserRoles.getByUserId(userId);
    return role?.role === 'hod';
  },

  subscribe: (listener: Listener) => subscribe('userRoles', listener)
};

// ============= TASKS =============
export const localTasks = {
  getAll: async (): Promise<Task[]> => {
    const snapshot = await get(ref(db, 'tasks'));
    return snapshotToArray<Task>(snapshot);
  },

  add: async (task: Omit<Task, 'id' | 'updated_at'>): Promise<{ task: Task | null; error: string | null }> => {
    try {
      const id = generateId();
      const newTask: Task = {
        ...task,
        id,
        updated_at: new Date().toISOString()
      };
      await set(ref(db, `tasks/${id}`), newTask);
      notify('tasks');
      return { task: newTask, error: null };
    } catch {
      return { task: null, error: 'Failed to add task' };
    }
  },

  update: async (id: string, updates: Partial<Task>): Promise<{ error: string | null }> => {
    try {
      await update(ref(db, `tasks/${id}`), {
        ...updates,
        updated_at: new Date().toISOString()
      });
      notify('tasks');
      return { error: null };
    } catch {
      return { error: 'Failed to update task' };
    }
  },

  delete: async (id: string): Promise<{ error: string | null }> => {
    try {
      await remove(ref(db, `tasks/${id}`));
      notify('tasks');
      return { error: null };
    } catch {
      return { error: 'Failed to delete task' };
    }
  },

  subscribe: (listener: Listener) => subscribe('tasks', listener)
};

// ============= NOTIFICATIONS =============
export const localNotifications = {
  getByUserId: async (userId: string): Promise<LocalNotification[]> => {
    const snapshot = await get(ref(db, 'notifications'));
    const notifications = snapshotToArray<LocalNotification>(snapshot);
    return notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  add: async (notification: Omit<LocalNotification, 'id' | 'created_at' | 'read'>): Promise<void> => {
    const id = generateId();
    await set(ref(db, `notifications/${id}`), {
      ...notification,
      id,
      read: false,
      created_at: new Date().toISOString()
    });
    notify('notifications');
  },

  markAsRead: async (id: string): Promise<void> => {
    await update(ref(db, `notifications/${id}`), { read: true });
    notify('notifications');
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    const notifications = await localNotifications.getByUserId(userId);
    for (const n of notifications) {
      if (!n.read) {
        await update(ref(db, `notifications/${n.id}`), { read: true });
      }
    }
    notify('notifications');
  },

  subscribe: (listener: Listener) => subscribe('notifications', listener)
};

// Initialize default data
export const initializeDefaultData = async () => {
  const members = await localTeamMembers.getAll();
  if (members.length === 0) {
    const defaultMembers = [
      { name: 'Hariharan', is_hod: true },
      { name: 'Ramesh', is_hod: false },
      { name: 'Suresh', is_hod: false },
      { name: 'Ganesh', is_hod: false },
      { name: 'Mahesh', is_hod: false }
    ];
    
    for (const m of defaultMembers) {
      await localTeamMembers.add(m.name, m.is_hod);
    }
  }
};
```

## Notes

1. **Current App**: The app currently uses `localStorage` and works offline
2. **Firebase Free Tier**: Firebase Realtime Database free tier includes 1GB storage and 10GB/month transfer
3. **Delete Password**: `SQADMIN` (same as original)
4. **Export to GitHub**: Push to GitHub and clone locally to set up Firebase
