import { useMemo } from 'react';
import { Task, TEAM_MEMBERS } from '@/types/task';
import { todayISO, isOverdue, isDueToday } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface HODDashboardProps {
  tasks: Task[];
  onApproveChange?: (taskId: string, approvedBy: string) => Promise<{ success: boolean }>;
  onRejectChange?: (taskId: string) => Promise<{ success: boolean }>;
}

export function HODDashboard({ tasks, onApproveChange, onRejectChange }: HODDashboardProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const closed = tasks.filter(t => t.status === 'closed').length;
    const open = tasks.filter(t => t.status === 'open').length;
    const exec = total ? Math.round((closed / total) * 100) : 0;

    const dueToday = tasks.filter(t => isDueToday(t.current_target_date, t.status)).length;
    const overdue = tasks.filter(t => isOverdue(t.current_target_date, t.status)).length;
    const td = todayISO();

    // Per-member stats
    const memberStats = TEAM_MEMBERS.map(member => {
      const memberTasks = tasks.filter(t => t.owner === member);
      const memberTotal = memberTasks.length;
      const memberClosed = memberTasks.filter(t => t.status === 'closed').length;
      const memberOpen = memberTasks.filter(t => t.status === 'open').length;
      const memberOverdue = memberTasks.filter(t => isOverdue(t.current_target_date, t.status)).length;
      const memberExec = memberTotal ? Math.round((memberClosed / memberTotal) * 100) : 0;
      
      // Count date changes
      let dateChanges = 0;
      memberTasks.forEach(t => {
        const moves = (t.target_date_history?.length || 1) - 1;
        dateChanges += moves;
      });

      return {
        name: member,
        total: memberTotal,
        open: memberOpen,
        closed: memberClosed,
        overdue: memberOverdue,
        exec: memberExec,
        dateChanges
      };
    }).filter(m => m.total > 0);

    // Pending approvals
    const pendingApprovals = tasks.filter(t => t.date_change_pending);

    return { total, closed, open, exec, dueToday, overdue, memberStats, pendingApprovals };
  }, [tasks]);

  const handleApprove = async (taskId: string) => {
    const approver = prompt('Enter approver name (HOD):');
    if (approver && onApproveChange) {
      await onApproveChange(taskId, approver);
    }
  };

  return (
    <div className="space-y-6">
      {/* IBCS Summary Table */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Summary
        </h3>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium py-2">Total tasks</TableCell>
              <TableCell className="text-right py-2 tabular-nums">{stats.total}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium py-2">Open</TableCell>
              <TableCell className="text-right py-2 tabular-nums">{stats.open}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium py-2">Closed</TableCell>
              <TableCell className="text-right py-2 tabular-nums">{stats.closed}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium py-2">Execution rate</TableCell>
              <TableCell className="text-right py-2 tabular-nums">{stats.exec}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium py-2">Due today</TableCell>
              <TableCell className="text-right py-2 tabular-nums">{stats.dueToday}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium py-2 text-destructive">Overdue</TableCell>
              <TableCell className="text-right py-2 tabular-nums text-destructive">{stats.overdue}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Member Performance Table - IBCS style */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Performance by member
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2">Member</TableHead>
              <TableHead className="text-right py-2">Total</TableHead>
              <TableHead className="text-right py-2">Open</TableHead>
              <TableHead className="text-right py-2">Closed</TableHead>
              <TableHead className="text-right py-2">Overdue</TableHead>
              <TableHead className="text-right py-2">Exec %</TableHead>
              <TableHead className="text-right py-2">Date Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.memberStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                  No tasks assigned
                </TableCell>
              </TableRow>
            ) : (
              stats.memberStats.map(member => (
                <TableRow key={member.name}>
                  <TableCell className="font-medium py-2">{member.name}</TableCell>
                  <TableCell className="text-right py-2 tabular-nums">{member.total}</TableCell>
                  <TableCell className="text-right py-2 tabular-nums">{member.open}</TableCell>
                  <TableCell className="text-right py-2 tabular-nums">{member.closed}</TableCell>
                  <TableCell className={cn(
                    "text-right py-2 tabular-nums",
                    member.overdue > 0 && "text-destructive font-medium"
                  )}>
                    {member.overdue}
                  </TableCell>
                  <TableCell className="text-right py-2 tabular-nums">{member.exec}%</TableCell>
                  <TableCell className={cn(
                    "text-right py-2 tabular-nums",
                    member.dateChanges > 2 && "text-amber-600 font-medium"
                  )}>
                    {member.dateChanges}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pending Date Change Approvals */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Pending approvals ({stats.pendingApprovals.length})
        </h3>
        {stats.pendingApprovals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No pending date change requests</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2">Task</TableHead>
                <TableHead className="py-2">Owner</TableHead>
                <TableHead className="py-2">Current</TableHead>
                <TableHead className="py-2">Requested</TableHead>
                <TableHead className="py-2">Reason</TableHead>
                <TableHead className="text-right py-2">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.pendingApprovals.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium py-2 max-w-[200px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell className="py-2">{task.owner}</TableCell>
                  <TableCell className="py-2 tabular-nums">{task.current_target_date}</TableCell>
                  <TableCell className="py-2 tabular-nums">{task.date_change_requested_date}</TableCell>
                  <TableCell className="py-2 max-w-[200px] truncate text-muted-foreground">
                    {task.date_change_reason}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => handleApprove(task.id)}
                        title="Approve"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => onRejectChange?.(task.id)}
                        title="Reject"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
