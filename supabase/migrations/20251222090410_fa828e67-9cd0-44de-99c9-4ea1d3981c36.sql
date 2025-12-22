-- Create tasks table for supplier quality management
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  current_target_date DATE NOT NULL,
  target_date_history DATE[] NOT NULL DEFAULT ARRAY[]::DATE[],
  completed_at DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (team app, no auth needed)
CREATE POLICY "Allow public read access" 
ON public.tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.tasks 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.tasks 
FOR DELETE 
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;