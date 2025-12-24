import { useState, useMemo } from 'react';
import { Task, PAGE_SIZE } from '@/types/task';
import { TaskRow } from './TaskRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  // Separate open and closed tasks
  const openTasks = useMemo(() => {
    const parentTasks = tasks.filter(t => !t.parent_task_id && t.status === 'open');
    const result: Task[] = [];
    
    parentTasks.forEach(parent => {
      result.push(parent);
      const subtasks = tasks.filter(t => t.parent_task_id === parent.id);
      result.push(...subtasks);
    });
    
    return result;
  }, [tasks]);

  const closedTasks = useMemo(() => {
    const parentTasks = tasks.filter(t => !t.parent_task_id && t.status === 'closed');
    const result: Task[] = [];
    
    parentTasks.forEach(parent => {
      result.push(parent);
      const subtasks = tasks.filter(t => t.parent_task_id === parent.id);
      result.push(...subtasks);
    });
    
    return result;
  }, [tasks]);

  const currentTasks = activeTab === 'open' ? openTasks : closedTasks;
  const totalPages = Math.max(1, Math.ceil(currentTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = currentTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'open' | 'closed');
    setPage(1);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No tasks yet. Start by logging the first one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Open Tasks
            <Badge variant="secondary" className="ml-1">{openTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Closed Tasks
            <Badge variant="secondary" className="ml-1">{closedTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          {openTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No open tasks. All tasks are completed!
            </div>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {closedTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No closed tasks yet.
            </div>
          ) : (
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
          )}
        </TabsContent>
      </Tabs>
      
      {currentTasks.length > PAGE_SIZE && (
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
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
        <strong>How it works:</strong> Click "Request Close" on any task → Add closure comment → Task goes to <strong>HOD Dashboard</strong> for approval. HOD can approve, reject, or add subtasks.
      </div>
    </div>
  );
}