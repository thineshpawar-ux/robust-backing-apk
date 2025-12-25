import { useEffect, useState, useCallback } from 'react';
import { localNotifications, LocalNotification } from '@/lib/localStorage';
import { Notification } from '@/types/task';

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(() => {
    if (!userId) return;
    
    const data = localNotifications.getByUserId(userId);
    
    const mapped: Notification[] = data.map(n => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      task_id: n.task_id || null,
      created_at: n.created_at
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter(n => !n.read).length);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to changes
    const unsubscribe = localNotifications.subscribe(() => {
      fetchNotifications();
    });

    return () => unsubscribe();
  }, [userId, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    localNotifications.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    localNotifications.markAllAsRead(userId);
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
