/**
 * Panel Recommendations Hook
 * 
 * PURPOSE: React hook to get AI-powered panel recommendations for feature analysis
 * 
 * CALLS: 
 *   - Supabase Edge Function: 'recommend-panels' (/supabase/functions/recommend-panels/index.ts)
 *   - AI Model: google/gemini-2.5-flash (via Lovable AI Gateway)
 * 
 * USED IN:
 *   - NewAnalysis page (src/pages/NewAnalysis.tsx) - Guided analysis workflow
 * 
 * FLOW:
 *   1. User enters research hypothesis in UI
 *   2. Component calls getRecommendations(hypothesis, metadata)
 *   3. Hook invokes Supabase edge function with hypothesis
 *   4. Edge function sends hypothesis to AI model using prompts from /supabase/functions/prompts/
 *   5. AI returns relevance scores (1-10) for all available panels
 *   6. Hook returns recommendations sorted by relevance
 * 
 * PROMPTS LOCATION: /supabase/functions/prompts/recommend-panels-prompts.ts
 */

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
    maxLength?: number,
    retryCount = 0
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
        // Retry on network/timeout errors
        if (retryCount < 2 && (fnError.message.includes('timeout') || fnError.message.includes('network') || fnError.message.includes('fetch'))) {
          console.log(`Retrying recommendation (attempt ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return getRecommendations(hypothesis, sequenceCount, minLength, maxLength, retryCount + 1);
        }
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
      
      // Only show toast on final failure (not during retries)
      if (retryCount >= 2 || !message.includes('timeout')) {
        toast({ 
          variant: 'destructive', 
          title: 'Recommendation failed', 
          description: retryCount > 0 ? `${message} (after ${retryCount + 1} attempts)` : message 
        });
      }
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
