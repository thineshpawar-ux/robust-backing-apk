import { useEffect, useState, useCallback } from 'react';
import { localAuth, LocalUser } from '@/lib/localStorage';

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const currentUser = localAuth.getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Subscribe to auth changes
    const unsubscribe = localAuth.subscribeToAuth(() => {
      setUser(localAuth.getCurrentUser());
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, securityAnswer?: string) => {
    // Extract name from email format
    const name = email.replace('@sqtodo.local', '').replace(/([a-z])([A-Z])/g, '$1 $2');
    const { user, error } = localAuth.signUp(name, password, securityAnswer);
    return { error: error ? new Error(error) : null };
  }, []);

  const signUpWithName = useCallback(async (name: string, password: string, securityAnswer?: string) => {
    const { user, error } = localAuth.signUp(name, password, securityAnswer);
    return { error: error ? new Error(error) : null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Extract name from email format
    const name = email.replace('@sqtodo.local', '');
    const { user, error } = localAuth.signIn(name, password);
    return { error: error ? new Error(error) : null };
  }, []);

  const signInWithName = useCallback(async (name: string, password: string) => {
    const { user, error } = localAuth.signIn(name, password);
    return { error: error ? new Error(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    localAuth.signOut();
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }
    const { error } = localAuth.updatePassword(user.id, newPassword);
    return { error: error ? new Error(error) : null };
  }, [user]);

  return {
    user,
    session: user ? { user } : null, // Compatibility with old interface
    loading,
    signUp,
    signUpWithName,
    signIn,
    signInWithName,
    signOut,
    updatePassword
  };
}
