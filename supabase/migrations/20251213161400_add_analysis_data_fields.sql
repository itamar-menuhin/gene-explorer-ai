-- Add fields to store sequences and results for analyses
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS sequences JSONB,
ADD COLUMN IF NOT EXISTS results JSONB,
ADD COLUMN IF NOT EXISTS window_config JSONB;

-- Add comment to document the schema
COMMENT ON COLUMN public.analyses.sequences IS 'Array of sequence objects with id, name, and sequence fields';
COMMENT ON COLUMN public.analyses.results IS 'Feature extraction results from the backend';
COMMENT ON COLUMN public.analyses.window_config IS 'Window configuration object with start and end settings';
