-- Create a cache table for storing panels from Python backend
CREATE TABLE public.panel_cache (
  id TEXT PRIMARY KEY DEFAULT 'panels',
  panels JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  python_backend_url TEXT
);

-- Enable RLS but allow public read access (panels are not sensitive)
ALTER TABLE public.panel_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read the cached panels
CREATE POLICY "Anyone can read cached panels"
ON public.panel_cache
FOR SELECT
USING (true);

-- Only service role can update (via edge functions)
-- No INSERT/UPDATE/DELETE policies for anon users