import { useEffect, useState, useCallback } from 'react';
import { localTasks, localNotifications } from '@/lib/localStorage';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true); // Always connected in offline mode
  const { toast } = useToast();

  const fetchTasks = useCallback(() => {
    const allTasks = localTasks.getAll();
    setTasks(allTasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();

    // Subscribe to changes
    const unsubscribe = localTasks.subscribe(() => {
      fetchTasks();
    });

    return () => unsubscribe();
  }, [fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'updated_at'>) => {
    const { task: newTask, error } = localTasks.add(task);
    
    if (error) {
      console.error('Error adding task:', error);
      return { success: false, error };
    }
    
    toast({
      title: 'New task',
      description: `Task created for ${task.owner}`,
    });
    return { success: true };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = localTasks.update(id, updates);
    
    if (error) {
      console.error('Error updating task:', error);
      return { success: false, error };
    }
    
    toast({
      title: 'Task updated',
      description: 'Changes saved successfully',
    });
    return { success: true };
  };

  const deleteTask = async (id: string) => {
    const { error } = localTasks.delete(id);
    
    if (error) {
      console.error('Error deleting task:', error);
      return { success: false, error };
    }
    
    toast({
      title: 'Task deleted',
      description: 'Task has been removed',
    });
    return { success: true };
  };

  const requestDateChange = async (taskId: string, newDate: string, reason: string) => {
    const { error } = localTasks.update(taskId, {
      date_change_pending: true,
      date_change_requested_date: newDate,
      date_change_reason: reason
    });
    
    if (error) {
      console.error('Error requesting date change:', error);
      return { success: false, error };
    }
    
    toast({
      title: 'Date change requested',
      description: 'Waiting for HOD approval',
    });
    return { success: true };
  };

  const requestClosure = async (taskId: string, comment: string, requestedBy: string) => {
    const { error } = localTasks.update(taskId, {
      closure_pending: true,
      closure_comment: comment,
      closure_requested_by: requestedBy
    });
    
    if (error) {
      console.error('Error requesting closure:', error);
      return { success: false, error };
    }
    
    toast({
      title: 'Closure requested',
      description: 'Waiting for HOD approval',
    });
    return { success: true };
  };

  const approveClosure = async (taskId: string, approvedBy: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false };

    const { error } = localTasks.update(taskId, {
      status: 'closed',
      completed_at: new Date().toISOString().split('T')[0],
      closure_pending: false,
      closure_approved_by: approvedBy,
      closure_rejection_comment: null
    });

    if (error) {
      console.error('Error approving closure:', error);
      return { success: false, error };
    }

    // Check if this task has a parent that's waiting for subtasks
    if (task.parent_task_id) {
      const allTasks = localTasks.getAll();
      const siblingSubtasks = allTasks.filter(t => 
        t.parent_task_id === task.parent_task_id && t.id !== taskId
      );
      const allSubtasksClosed = siblingSubtasks.every(t => t.status === 'closed');
      
      if (allSubtasksClosed) {
        localTasks.update(task.parent_task_id, {
          status: 'closed',
          completed_at: new Date().toISOString().split('T')[0],
          waiting_for_subtask: false
        });
        
        toast({
          title: 'Parent task auto-closed',
          description: 'All subtasks completed, parent task is now closed',
        });
      }
    }

    // Create notification for task owner
    localNotifications.add({
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
  };

  const rejectClosure = async (taskId: string, rejectionComment: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    const { error } = localTasks.update(taskId, {
      closure_pending: false,
      closure_comment: null,
      closure_requested_by: null,
      closure_rejection_comment: rejectionComment
    });

    if (error) {
      console.error('Error rejecting closure:', error);
      return { success: false, error };
    }

    // Create notification for task owner
    if (task) {
      localNotifications.add({
        user_id: task.owner,
        title: 'Task Closure Rejected',
        message: `Your closure request for "${task.title}" has been rejected. Reason: ${rejectionComment}`,
        type: 'warning',
        task_id: taskId
      });
    }
    
    toast({
      title: 'Closure rejected',
      description: 'Request has been declined with comment',
    });
    return { success: true };
  };

  const approveDateChange = async (taskId: string, approvedBy: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.date_change_requested_date) return { success: false };

    const newHistory = [...(task.target_date_history || []), task.date_change_requested_date];

    const { error } = localTasks.update(taskId, {
      current_target_date: task.date_change_requested_date,
      target_date_history: newHistory,
      date_change_pending: false,
      date_change_requested_date: null,
      date_change_reason: null,
      date_change_approved_by: approvedBy
    });

    if (error) {
      console.error('Error approving date change:', error);
      return { success: false, error };
    }

    // Create notification for task owner
    localNotifications.add({
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
  };

  const rejectDateChange = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    const { error } = localTasks.update(taskId, {
      date_change_pending: false,
      date_change_requested_date: null,
      date_change_reason: null
    });

    if (error) {
      console.error('Error rejecting date change:', error);
      return { success: false, error };
    }

    // Create notification for task owner
    if (task) {
      localNotifications.add({
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
