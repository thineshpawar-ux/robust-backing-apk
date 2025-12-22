import { Task, DELETE_PASSWORD, TEAM_MEMBERS } from '@/types/task';
import { isOverdue } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskRowProps {
  task: Task;
  currentUser?: string;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskRow({ task, currentUser, onEdit, onToggleStatus, onDelete }: TaskRowProps) {
  const overdue = isOverdue(task.current_target_date, task.status);
  const dateChanges = (task.target_date_history?.length || 1) - 1;

  // Check if current user is the task owner (can close their own tasks)
  const isOwner = currentUser && task.owner.toLowerCase().includes(currentUser.toLowerCase());
  const canToggleStatus = isOwner;

  const handleDelete = () => {
    const pwd = prompt('Enter delete password to remove this task:');
    if (pwd !== DELETE_PASSWORD) {
      if (pwd !== null) alert('Wrong password');
      return;
    }
    onDelete(task);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 mb-2 animate-fade-in hover:shadow-sm transition-shadow">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="font-medium text-sm">{task.title}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
              {task.owner}
            </span>
          </div>
          
          {task.date_change_reason && task.date_change_pending && (
            <p className="text-xs text-muted-foreground line-clamp-2">Reason: {task.date_change_reason}</p>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            <span className="pill">Created {task.created_at}</span>
            <span className="pill">Target {task.current_target_date}</span>
            
            {task.date_change_pending && (
              <span className="pill bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Pending: {task.date_change_requested_date}
              </span>
            )}
            
            {overdue && (
              <span className="pill pill-overdue">Overdue</span>
            )}
            
            {dateChanges > 0 && (
              <span className="pill">Date changes ×{dateChanges}</span>
            )}
            
            {task.completed_at && (
              <span className="pill">Closed {task.completed_at}</span>
            )}
            
            <span className={cn(
              "pill",
              task.status === 'open' ? "pill-open" : "pill-closed"
            )}>
              {task.status === 'open' ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 sm:justify-end items-start">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleStatus(task)}
                    disabled={!canToggleStatus}
                    className="h-7 text-xs rounded-full"
                  >
                    {task.status === 'open' ? 'Close' : 'Reopen'}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canToggleStatus && (
                <TooltipContent>
                  <p>Only task owner can close/reopen</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(task)}
            className="h-7 text-xs rounded-full"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            className="h-7 text-xs rounded-full text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
