-- Add columns for date change approval workflow
ALTER TABLE public.tasks 
ADD COLUMN date_change_reason text,
ADD COLUMN date_change_pending boolean NOT NULL DEFAULT false,
ADD COLUMN date_change_requested_date date,
ADD COLUMN date_change_approved_by text;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.date_change_pending IS 'True when a date change is awaiting HOD approval';
COMMENT ON COLUMN public.tasks.date_change_requested_date IS 'The new date requested by user, pending approval';
COMMENT ON COLUMN public.tasks.date_change_reason IS 'Reason provided for the date change request';