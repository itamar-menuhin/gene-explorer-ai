import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PanelRecommendation {
  panelId: string;
  relevanceScore: number;
  relevanceExplanation: string;
  panel: {
    id: string;
    name: string;
    description: string;
    features: string[];
    keywords: string[];
  };
}

export function usePanelRecommendations() {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<PanelRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = async (
    hypothesis: string,
    sequenceCount?: number,
    minLength?: number,
    maxLength?: number
  ) => {
    if (!hypothesis.trim()) {
      setError('Please enter a hypothesis');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-panels', {
        body: { hypothesis, sequenceCount, minLength, maxLength }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast({ variant: 'destructive', title: 'Rate limit exceeded', description: 'Please wait a moment and try again.' });
        } else if (data.error.includes('credits')) {
          toast({ variant: 'destructive', title: 'AI credits exhausted', description: 'Please add credits to continue using AI recommendations.' });
        }
        throw new Error(data.error);
      }

      setRecommendations(data.recommendations || []);
      return data.recommendations || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(message);
      toast({ variant: 'destructive', title: 'Recommendation failed', description: message });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    clearRecommendations: () => setRecommendations([])
  };
}
