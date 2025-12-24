import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedTasks: Task[] = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        owner: t.owner,
        status: t.status as 'open' | 'closed',
        created_at: t.created_at,
        current_target_date: t.current_target_date,
        target_date_history: t.target_date_history || [],
        completed_at: t.completed_at,
        updated_at: t.updated_at,
        date_change_pending: t.date_change_pending || false,
        date_change_reason: t.date_change_reason,
        date_change_requested_date: t.date_change_requested_date,
        date_change_approved_by: t.date_change_approved_by,
        closure_pending: (t as any).closure_pending || false,
        closure_comment: (t as any).closure_comment,
        closure_requested_by: (t as any).closure_requested_by,
        closure_approved_by: (t as any).closure_approved_by,
        parent_task_id: (t as any).parent_task_id || null
      }));
      
      setTasks(mappedTasks);
      setConnected(true);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as any;
            const mappedTask: Task = {
              ...newTask,
              status: newTask.status as 'open' | 'closed',
              closure_pending: newTask.closure_pending || false,
              closure_comment: newTask.closure_comment,
              closure_requested_by: newTask.closure_requested_by,
              closure_approved_by: newTask.closure_approved_by,
              parent_task_id: newTask.parent_task_id || null
            };
            setTasks(prev => [mappedTask, ...prev]);
            toast({
              title: 'New task',
              description: `Task created for ${mappedTask.owner}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            const mappedTask: Task = {
              ...updated,
              status: updated.status as 'open' | 'closed',
              closure_pending: updated.closure_pending || false,
              closure_comment: updated.closure_comment,
              closure_requested_by: updated.closure_requested_by,
              closure_approved_by: updated.closure_approved_by,
              parent_task_id: updated.parent_task_id || null
            };
            setTasks(prev => prev.map(t => t.id === mappedTask.id ? mappedTask : t));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setTasks(prev => prev.filter(t => t.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, toast]);

  const addTask = async (task: Omit<Task, 'id' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('tasks').insert({
        title: task.title,
        owner: task.owner,
        status: task.status,
        created_at: task.created_at,
        current_target_date: task.current_target_date,
        target_date_history: task.target_date_history,
        completed_at: task.completed_at,
        closure_pending: task.closure_pending,
        closure_comment: task.closure_comment,
        closure_requested_by: task.closure_requested_by,
        closure_approved_by: task.closure_approved_by,
        parent_task_id: task.parent_task_id
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding task:', error);
      return { success: false, error };
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Task updated',
        description: `Changes saved successfully`,
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('tasks')
        .update({
          date_change_pending: true,
          date_change_requested_date: newDate,
          date_change_reason: reason
        })
        .eq('id', taskId);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('tasks')
        .update({
          closure_pending: true,
          closure_comment: comment,
          closure_requested_by: requestedBy
        })
        .eq('id', taskId);

      if (error) throw error;
      
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

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'closed',
          completed_at: new Date().toISOString().split('T')[0],
          closure_pending: false,
          closure_approved_by: approvedBy
        })
        .eq('id', taskId);

      if (error) throw error;

      // Create notification for task owner
      await supabase.from('notifications').insert({
        user_id: task.owner,
        title: 'Task Closure Approved',
        message: `Your closure request for "${task.title}" has been approved.`,
        type: 'success',
        task_id: taskId
      });
      
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

  const rejectClosure = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({
          closure_pending: false,
          closure_comment: null,
          closure_requested_by: null
        })
        .eq('id', taskId);

      if (error) throw error;

      // Create notification for task owner
      if (task) {
        await supabase.from('notifications').insert({
          user_id: task.owner,
          title: 'Task Closure Rejected',
          message: `Your closure request for "${task.title}" has been rejected.`,
          type: 'warning',
          task_id: taskId
        });
      }
      
      toast({
        title: 'Closure rejected',
        description: 'Request has been declined',
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

      const { error } = await supabase
        .from('tasks')
        .update({
          current_target_date: task.date_change_requested_date,
          target_date_history: newHistory,
          date_change_pending: false,
          date_change_requested_date: null,
          date_change_reason: null,
          date_change_approved_by: approvedBy
        })
        .eq('id', taskId);

      if (error) throw error;

      // Create notification for task owner
      await supabase.from('notifications').insert({
        user_id: task.owner,
        title: 'Date Change Approved',
        message: `Your date change request for "${task.title}" has been approved. New target date: ${task.date_change_requested_date}`,
        type: 'success',
        task_id: taskId
      });
      
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
      
      const { error } = await supabase
        .from('tasks')
        .update({
          date_change_pending: false,
          date_change_requested_date: null,
          date_change_reason: null
        })
        .eq('id', taskId);

      if (error) throw error;

      // Create notification for task owner
      if (task) {
        await supabase.from('notifications').insert({
          user_id: task.owner,
          title: 'Date Change Rejected',
          message: `Your date change request for "${task.title}" has been rejected.`,
          type: 'warning',
          task_id: taskId
        });
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