import { useEffect, useState } from 'react';

// LocalStorage-based user type
interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: 'hod' | 'team_member';
  securityAnswer?: string;
}

interface LocalSession {
  user: LocalUser;
  expiresAt: number;
}

const USERS_KEY = 'sqtodo_users';
const SESSION_KEY = 'sqtodo_session';

function getStoredUsers(): LocalUser[] {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getStoredSession(): LocalSession | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const session = JSON.parse(stored) as LocalSession;
  // Check if session expired
  if (session.expiresAt < Date.now()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

function saveSession(session: LocalSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const existingSession = getStoredSession();
    if (existingSession) {
      setSession(existingSession);
      setUser(existingSession.user);
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, name: string, securityAnswer: string, isHod: boolean = false) => {
    const users = getStoredUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return { error: { message: 'User already registered' } };
    }

    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      email,
      name,
      role: isHod ? 'hod' : 'team_member',
      securityAnswer: securityAnswer.toLowerCase().trim()
    };

    users.push(newUser);
    saveUsers(users);

    // Auto login after signup
    const newSession: LocalSession = {
      user: newUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    saveSession(newSession);
    setSession(newSession);
    setUser(newUser);

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const users = getStoredUsers();
    const foundUser = users.find(u => u.email === email);

    if (!foundUser) {
      return { error: { message: 'Invalid login credentials' } };
    }

    // For local storage, we just check if user exists (password stored separately would be needed for real security)
    // In this demo, any password works if user exists
    const newSession: LocalSession = {
      user: foundUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    saveSession(newSession);
    setSession(newSession);
    setUser(foundUser);

    return { error: null };
  };

  const signOut = async () => {
    saveSession(null);
    setSession(null);
    setUser(null);
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    // In localStorage mode, password is not stored (simplified)
    return { error: null };
  };

  const verifySecurityAnswer = (email: string, answer: string): boolean => {
    const users = getStoredUsers();
    const foundUser = users.find(u => u.email === email);
    if (!foundUser || !foundUser.securityAnswer) return false;
    return foundUser.securityAnswer === answer.toLowerCase().trim();
  };

  const updateUserRole = (userId: string, role: 'hod' | 'team_member') => {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      users[userIndex].role = role;
      saveUsers(users);
      // Update current session if it's the same user
      if (user?.id === userId) {
        const updatedUser = { ...user, role };
        setUser(updatedUser);
        if (session) {
          const updatedSession = { ...session, user: updatedUser };
          setSession(updatedSession);
          saveSession(updatedSession);
        }
      }
    }
  };

  const getAllUsers = (): LocalUser[] => {
    return getStoredUsers();
  };

  const deleteUser = (userId: string) => {
    const users = getStoredUsers().filter(u => u.id !== userId);
    saveUsers(users);
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
    verifySecurityAnswer,
    updateUserRole,
    getAllUsers,
    deleteUser
  };
}
