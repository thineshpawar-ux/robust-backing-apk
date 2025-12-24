import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { todayISO } from '@/lib/date-utils';

interface SubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTaskTitle: string;
  onSubmit: (title: string, owner: string, targetDate: string) => void;
}

export function SubtaskDialog({ open, onOpenChange, parentTaskTitle, onSubmit }: SubtaskDialogProps) {
  const { teamMembers, loading: membersLoading } = useTeamMembers();
  const activeMembers = teamMembers.filter(m => m.is_active && !m.is_hod);
  
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [targetDate, setTargetDate] = useState(todayISO());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !owner || !targetDate) return;
    
    onSubmit(title.trim(), owner, targetDate);
    setTitle('');
    setOwner('');
    setTargetDate(todayISO());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Subtask</DialogTitle>
          <DialogDescription>
            Add a subtask to: <span className="font-medium text-foreground">"{parentTaskTitle}"</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subtask-title">Subtask Title</Label>
            <Input
              id="subtask-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter subtask description..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subtask-owner">Assign To</Label>
            <Select value={owner} onValueChange={setOwner} required disabled={membersLoading}>
              <SelectTrigger id="subtask-owner">
                <SelectValue placeholder={membersLoading ? "Loading..." : "Select team member"} />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map(member => (
                  <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subtask-date">Target Date</Label>
            <Input
              id="subtask-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={todayISO()}
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !owner || !targetDate}>
              Add Subtask
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}