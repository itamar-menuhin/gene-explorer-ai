-- Add share token column to analyses for public sharing
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analyses_share_token ON public.analyses(share_token);

-- Add RLS policy for public access via share token
CREATE POLICY "Anyone can view shared analyses" 
ON public.analyses 
FOR SELECT 
USING (share_token IS NOT NULL AND share_token != '');