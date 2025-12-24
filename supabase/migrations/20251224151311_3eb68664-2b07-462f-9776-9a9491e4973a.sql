-- Create team_members table for dynamic team management
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT GENERATED ALWAYS AS (LOWER(REPLACE(name, ' ', '')) || '@sqtodo.local') STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_hod BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Everyone can read team members (needed for dropdowns)
CREATE POLICY "Anyone can read team members" 
ON public.team_members 
FOR SELECT 
USING (true);

-- Only HOD can insert/update/delete
CREATE POLICY "HOD can insert team members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE POLICY "HOD can update team members" 
ON public.team_members 
FOR UPDATE 
USING (has_role(auth.uid(), 'hod'));

CREATE POLICY "HOD can delete team members" 
ON public.team_members 
FOR DELETE 
USING (has_role(auth.uid(), 'hod'));

-- Insert default team members (including HOD)
INSERT INTO public.team_members (name, is_hod) VALUES
  ('Hariharan', true),
  ('Thinesh', false),
  ('Augustin', false),
  ('Ganesh', false),
  ('Regan', false),
  ('Meenakshi', false),
  ('Vignesh', false),
  ('Sateesh', false);

-- Add trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();