-- Add parent_task_id column for subtasks
ALTER TABLE public.tasks 
ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_task_id);