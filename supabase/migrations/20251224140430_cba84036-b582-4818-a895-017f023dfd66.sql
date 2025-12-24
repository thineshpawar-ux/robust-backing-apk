-- Add closure rejection comment field to store HOD's rejection reason
ALTER TABLE public.tasks 
ADD COLUMN closure_rejection_comment text DEFAULT NULL;