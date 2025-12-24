import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { DateChangeDialog } from './DateChangeDialog';
import { ClosureRequestDialog } from './ClosureRequestDialog';
import { Task, TaskFormData } from '@/types/task';
import { todayISO } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';

interface TeamViewProps {
  tasks: Task[];
  currentUser?: string;
  onAddTask: (task: Omit<Task, 'id' | 'updated_at'>) => Promise<{ success: boolean }>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean }>;
  onDeleteTask: (id: string) => Promise<{ success: boolean }>;
  onRequestDateChange: (taskId: string, newDate: string, reason: string) => Promise<{ success: boolean }>;
  onRequestClosure: (taskId: string, comment: string, requestedBy: string) => Promise<{ success: boolean }>;
}

export function TeamView({ 
  tasks,
  currentUser,
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  onRequestDateChange,
  onRequestClosure
}: TeamViewProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dateChangeTask, setDateChangeTask] = useState<Task | null>(null);
  const [closureTask, setClosureTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (data: TaskFormData, editingId: string | null) => {
    if (editingId) {
      const existing = tasks.find(t => t.id === editingId);
      if (!existing) return;

      // Check if date is being changed - require approval
      if (existing.current_target_date !== data.current_target_date) {
        setDateChangeTask({ ...existing, ...data } as Task);
        toast({
          title: 'Date change requires approval',
          description: 'Please provide a reason for the date change.',
        });
        return;
      }

      const result = await onUpdateTask(editingId, {
        title: data.title,
        owner: data.owner,
      });

      if (result.success) {
        setEditingTask(null);
      }
    } else {
      const today = todayISO();
      await onAddTask({
        title: data.title,
        owner: data.owner,
        status: data.status,
        created_at: today,
        current_target_date: data.current_target_date,
        target_date_history: [data.current_target_date],
        completed_at: data.status === 'closed' ? today : null,
        date_change_pending: false,
        date_change_reason: null,
        date_change_requested_date: null,
        date_change_approved_by: null,
        closure_pending: false,
        closure_comment: null,
        closure_requested_by: null,
        closure_approved_by: null,
        parent_task_id: null
      });
    }
  };

  const handleDateChangeSubmit = async (newDate: string, reason: string) => {
    if (!dateChangeTask) return;
    
    const result = await onRequestDateChange(dateChangeTask.id, newDate, reason);
    if (result.success) {
      setDateChangeTask(null);
      setEditingTask(null);
    }
  };

  const handleClosureSubmit = async (comment: string) => {
    if (!closureTask || !currentUser) return;
    
    const result = await onRequestClosure(closureTask.id, comment, currentUser);
    if (result.success) {
      setClosureTask(null);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (task: Task) => {
    await onDeleteTask(task.id);
  };

  const handleRequestClosure = (task: Task) => {
    setClosureTask(task);
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Team Tasks</CardTitle>
          <CardDescription>Single list for all supplier quality work.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TaskForm
            editingTask={editingTask}
            onSubmit={handleSubmit}
            onReset={() => setEditingTask(null)}
            taskCount={tasks.length}
          />
          
          <TaskList
            tasks={tasks}
            currentUser={currentUser}
            onEdit={handleEdit}
            onRequestClosure={handleRequestClosure}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <DateChangeDialog
        open={!!dateChangeTask}
        onOpenChange={(open) => !open && setDateChangeTask(null)}
        currentDate={dateChangeTask?.current_target_date || todayISO()}
        onSubmit={handleDateChangeSubmit}
      />

      <ClosureRequestDialog
        open={!!closureTask}
        onOpenChange={(open) => !open && setClosureTask(null)}
        taskTitle={closureTask?.title || ''}
        onSubmit={handleClosureSubmit}
      />
    </>
  );
}