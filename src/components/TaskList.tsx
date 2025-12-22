import { useState, useMemo } from 'react';
import { Task, PAGE_SIZE } from '@/types/task';
import { isOverdue } from '@/lib/date-utils';
import { TaskRow } from './TaskRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  searchQuery: string;
  filterOwner: string;
  filterStatus: string;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({
  tasks,
  searchQuery,
  filterOwner,
  filterStatus,
  onEdit,
  onToggleStatus,
  onDelete
}: TaskListProps) {
  const [page, setPage] = useState(1);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return tasks.filter(task => {
      if (filterOwner && filterOwner !== 'all' && task.owner !== filterOwner) return false;
      
      if (filterStatus && filterStatus !== 'all') {
        if (filterStatus === 'overdue') {
          if (!isOverdue(task.current_target_date, task.status)) return false;
        } else if (task.status !== filterStatus) {
          return false;
        }
      }
      
      if (query) {
        const haystack = `${task.title} ${task.owner}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      
      return true;
    });
  }, [tasks, searchQuery, filterOwner, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No tasks yet. Start by logging the first one.
      </div>
    );
  }

  if (pageItems.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No tasks match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[360px] overflow-y-auto pr-1 space-y-0">
        {pageItems.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div>
          Page {currentPage} / {totalPages}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="h-7 w-7 p-0 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-7 w-7 p-0 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
