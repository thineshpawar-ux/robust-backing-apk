import { useMemo, useState } from 'react';
import { Task, TEAM_MEMBERS, isHOD } from '@/types/task';
import { todayISO, isOverdue, isDueToday } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Check, X, Clock, AlertTriangle, CheckCircle2, TrendingUp, Users, Calendar, Target, ShieldAlert } from 'lucide-react';
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

interface HODDashboardProps {
  tasks: Task[];
  currentUserEmail?: string;
  onApproveChange?: (taskId: string, approvedBy: string) => Promise<{ success: boolean }>;
  onRejectChange?: (taskId: string) => Promise<{ success: boolean }>;
}

export function HODDashboard({ tasks, currentUserEmail, onApproveChange, onRejectChange }: HODDashboardProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const userIsHOD = isHOD(currentUserEmail);

  const stats = useMemo(() => {
    const total = tasks.length;
    const closed = tasks.filter(t => t.status === 'closed').length;
    const open = tasks.filter(t => t.status === 'open').length;
    const exec = total ? Math.round((closed / total) * 100) : 0;

    const dueToday = tasks.filter(t => isDueToday(t.current_target_date, t.status)).length;
    const overdue = tasks.filter(t => isOverdue(t.current_target_date, t.status)).length;

    // Per-member stats
    const memberStats = TEAM_MEMBERS.map(member => {
      const memberTasks = tasks.filter(t => t.owner === member);
      const memberTotal = memberTasks.length;
      const memberClosed = memberTasks.filter(t => t.status === 'closed').length;
      const memberOpen = memberTasks.filter(t => t.status === 'open').length;
      const memberOverdue = memberTasks.filter(t => isOverdue(t.current_target_date, t.status)).length;
      const memberExec = memberTotal ? Math.round((memberClosed / memberTotal) * 100) : 0;
      
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
        overdue: memberOverdue,
        exec: memberExec,
        dateChanges
      };
    }).filter(m => m.total > 0);

    const pendingApprovals = tasks.filter(t => t.date_change_pending);

    return { total, closed, open, exec, dueToday, overdue, memberStats, pendingApprovals };
  }, [tasks]);

  const handleApprove = async (taskId: string) => {
    const approver = prompt('Enter approver name (HOD):');
    if (approver && onApproveChange) {
      await onApproveChange(taskId, approver);
    }
  };

  // Chart data for status distribution
  const statusChartData = [
    { name: 'Completed', value: stats.closed, fill: 'hsl(var(--chart-2))' },
    { name: 'Open', value: stats.open - stats.overdue, fill: 'hsl(var(--chart-1))' },
    { name: 'Overdue', value: stats.overdue, fill: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  // Chart data for member performance
  const memberChartData = stats.memberStats.map(m => ({
    name: m.shortName,
    fullName: m.name,
    completed: m.closed,
    open: m.open,
    overdue: m.overdue,
  }));

  const COLORS = {
    completed: 'hsl(var(--chart-2))',
    open: 'hsl(var(--chart-1))',
    overdue: 'hsl(var(--destructive))',
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-primary">
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
              <Calendar className="h-3 w-3" />
              Due Today
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--chart-3))] mt-1">{stats.dueToday}</div>
            <div className="text-xs text-muted-foreground">Deadline</div>
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
              <TrendingUp className="h-3 w-3" />
              Execution
            </div>
            <div className="text-3xl font-bold text-accent mt-1">{stats.exec}%</div>
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
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                    formatter={(value: number) => [value, 'Tasks']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
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
                  <BarChart data={memberChartData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={70}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
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
                    <Bar dataKey="completed" stackId="a" fill={COLORS.completed} name="Completed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="open" stackId="a" fill={COLORS.open} name="Open" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="overdue" stackId="a" fill={COLORS.overdue} name="Overdue" radius={[0, 4, 4, 0]} />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                    />
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

      {/* Member Performance Cards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.memberStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No tasks assigned</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.memberStats.map(member => (
                <Card 
                  key={member.name}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md border",
                    selectedMember === member.name && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedMember(selectedMember === member.name ? null : member.name)}
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
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-gradient-to-r from-[hsl(var(--chart-2))] to-accent transition-all duration-500 ease-out"
                        style={{ width: `${member.exec}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-foreground">{member.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-[hsl(var(--chart-2))]">{member.closed}</div>
                        <div className="text-xs text-muted-foreground">Done</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-[hsl(var(--chart-1))]">{member.open}</div>
                        <div className="text-xs text-muted-foreground">Open</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-destructive">{member.overdue}</div>
                        <div className="text-xs text-muted-foreground">Late</div>
                      </div>
                    </div>

                    {member.dateChanges > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Date Changes</span>
                          <Badge variant={member.dateChanges > 2 ? "destructive" : "secondary"} className="text-xs">
                            {member.dateChanges}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Date Change Approvals */}
      {stats.pendingApprovals.length > 0 && (
        <Card className="border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))/0.05]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-[hsl(var(--chart-3))] flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Date Change Approvals ({stats.pendingApprovals.length})
              {!userIsHOD && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  HOD Only
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingApprovals.map(task => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card rounded-lg border gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{task.title}</div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">{task.owner}</span>
                      <span>•</span>
                      <span className="tabular-nums">{task.current_target_date}</span>
                      {task.date_change_requested_date && (
                        <>
                          <span>→</span>
                          <span className="text-[hsl(var(--chart-3))] font-medium tabular-nums">
                            {task.date_change_requested_date}
                          </span>
                        </>
                      )}
                    </div>
                    {task.date_change_reason && (
                      <div className="text-xs text-muted-foreground mt-2 italic bg-muted/50 p-2 rounded">
                        "{task.date_change_reason}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))/0.1]"
                              onClick={() => handleApprove(task.id)}
                              disabled={!userIsHOD}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!userIsHOD && (
                          <TooltipContent>
                            <p>Only HOD can approve date changes</p>
                          </TooltipContent>
                        )}
                      </UITooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => onRejectChange?.(task.id)}
                              disabled={!userIsHOD}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!userIsHOD && (
                          <TooltipContent>
                            <p>Only HOD can reject date changes</p>
                          </TooltipContent>
                        )}
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
