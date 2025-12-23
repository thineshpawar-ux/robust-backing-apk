-- Add closure approval workflow columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS closure_pending boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS closure_comment text,
ADD COLUMN IF NOT EXISTS closure_requested_by text,
ADD COLUMN IF NOT EXISTS closure_approved_by text;