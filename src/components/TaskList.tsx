import { useState, useMemo } from 'react';
import { Task, PAGE_SIZE } from '@/types/task';
import { TaskRow } from './TaskRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  currentUser?: string;
  onEdit: (task: Task) => void;
  onRequestClosure: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({
  tasks,
  currentUser,
  onEdit,
  onRequestClosure,
  onDelete
}: TaskListProps) {
  const [page, setPage] = useState(1);

  // Sort tasks: parent tasks first, then subtasks grouped under their parents
  const sortedTasks = useMemo(() => {
    const parentTasks = tasks.filter(t => !t.parent_task_id);
    const result: Task[] = [];
    
    parentTasks.forEach(parent => {
      result.push(parent);
      // Add subtasks right after their parent
      const subtasks = tasks.filter(t => t.parent_task_id === parent.id);
      result.push(...subtasks);
    });
    
    return result;
  }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sortedTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No tasks yet. Start by logging the first one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-0">
        {pageItems.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            currentUser={currentUser}
            onEdit={onEdit}
            onRequestClosure={onRequestClosure}
            onDelete={onDelete}
            isSubtask={!!task.parent_task_id}
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