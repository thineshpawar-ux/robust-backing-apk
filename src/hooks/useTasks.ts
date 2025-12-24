import { useEffect, useState, useCallback } from 'react';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

const TASKS_KEY = 'sqtodo_tasks';

function getStoredTasks(): Task[] {
  const stored = localStorage.getItem(TASKS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true); // Always connected in localStorage mode
  const { toast } = useToast();

  const fetchTasks = useCallback(() => {
    const storedTasks = getStoredTasks();
    setTasks(storedTasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    
    // Listen for storage events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TASKS_KEY) {
        fetchTasks();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'updated_at'>) => {
    try {
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        updated_at: new Date().toISOString()
      };
      
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      toast({
        title: 'New task',
        description: `Task created for ${newTask.owner}`,
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding task:', error);
      return { success: false, error };
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTasks = tasks.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      toast({
        title: 'Task updated',
        description: 'Changes saved successfully',
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const updatedTasks = tasks.filter(t => t.id !== id);
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      toast({
        title: 'Task deleted',
        description: 'Task has been removed',
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error };
    }
  };

  const requestDateChange = async (taskId: string, newDate: string, reason: string) => {
    try {
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          date_change_pending: true,
          date_change_requested_date: newDate,
          date_change_reason: reason,
          updated_at: new Date().toISOString()
        } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      toast({
        title: 'Date change requested',
        description: 'Waiting for HOD approval',
      });
      return { success: true };
    } catch (error) {
      console.error('Error requesting date change:', error);
      return { success: false, error };
    }
  };

  const requestClosure = async (taskId: string, comment: string, requestedBy: string) => {
    try {
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          closure_pending: true,
          closure_comment: comment,
          closure_requested_by: requestedBy,
          updated_at: new Date().toISOString()
        } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      toast({
        title: 'Closure requested',
        description: 'Waiting for HOD approval',
      });
      return { success: true };
    } catch (error) {
      console.error('Error requesting closure:', error);
      return { success: false, error };
    }
  };

  const approveClosure = async (taskId: string, approvedBy: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return { success: false };

      let updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          status: 'closed' as const,
          completed_at: new Date().toISOString().split('T')[0],
          closure_pending: false,
          closure_approved_by: approvedBy,
          closure_rejection_comment: null,
          updated_at: new Date().toISOString()
        } : t
      );

      // Check if this task has a parent that's waiting for subtasks
      if (task.parent_task_id) {
        const siblingSubtasks = updatedTasks.filter(t => 
          t.parent_task_id === task.parent_task_id && t.id !== taskId
        );
        const allSubtasksClosed = siblingSubtasks.every(t => t.status === 'closed');
        
        if (allSubtasksClosed) {
          updatedTasks = updatedTasks.map(t => 
            t.id === task.parent_task_id ? {
              ...t,
              status: 'closed' as const,
              completed_at: new Date().toISOString().split('T')[0],
              waiting_for_subtask: false,
              updated_at: new Date().toISOString()
            } : t
          );
          
          toast({
            title: 'Parent task auto-closed',
            description: 'All subtasks completed, parent task is now closed',
          });
        }
      }

      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      // Add notification
      addNotification(task.owner, 'Task Closure Approved', 
        `Your closure request for "${task.title}" has been approved.`, 'success', taskId);
      
      toast({
        title: 'Closure approved',
        description: 'Task has been closed',
      });
      return { success: true };
    } catch (error) {
      console.error('Error approving closure:', error);
      return { success: false, error };
    }
  };

  const rejectClosure = async (taskId: string, rejectionComment: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          closure_pending: false,
          closure_comment: null,
          closure_requested_by: null,
          closure_rejection_comment: rejectionComment,
          updated_at: new Date().toISOString()
        } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);

      if (task) {
        addNotification(task.owner, 'Task Closure Rejected', 
          `Your closure request for "${task.title}" has been rejected. Reason: ${rejectionComment}`, 'warning', taskId);
      }
      
      toast({
        title: 'Closure rejected',
        description: 'Request has been declined with comment',
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting closure:', error);
      return { success: false, error };
    }
  };

  const approveDateChange = async (taskId: string, approvedBy: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.date_change_requested_date) return { success: false };

      const newHistory = [...(task.target_date_history || []), task.date_change_requested_date];

      const updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          current_target_date: task.date_change_requested_date!,
          target_date_history: newHistory,
          date_change_pending: false,
          date_change_requested_date: null,
          date_change_reason: null,
          date_change_approved_by: approvedBy,
          updated_at: new Date().toISOString()
        } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);

      addNotification(task.owner, 'Date Change Approved', 
        `Your date change request for "${task.title}" has been approved. New target date: ${task.date_change_requested_date}`, 'success', taskId);
      
      toast({
        title: 'Date change approved',
        description: `New target date: ${task.date_change_requested_date}`,
      });
      return { success: true };
    } catch (error) {
      console.error('Error approving date change:', error);
      return { success: false, error };
    }
  };

  const rejectDateChange = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? {
          ...t,
          date_change_pending: false,
          date_change_requested_date: null,
          date_change_reason: null,
          updated_at: new Date().toISOString()
        } : t
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);

      if (task) {
        addNotification(task.owner, 'Date Change Rejected', 
          `Your date change request for "${task.title}" has been rejected.`, 'warning', taskId);
      }
      
      toast({
        title: 'Date change rejected',
        description: 'Request has been declined',
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting date change:', error);
      return { success: false, error };
    }
  };

  return {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
    deleteTask,
    requestDateChange,
    requestClosure,
    approveClosure,
    rejectClosure,
    approveDateChange,
    rejectDateChange
  };
}

// Helper to add notifications (used by task operations)
const NOTIFICATIONS_KEY = 'sqtodo_notifications';

function addNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning', taskId: string) {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  const notifications = stored ? JSON.parse(stored) : [];
  notifications.unshift({
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    message,
    type,
    read: false,
    task_id: taskId,
    created_at: new Date().toISOString()
  });
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 100))); // Keep last 100
}
