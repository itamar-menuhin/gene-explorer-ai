-- Add missing columns to analyses table for storing sequences and window configuration
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS sequences JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS window_config JSONB DEFAULT NULL;