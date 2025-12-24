import { useMemo, useState } from 'react';
import { Task } from '@/types/task';
import { isOverdue, isDueToday, formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Clock, AlertTriangle, CheckCircle2, TrendingUp, Target, 
  FileCheck, ListTodo, Ban, Calendar, MessageSquareWarning, Send, CalendarClock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClosureRequestDialog } from './ClosureRequestDialog';
import { DateChangeDialog } from './DateChangeDialog';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeamMemberDashboardProps {
  tasks: Task[];
  currentUser: string;
  onRequestDateChange?: (taskId: string, newDate: string, reason: string) => Promise<{ success: boolean }>;
  onRequestClosure?: (taskId: string, comment: string, requestedBy: string) => Promise<{ success: boolean }>;
}

export function TeamMemberDashboard({ 
  tasks, 
  currentUser,
  onRequestDateChange,
  onRequestClosure
}: TeamMemberDashboardProps) {
  const [closureTask, setClosureTask] = useState<Task | null>(null);
  const [dateChangeTask, setDateChangeTask] = useState<Task | null>(null);

  // Filter tasks for current user
  const myTasks = useMemo(() => {
    return tasks.filter(t => t.owner.toLowerCase() === currentUser.toLowerCase());
  }, [tasks, currentUser]);

  const stats = useMemo(() => {
    const total = myTasks.length;
    const closed = myTasks.filter(t => t.status === 'closed').length;
    const open = myTasks.filter(t => t.status === 'open').length;
    const blocked = myTasks.filter(t => t.waiting_for_subtask).length;
    
    // Exclude blocked from effective total for fair execution rate
    const effectiveTotal = total - blocked;
    const exec = effectiveTotal > 0 ? Math.round((closed / effectiveTotal) * 100) : (total === 0 ? 0 : 100);

    // Exclude blocked tasks from overdue/due today counts
    const dueToday = myTasks.filter(t => isDueToday(t.current_target_date, t.status) && !t.waiting_for_subtask).length;
    const overdue = myTasks.filter(t => isOverdue(t.current_target_date, t.status) && !t.waiting_for_subtask).length;
    const pendingClosure = myTasks.filter(t => t.closure_pending).length;
    const pendingDateChange = myTasks.filter(t => t.date_change_pending).length;
    
    // Count date changes
    let dateChanges = 0;
    myTasks.forEach(t => {
      const moves = (t.target_date_history?.length || 1) - 1;
      dateChanges += moves;
    });

    // Tasks with rejection comments
    const rejectedClosures = myTasks.filter(t => t.closure_rejection_comment && t.status === 'open');

    return { 
      total, closed, open, blocked, exec, dueToday, overdue, 
      pendingClosure, pendingDateChange, dateChanges, rejectedClosures 
    };
  }, [myTasks]);

  // Chart data for status distribution
  const statusChartData = [
    { name: 'Completed', value: stats.closed, fill: 'hsl(var(--chart-2))' },
    { name: 'Open', value: stats.open - stats.blocked - stats.overdue - stats.pendingClosure, fill: 'hsl(var(--chart-1))' },
    { name: 'Overdue', value: stats.overdue, fill: 'hsl(var(--destructive))' },
    { name: 'Pending', value: stats.pendingClosure, fill: 'hsl(var(--chart-3))' },
    { name: 'Blocked', value: stats.blocked, fill: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  // Weekly progress data
  const weeklyData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      
      const closedOnDay = myTasks.filter(t => 
        t.status === 'closed' && t.completed_at === dateStr
      ).length;
      
      last7Days.push({ name: dayName, completed: closedOnDay });
    }
    return last7Days;
  }, [myTasks]);

  const handleClosureSubmit = async (comment: string) => {
    if (closureTask && onRequestClosure) {
      await onRequestClosure(closureTask.id, comment, currentUser);
      setClosureTask(null);
    }
  };

  const handleDateChangeSubmit = async (newDate: string, reason: string) => {
    if (dateChangeTask && onRequestDateChange) {
      await onRequestDateChange(dateChangeTask.id, newDate, reason);
      setDateChangeTask(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rejection Alerts - Very prominent */}
      {stats.rejectedClosures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4" />
            HOD Feedback - Action Required
          </h3>
          {stats.rejectedClosures.map(task => (
            <Alert key={task.id} variant="destructive" className="border-destructive/50 bg-destructive/10">
              <MessageSquareWarning className="h-4 w-4" />
              <AlertTitle className="font-semibold">{task.title}</AlertTitle>
              <AlertDescription className="mt-1">
                <span className="text-sm font-medium">HOD Comment:</span>{' '}
                <span className="text-sm italic">"{task.closure_rejection_comment}"</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Target className="h-3 w-3" />
              My Tasks
            </div>
            <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
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

        <Card className="border-l-4 border-l-[hsl(var(--chart-1))]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Open
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--chart-1))] mt-1">{stats.open - stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Active</div>
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

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Ban className="h-3 w-3" />
              Blocked
            </div>
            <div className="text-3xl font-bold text-amber-500 mt-1">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Waiting</div>
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
              My Task Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
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
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded" />
              Weekly Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar 
                    dataKey="completed" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                    name="Tasks Completed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.dueToday}</div>
              <div className="text-sm text-muted-foreground">Due Today</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--chart-3))]/50 bg-[hsl(var(--chart-3))]/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[hsl(var(--chart-3))]/20 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-[hsl(var(--chart-3))]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[hsl(var(--chart-3))]">{stats.pendingClosure}</div>
              <div className="text-sm text-muted-foreground">Pending Approval</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.dateChanges}</div>
              <div className="text-sm text-muted-foreground">Date Changes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks Table with Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks ({myTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="font-semibold">Task</TableHead>
                    <TableHead className="font-semibold">Target Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTasks.map(task => {
                    const taskOverdue = isOverdue(task.current_target_date, task.status) && !task.waiting_for_subtask;
                    const taskDueToday = isDueToday(task.current_target_date, task.status) && !task.waiting_for_subtask;
                    const canRequestClosure = task.status === 'open' && !task.closure_pending && !task.waiting_for_subtask;
                    const canRequestDateChange = task.status === 'open' && !task.date_change_pending;
                    
                    return (
                      <TableRow key={task.id} className={cn(
                        "bg-card",
                        task.waiting_for_subtask && "bg-amber-500/5",
                        taskOverdue && !task.waiting_for_subtask && "bg-destructive/5",
                        taskDueToday && !task.waiting_for_subtask && "bg-amber-500/5",
                        task.closure_rejection_comment && "bg-destructive/5"
                      )}>
                        <TableCell className="max-w-[250px]">
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {task.parent_task_id && (
                                <span className="text-xs text-muted-foreground">↳</span>
                              )}
                              <span className="truncate">{task.title}</span>
                              {task.closure_rejection_comment && (
                                <Badge variant="destructive" className="text-xs">Rejected</Badge>
                              )}
                            </div>
                            {task.closure_rejection_comment && (
                              <div className="text-xs text-destructive italic">
                                HOD: "{task.closure_rejection_comment}"
                              </div>
                            )}
                          </div>
                        </TableCell>
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
                              Date Change Pending
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
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {canRequestClosure && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setClosureTask(task)}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Request Closure</TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                            {canRequestDateChange && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setDateChangeTask(task)}
                                    >
                                      <CalendarClock className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Request Date Change</TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {myTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No tasks assigned to you
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ClosureRequestDialog
        open={!!closureTask}
        onOpenChange={(open) => !open && setClosureTask(null)}
        taskTitle={closureTask?.title || ''}
        onSubmit={handleClosureSubmit}
      />

      <DateChangeDialog
        open={!!dateChangeTask}
        onOpenChange={(open) => !open && setDateChangeTask(null)}
        currentDate={dateChangeTask?.current_target_date || ''}
        onSubmit={handleDateChangeSubmit}
      />
    </div>
  );
}
