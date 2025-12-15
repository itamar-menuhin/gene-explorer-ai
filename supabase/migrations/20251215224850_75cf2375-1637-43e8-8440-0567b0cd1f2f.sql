-- Add results column to analyses table for storing computed features
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS results JSONB;

-- Add index for faster queries when results exist
CREATE INDEX IF NOT EXISTS idx_analyses_computed ON public.analyses (computed_at) WHERE computed_at IS NOT NULL;