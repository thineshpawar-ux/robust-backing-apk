import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskFormData, TEAM_MEMBERS } from '@/types/task';
import { todayISO } from '@/lib/date-utils';

interface TaskFormProps {
  editingTask: Task | null;
  onSubmit: (data: TaskFormData, editingId: string | null) => Promise<void>;
  onReset: () => void;
  taskCount: number;
}

export function TaskForm({ editingTask, onSubmit, onReset, taskCount }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    owner: '',
    notes: '',
    status: 'open',
    current_target_date: todayISO()
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        owner: editingTask.owner,
        notes: editingTask.notes || '',
        status: editingTask.status,
        current_target_date: editingTask.current_target_date
      });
    }
  }, [editingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.owner || !formData.current_target_date) return;
    
    setSubmitting(true);
    try {
      await onSubmit(formData, editingTask?.id || null);
      handleReset();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      owner: '',
      notes: '',
      status: 'open',
      current_target_date: todayISO()
    });
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs text-muted-foreground">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            className="h-9"
            placeholder="Enter task title"
          />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="owner" className="text-xs text-muted-foreground">Owner *</Label>
          <Select
            value={formData.owner}
            onValueChange={(value) => setFormData(prev => ({ ...prev, owner: value }))}
            required
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_MEMBERS.map(member => (
                <SelectItem key={member} value={member}>{member}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="target" className="text-xs text-muted-foreground">Target date *</Label>
          <Input
            id="target"
            type="date"
            value={formData.current_target_date}
            onChange={(e) => setFormData(prev => ({ ...prev, current_target_date: e.target.value }))}
            required
            className="h-9"
          />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: 'open' | 'closed') => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="min-h-[60px] resize-y"
            placeholder="Add any additional notes..."
          />
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting} className="rounded-full">
          {editingTask ? 'Save changes' : 'Add task'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} className="rounded-full">
          Reset
        </Button>
        <span className="text-sm text-muted-foreground">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>
      </div>
    </form>
  );
}
