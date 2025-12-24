import { useMemo, useState } from 'react';
import { Task, TEAM_MEMBERS } from '@/types/task';
import { todayISO, isOverdue, isDueToday, formatDate } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Check, X, Clock, AlertTriangle, CheckCircle2, TrendingUp, Users, Calendar, 
  Target, ShieldAlert, FileCheck, Plus, ListTodo, ArrowRight, Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRoles } from '@/hooks/useUserRoles';
import { SubtaskDialog } from './SubtaskDialog';
import { ClosureRejectionDialog } from './ClosureRejectionDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface HODDashboardProps {
  tasks: Task[];
  currentUserEmail?: string;
  currentUserId?: string;
  onApproveDateChange?: (taskId: string, approvedBy: string) => Promise<{ success: boolean }>;
  onRejectDateChange?: (taskId: string) => Promise<{ success: boolean }>;
  onApproveClosure?: (taskId: string, approvedBy: string) => Promise<{ success: boolean }>;
  onRejectClosure?: (taskId: string, rejectionComment: string) => Promise<{ success: boolean }>;
  onAddSubtask?: (parentTaskId: string, title: string, owner: string, targetDate: string) => Promise<{ success: boolean }>;
}

export function HODDashboard({ 
  tasks, 
  currentUserEmail, 
  currentUserId, 
  onApproveDateChange, 
  onRejectDateChange, 
  onApproveClosure, 
  onRejectClosure,
  onAddSubtask 
}: HODDashboardProps) {
  const [subtaskParentTask, setSubtaskParentTask] = useState<Task | null>(null);
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null);
  const { isHOD } = useUserRoles();
  const userIsHOD = isHOD(currentUserId, currentUserEmail);

  const stats = useMemo(() => {
    const total = tasks.length;
    const closed = tasks.filter(t => t.status === 'closed').length;
    const open = tasks.filter(t => t.status === 'open').length;
    const blocked = tasks.filter(t => t.waiting_for_subtask).length;
    const exec = total ? Math.round((closed / total) * 100) : 0;

    // Exclude blocked tasks from overdue/due today counts
    const dueToday = tasks.filter(t => isDueToday(t.current_target_date, t.status) && !t.waiting_for_subtask).length;
    const overdue = tasks.filter(t => isOverdue(t.current_target_date, t.status) && !t.waiting_for_subtask).length;
    const pendingClosure = tasks.filter(t => t.closure_pending).length;

    // Per-member stats - exclude blocked tasks from overdue count
    const memberStats = TEAM_MEMBERS.map(member => {
      const memberTasks = tasks.filter(t => t.owner === member);
      const memberTotal = memberTasks.length;
      const memberClosed = memberTasks.filter(t => t.status === 'closed').length;
      const memberOpen = memberTasks.filter(t => t.status === 'open' && !t.waiting_for_subtask).length;
      const memberBlocked = memberTasks.filter(t => t.waiting_for_subtask).length;
      // Exclude blocked tasks from overdue count - they don't affect owner's performance
      const memberOverdue = memberTasks.filter(t => isOverdue(t.current_target_date, t.status) && !t.waiting_for_subtask).length;
      const memberPendingClosure = memberTasks.filter(t => t.closure_pending).length;
      // Execution rate: closed / (total - blocked) to be fair
      const effectiveTotal = memberTotal - memberBlocked;
      const memberExec = effectiveTotal > 0 ? Math.round((memberClosed / effectiveTotal) * 100) : (memberTotal === 0 ? 0 : 100);
      
      let dateChanges = 0;
      memberTasks.forEach(t => {
        const moves = (t.target_date_history?.length || 1) - 1;
        dateChanges += moves;
      });

      return {
        name: member,
        shortName: member.split(' ')[0],
        total: memberTotal,
        open: memberOpen,
        closed: memberClosed,
        blocked: memberBlocked,
        overdue: memberOverdue,
        pendingClosure: memberPendingClosure,
        exec: memberExec,
        dateChanges
      };
    }).filter(m => m.total > 0);

    const pendingDateApprovals = tasks.filter(t => t.date_change_pending);
    const pendingClosureApprovals = tasks.filter(t => t.closure_pending);

    return { total, closed, open, exec, dueToday, overdue, pendingClosure, memberStats, pendingDateApprovals, pendingClosureApprovals };
  }, [tasks]);

  const handleApproveDateChange = async (taskId: string) => {
    if (currentUserEmail && onApproveDateChange) {
      await onApproveDateChange(taskId, currentUserEmail.split('@')[0]);
    }
  };

  const handleApproveClosure = async (taskId: string) => {
    if (currentUserEmail && onApproveClosure) {
      await onApproveClosure(taskId, currentUserEmail.split('@')[0]);
    }
  };

  const handleAddSubtask = async (title: string, owner: string, targetDate: string) => {
    if (subtaskParentTask && onAddSubtask) {
      await onAddSubtask(subtaskParentTask.id, title, owner, targetDate);
      setSubtaskParentTask(null);
    }
  };

  const handleRejectClosure = async (comment: string) => {
    if (rejectingTask && onRejectClosure) {
      await onRejectClosure(rejectingTask.id, comment);
      setRejectingTask(null);
    }
  };

  // Chart data for status distribution
  const statusChartData = [
    { name: 'Completed', value: stats.closed, fill: 'hsl(var(--chart-2))' },
    { name: 'Open', value: stats.open - stats.overdue - stats.pendingClosure, fill: 'hsl(var(--chart-1))' },
    { name: 'Overdue', value: stats.overdue, fill: 'hsl(var(--destructive))' },
    { name: 'Pending', value: stats.pendingClosure, fill: 'hsl(var(--chart-3))' },
  ].filter(d => d.value > 0);

  // Chart data for member performance
  const memberChartData = stats.memberStats.map(m => ({
    name: m.shortName,
    fullName: m.name,
    completed: m.closed,
    open: m.open - m.pendingClosure,
    pending: m.pendingClosure,
    overdue: m.overdue,
  }));

  const COLORS = {
    completed: 'hsl(var(--chart-2))',
    open: 'hsl(var(--chart-1))',
    pending: 'hsl(var(--chart-3))',
    overdue: 'hsl(var(--destructive))',
  };

  const totalPendingApprovals = stats.pendingDateApprovals.length + stats.pendingClosureApprovals.length;

  return (
    <div className="space-y-6">
      {/* Quick Action Banner - Pending Approvals */}
      {totalPendingApprovals > 0 && (
        <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-lg">
                    {totalPendingApprovals} Approval{totalPendingApprovals > 1 ? 's' : ''} Pending
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.pendingDateApprovals.length} date change • {stats.pendingClosureApprovals.length} closure
                  </div>
                </div>
              </div>
              <a href="#approvals" className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
                Review Now <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Target className="h-3 w-3" />
              Total
            </div>
            <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Tasks</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[hsl(var(--chart-1))]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Open
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--chart-1))] mt-1">{stats.open}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[hsl(var(--chart-2))]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <CheckCircle2 className="h-3 w-3" />
              Closed
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--chart-2))] mt-1">{stats.closed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[hsl(var(--chart-3))]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <FileCheck className="h-3 w-3" />
              Pending
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--chart-3))] mt-1">{stats.pendingClosure}</div>
            <div className="text-xs text-muted-foreground">Closures</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </div>
            <div className="text-3xl font-bold text-destructive mt-1">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Past Due</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Calendar className="h-3 w-3" />
              Due Today
            </div>
            <div className="text-3xl font-bold text-accent mt-1">{stats.dueToday}</div>
            <div className="text-xs text-muted-foreground">Deadline</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <TrendingUp className="h-3 w-3" />
              Execution
            </div>
            <div className="text-3xl font-bold text-primary mt-1">{stats.exec}%</div>
            <div className="text-xs text-muted-foreground">Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={false}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-foreground text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member Performance Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {memberChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={memberChartData} 
                    layout="vertical" 
                    barCategoryGap="15%"
                    margin={{ top: 30, right: 20, bottom: 10, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={60}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="center"
                      wrapperStyle={{ paddingBottom: '5px' }}
                      formatter={(value) => <span className="text-foreground text-xs">{value}</span>}
                    />
                    <Bar dataKey="completed" stackId="a" fill={COLORS.completed} name="Completed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="open" stackId="a" fill={COLORS.open} name="Open" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill={COLORS.pending} name="Pending" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="overdue" stackId="a" fill={COLORS.overdue} name="Overdue" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No task data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <div id="approvals" className="scroll-mt-4 space-y-4">
        {/* Date Change Approvals */}
        {stats.pendingDateApprovals.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Date Change Requests ({stats.pendingDateApprovals.length})
                {!userIsHOD && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    HOD Only
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Task</TableHead>
                      <TableHead className="font-semibold">Owner</TableHead>
                      <TableHead className="font-semibold">Current → New</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.pendingDateApprovals.map(task => (
                      <TableRow key={task.id} className="bg-card">
                        <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                        <TableCell>{task.owner}</TableCell>
                        <TableCell>
                          <span className="tabular-nums">{formatDate(task.current_target_date)}</span>
                          <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
                          <span className="text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                            {formatDate(task.date_change_requested_date || '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-[150px] truncate">
                          {task.date_change_reason || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))/0.1]"
                                      onClick={() => handleApproveDateChange(task.id)}
                                      disabled={!userIsHOD}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {userIsHOD ? 'Approve' : 'Only HOD can approve'}
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => onRejectDateChange?.(task.id)}
                                      disabled={!userIsHOD}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {userIsHOD ? 'Reject' : 'Only HOD can reject'}
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Closure Approvals */}
        {stats.pendingClosureApprovals.length > 0 && (
          <Card className="border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))/0.05]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-[hsl(var(--chart-3))] flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Closure Requests ({stats.pendingClosureApprovals.length})
                {!userIsHOD && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    HOD Only
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Task</TableHead>
                      <TableHead className="font-semibold">Owner</TableHead>
                      <TableHead className="font-semibold">Requested By</TableHead>
                      <TableHead className="font-semibold">Comment</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.pendingClosureApprovals.map(task => (
                      <TableRow key={task.id} className="bg-card">
                        <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                        <TableCell>{task.owner}</TableCell>
                        <TableCell>{task.closure_requested_by}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-[150px] truncate">
                          {task.closure_comment || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {userIsHOD && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                                      onClick={() => setSubtaskParentTask(task)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Add Subtask</TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))/0.1]"
                                      onClick={() => handleApproveClosure(task.id)}
                                      disabled={!userIsHOD}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {userIsHOD ? 'Approve' : 'Only HOD can approve'}
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => setRejectingTask(task)}
                                      disabled={!userIsHOD}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {userIsHOD ? 'Reject' : 'Only HOD can reject'}
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Performance Cards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Individual Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.memberStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No tasks assigned</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {stats.memberStats.map(member => (
                <Card 
                  key={member.name}
                  className="border hover:shadow-md transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-foreground">{member.name}</span>
                      <Badge 
                        variant={member.exec >= 80 ? "default" : member.exec >= 50 ? "secondary" : "destructive"}
                        className="font-mono"
                      >
                        {member.exec}%
                      </Badge>
                    </div>
                    
                    {/* Execution Progress Bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-gradient-to-r from-[hsl(var(--chart-2))] to-primary transition-all duration-500 ease-out"
                        style={{ width: `${member.exec}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-center">
                      <div>
                        <div className="text-sm font-bold text-foreground">{member.total}</div>
                        <div className="text-[10px] text-muted-foreground">Total</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[hsl(var(--chart-2))]">{member.closed}</div>
                        <div className="text-[10px] text-muted-foreground">Done</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[hsl(var(--chart-1))]">{member.open}</div>
                        <div className="text-[10px] text-muted-foreground">Open</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[hsl(var(--chart-3))]">{member.pendingClosure}</div>
                        <div className="text-[10px] text-muted-foreground">Pend</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-destructive">{member.overdue}</div>
                        <div className="text-[10px] text-muted-foreground">Late</div>
                      </div>
                    </div>

                    {member.dateChanges > 0 && (
                      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Date Changes</span>
                        <Badge variant={member.dateChanges > 2 ? "destructive" : "secondary"} className="text-xs h-5">
                          {member.dateChanges}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Tasks Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            All Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="font-semibold">Task</TableHead>
                    <TableHead className="font-semibold">Owner</TableHead>
                    <TableHead className="font-semibold">Target Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Date Moves</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.slice(0, 50).map(task => {
                    const taskOverdue = isOverdue(task.current_target_date, task.status) && !task.waiting_for_subtask;
                    const taskDueToday = isDueToday(task.current_target_date, task.status) && !task.waiting_for_subtask;
                    const dateMoves = (task.target_date_history?.length || 1) - 1;
                    
                    return (
                      <TableRow key={task.id} className={cn(
                        "bg-card",
                        task.waiting_for_subtask && "bg-amber-500/5",
                        taskOverdue && !task.waiting_for_subtask && "bg-destructive/5",
                        taskDueToday && !task.waiting_for_subtask && "bg-amber-500/5"
                      )}>
                        <TableCell className="font-medium max-w-[250px] truncate">
                          {task.parent_task_id && (
                            <span className="text-xs text-muted-foreground mr-1">↳</span>
                          )}
                          {task.title}
                        </TableCell>
                        <TableCell>{task.owner}</TableCell>
                        <TableCell className="tabular-nums">
                          <span className={cn(
                            taskOverdue && "text-destructive font-medium",
                            taskDueToday && "text-amber-600 dark:text-amber-400 font-medium"
                          )}>
                            {formatDate(task.current_target_date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {task.status === 'closed' ? (
                            <Badge variant="secondary" className="bg-[hsl(var(--chart-2))/0.1] text-[hsl(var(--chart-2))]">
                              Closed
                            </Badge>
                          ) : task.waiting_for_subtask ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Blocked
                            </Badge>
                          ) : task.closure_pending ? (
                            <Badge variant="secondary" className="bg-[hsl(var(--chart-3))/0.1] text-[hsl(var(--chart-3))]">
                              Pending Closure
                            </Badge>
                          ) : task.date_change_pending ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Date Change
                            </Badge>
                          ) : taskOverdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : taskDueToday ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Due Today
                            </Badge>
                          ) : (
                            <Badge variant="outline">Open</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {dateMoves > 0 ? (
                            <Badge variant={dateMoves > 2 ? "destructive" : "secondary"} className="text-xs">
                              {dateMoves}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          {tasks.length > 50 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 50 of {tasks.length} tasks
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subtask Dialog */}
      <SubtaskDialog
        open={!!subtaskParentTask}
        onOpenChange={(open) => !open && setSubtaskParentTask(null)}
        parentTaskTitle={subtaskParentTask?.title || ''}
        onSubmit={handleAddSubtask}
      />

      {/* Closure Rejection Dialog */}
      <ClosureRejectionDialog
        open={!!rejectingTask}
        onOpenChange={(open) => !open && setRejectingTask(null)}
        taskTitle={rejectingTask?.title || ''}
        onSubmit={handleRejectClosure}
      />
    </div>
  );
}
