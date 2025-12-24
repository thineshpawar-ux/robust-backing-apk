-- Add waiting_for_subtask flag to tasks table
ALTER TABLE public.tasks 
ADD COLUMN waiting_for_subtask boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.waiting_for_subtask IS 'True when task is blocked waiting for subtasks to complete - excludes from owner performance metrics';