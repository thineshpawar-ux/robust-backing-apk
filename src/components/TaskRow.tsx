import { Task, DELETE_PASSWORD, TEAM_MEMBERS } from '@/types/task';
import { isOverdue } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle2, AlertTriangle, Hourglass, CornerDownRight } from 'lucide-react';

interface TaskRowProps {
  task: Task;
  currentUser?: string;
  onEdit: (task: Task) => void;
  onRequestClosure: (task: Task) => void;
  onDelete: (task: Task) => void;
  isSubtask?: boolean;
}

export function TaskRow({ task, currentUser, onEdit, onRequestClosure, onDelete, isSubtask }: TaskRowProps) {
  const overdue = isOverdue(task.current_target_date, task.status);
  const dateChanges = (task.target_date_history?.length || 1) - 1;

  // Any team member can request closure for open tasks
  const canRequestClosure = task.status === 'open' && !task.closure_pending;

  const handleDelete = () => {
    const pwd = prompt('Enter delete password to remove this task:');
    if (pwd !== DELETE_PASSWORD) {
      if (pwd !== null) alert('Wrong password');
      return;
    }
    onDelete(task);
  };

  const getStatusIcon = () => {
    if (task.closure_pending) return <Hourglass className="h-4 w-4 text-[hsl(var(--chart-3))]" />;
    if (task.status === 'closed') return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-2))]" />;
    if (overdue) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-[hsl(var(--chart-1))]" />;
  };

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 mb-3 animate-fade-in transition-all hover:shadow-md",
      task.closure_pending && "border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))/0.03]",
      overdue && !task.closure_pending && task.status === 'open' && "border-destructive/50 bg-destructive/5",
      task.status === 'closed' && "border-[hsl(var(--chart-2))]/30 bg-[hsl(var(--chart-2))]/5",
      isSubtask && "ml-8 border-l-4 border-l-primary/30"
    )}>
      <div className="flex items-start gap-4">
        {/* Subtask indicator */}
        {isSubtask && (
          <div className="flex-shrink-0 mt-1">
            <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">
              {isSubtask && <span className="text-muted-foreground mr-1">↳</span>}
              {task.title}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground font-medium">
              {task.owner}
            </span>
          </div>
          
          {/* Closure Comment if pending */}
          {task.closure_pending && task.closure_comment && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded italic">
              Closure comment: "{task.closure_comment}"
            </div>
          )}

          {/* Date Change Reason if pending */}
          {task.date_change_reason && task.date_change_pending && (
            <p className="text-xs text-muted-foreground">Reason: {task.date_change_reason}</p>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            <span className="pill">Created {task.created_at}</span>
            <span className="pill">Target {task.current_target_date}</span>
            
            {task.closure_pending && (
              <span className="pill bg-[hsl(var(--chart-3))/0.15] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))/0.3]">
                Pending HOD Approval
              </span>
            )}
            
            {task.date_change_pending && (
              <span className="pill bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Pending: {task.date_change_requested_date}
              </span>
            )}
            
            {overdue && !task.closure_pending && task.status === 'open' && (
              <span className="pill pill-overdue">Overdue</span>
            )}
            
            {dateChanges > 0 && (
              <span className="pill">Date changes ×{dateChanges}</span>
            )}
            
            {task.completed_at && (
              <span className="pill bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]">Closed {task.completed_at}</span>
            )}
            
            {task.closure_approved_by && (
              <span className="pill bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]">Approved by {task.closure_approved_by}</span>
            )}
            
            {!task.closure_pending && (
              <span className={cn(
                "pill",
                task.status === 'open' ? "pill-open" : "pill-closed"
              )}>
                {task.status === 'open' ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {task.status === 'open' && !task.closure_pending && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onRequestClosure(task)}
              className="h-7 text-xs rounded-full w-full"
            >
              Request Close
            </Button>
          )}
          
          {task.closure_pending && (
            <span className="text-xs text-[hsl(var(--chart-3))] font-medium text-center px-2">
              → HOD Dashboard
            </span>
          )}
          
          {task.status === 'open' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(task)}
              className="h-7 text-xs rounded-full"
            >
              Edit
            </Button>
          )}
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