import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskForm } from './TaskForm';
import { TaskFilters } from './TaskFilters';
import { TaskList } from './TaskList';
import { Task, TaskFormData } from '@/types/task';
import { todayISO } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';

interface TeamViewProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'updated_at'>) => Promise<{ success: boolean }>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean }>;
  onDeleteTask: (id: string) => Promise<{ success: boolean }>;
  onToggleStatus: (task: Task) => Promise<{ success: boolean }>;
}

export function TeamView({ tasks, onAddTask, onUpdateTask, onDeleteTask, onToggleStatus }: TeamViewProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  const handleSubmit = async (data: TaskFormData, editingId: string | null) => {
    if (editingId) {
      const existing = tasks.find(t => t.id === editingId);
      if (!existing) return;

      const hist = [...(existing.target_date_history || [])];
      let dateChanged = false;
      
      if (existing.current_target_date !== data.current_target_date) {
        hist.push(data.current_target_date);
        dateChanged = true;
      }

      const result = await onUpdateTask(editingId, {
        title: data.title,
        owner: data.owner,
        notes: data.notes || null,
        status: data.status,
        current_target_date: data.current_target_date,
        target_date_history: hist,
        completed_at: data.status === 'closed' 
          ? (existing.completed_at || todayISO()) 
          : null
      });

      if (result.success && dateChanged) {
        toast({
          title: 'Target date changed',
          description: `${data.owner}: date ${existing.current_target_date} → ${data.current_target_date}`,
        });
      }
    } else {
      const today = todayISO();
      await onAddTask({
        title: data.title,
        owner: data.owner,
        notes: data.notes || null,
        status: data.status,
        created_at: today,
        current_target_date: data.current_target_date,
        target_date_history: [data.current_target_date],
        completed_at: data.status === 'closed' ? today : null
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (task: Task) => {
    await onDeleteTask(task.id);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Team tasks</CardTitle>
        <CardDescription>Single list for all supplier quality work.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOwner={filterOwner}
          onOwnerChange={setFilterOwner}
          filterStatus={filterStatus}
          onStatusChange={setFilterStatus}
        />
        
        <TaskForm
          editingTask={editingTask}
          onSubmit={handleSubmit}
          onReset={() => setEditingTask(null)}
          taskCount={tasks.length}
        />
        
        <TaskList
          tasks={tasks}
          searchQuery={searchQuery}
          filterOwner={filterOwner}
          filterStatus={filterStatus}
          onEdit={handleEdit}
          onToggleStatus={onToggleStatus}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
