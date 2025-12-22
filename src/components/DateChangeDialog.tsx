import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DateChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: string;
  onSubmit: (newDate: string, reason: string) => void;
}

export function DateChangeDialog({ 
  open, 
  onOpenChange, 
  currentDate, 
  onSubmit 
}: DateChangeDialogProps) {
  const [newDate, setNewDate] = useState(currentDate);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !reason.trim()) return;
    
    setSubmitting(true);
    try {
      await onSubmit(newDate, reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason('');
      setNewDate(currentDate);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Request date change</DialogTitle>
          <DialogDescription>
            Date changes require HOD approval. Provide a reason for the change.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current" className="text-xs text-muted-foreground">
              Current target date
            </Label>
            <Input
              id="current"
              type="date"
              value={currentDate}
              disabled
              className="h-9 bg-muted"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="new-date" className="text-xs text-muted-foreground">
              New target date *
            </Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs text-muted-foreground">
              Reason for change *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this date change is needed..."
              required
              className="min-h-[80px] resize-y"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !reason.trim() || newDate === currentDate}
            >
              Submit for approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
