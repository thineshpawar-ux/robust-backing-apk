import { useEffect, useState, useCallback } from 'react';
import { Notification } from '@/types/task';

const NOTIFICATIONS_KEY = 'sqtodo_notifications';

function getStoredNotifications(): Notification[] {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(() => {
    if (!userId) return;
    
    const allNotifications = getStoredNotifications();
    const userNotifications = allNotifications
      .filter(n => n.user_id === userId)
      .slice(0, 20);

    setNotifications(userNotifications);
    setUnreadCount(userNotifications.filter(n => !n.read).length);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    // Listen for storage events (cross-tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === NOTIFICATIONS_KEY) {
        fetchNotifications();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Poll for updates (for same-tab updates from task operations)
    const interval = setInterval(fetchNotifications, 2000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    const allNotifications = getStoredNotifications();
    const updated = allNotifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const allNotifications = getStoredNotifications();
    const updated = allNotifications.map(n => 
      n.user_id === userId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
