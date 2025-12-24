-- Add security_answer column to user_roles table for password reset
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS security_answer TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_email ON public.user_roles(user_email);

-- Update RLS to allow users to update their own security answer
DROP POLICY IF EXISTS "Users can update their own security answer" ON public.user_roles;
CREATE POLICY "Users can update their own security answer" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow public access to check security answer for password reset (no auth required)
DROP POLICY IF EXISTS "Allow public to verify security answer" ON public.user_roles;
CREATE POLICY "Allow public to verify security answer" 
ON public.user_roles 
FOR SELECT 
USING (true);