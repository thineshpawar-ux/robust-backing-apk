import { useMemo } from 'react';
import { Task } from '@/types/task';
import { todayISO, isOverdue, isDueToday } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface HODDashboardProps {
  tasks: Task[];
}

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
}

function KPICard({ label, value, subtitle, progress }: KPICardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      )}
      {progress !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function HODDashboard({ tasks }: HODDashboardProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const closed = tasks.filter(t => t.status === 'closed').length;
    const open = tasks.filter(t => t.status === 'open').length;
    const exec = total ? Math.round((closed / total) * 100) : 0;

    const dueToday = tasks.filter(t => isDueToday(t.current_target_date, t.status)).length;
    const overdue = tasks.filter(t => isOverdue(t.current_target_date, t.status)).length;
    const overRatio = open ? Math.round((overdue / open) * 100) : 0;

    let totalMoves = 0;
    const offender: Record<string, number> = {};
    const slip: Record<string, number> = {};
    const td = todayISO();

    tasks.forEach(t => {
      const moves = (t.target_date_history?.length || 1) - 1;
      if (moves > 0) {
        totalMoves += moves;
        offender[t.owner] = (offender[t.owner] || 0) + moves;
      }
      if (t.status === 'open' && t.current_target_date < td) {
        slip[t.owner] = (slip[t.owner] || 0) + 1;
      }
      if (t.status === 'closed' && t.completed_at && t.completed_at > t.current_target_date) {
        slip[t.owner] = (slip[t.owner] || 0) + 1;
      }
    });

    return { total, closed, open, exec, dueToday, overdue, overRatio, totalMoves, offender, slip };
  }, [tasks]);

  const summaryItems = useMemo(() => {
    const items: string[] = [];
    
    if (stats.total === 0) {
      items.push('No work logged. HOD sees an empty board.');
    } else {
      items.push(`Total ${stats.total} tasks. ${stats.closed} closed, ${stats.open} open (${stats.exec}% execution).`);
      items.push(
        (stats.dueToday || stats.overdue) 
          ? `${stats.dueToday} due today; ${stats.overdue} open & overdue.`
          : 'No tasks due today, no overdue items.'
      );
      
      if (stats.totalMoves > 0) {
        const top = Object.entries(stats.offender)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([o, c]) => `${o} ×${c}`)
          .join(', ');
        items.push(`Date changes: ${stats.totalMoves} moves. Heavy reschedulers: ${top}.`);
      } else {
        items.push('No date changes. Commitments are stable.');
      }
      
      const slipTop = Object.entries(stats.slip).sort((a, b) => b[1] - a[1]);
      if (slipTop.length) {
        items.push('Red flag: deadline slippage by ' + slipTop.map(([o, c]) => `${o} misses ×${c}`).join(', ') + '.');
      } else {
        items.push('No major red flags on slippage.');
      }
    }
    
    return items;
  }, [stats]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total tasks" value={stats.total} />
        <KPICard 
          label="Execution" 
          value={`${stats.exec}%`} 
          subtitle="Closed / total"
          progress={stats.exec}
        />
        <KPICard 
          label="Today & overdue" 
          value={`${stats.dueToday} / ${stats.overdue}`}
          subtitle="Due today / overdue"
          progress={stats.overRatio}
        />
        <KPICard 
          label="Date changes" 
          value={stats.totalMoves}
          subtitle="Target date moves"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          {summaryItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
