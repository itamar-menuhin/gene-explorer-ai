import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  SequenceInput,
  WindowConfig,
  FeaturePanelConfig,
  FeatureExtractionResponse,
  GlobalFeatureResult,
  WindowedFeatureResult,
} from '@/types/featureExtraction';

interface UseFeatureExtractionOptions {
  onProgress?: (progress: number, message: string) => void;
  onPanelComplete?: (panelId: string) => void;
}

interface FeatureExtractionState {
  isLoading: boolean;
  progress: number;
  currentPanel: string | null;
  results: FeatureExtractionResponse | null;
  error: string | null;
}

export function useFeatureExtraction(options: UseFeatureExtractionOptions = {}) {
  const { onProgress, onPanelComplete } = options;
  
  const [state, setState] = useState<FeatureExtractionState>({
    isLoading: false,
    progress: 0,
    currentPanel: null,
    results: null,
    error: null,
  });

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const extractFeatures = useCallback(async (
    sequences: SequenceInput[],
    panels: Partial<FeaturePanelConfig>,
    windowConfig?: WindowConfig,
    referenceSet?: string
  ): Promise<FeatureExtractionResponse | null> => {
    const controller = new AbortController();
    setAbortController(controller);

    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      currentPanel: null,
      results: null,
      error: null,
    }));

    try {
      const enabledPanels = Object.entries(panels)
        .filter(([_, config]) => config?.enabled)
        .map(([id]) => id);

      if (enabledPanels.length === 0) {
        throw new Error('No feature panels selected');
      }

      onProgress?.(10, 'Preparing sequences...');
      setState(prev => ({ ...prev, progress: 10 }));

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('extract-features', {
        body: {
          sequences,
          panels,
          window: windowConfig,
          referenceSet,
        },
      });

      if (error) {
        throw new Error(error.message || 'Feature extraction failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Feature extraction failed');
      }

      const response = data as FeatureExtractionResponse;

      // Notify about completed panels
      enabledPanels.forEach(panelId => {
        onPanelComplete?.(panelId);
      });

      onProgress?.(100, 'Complete');
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        results: response,
      }));

      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    } finally {
      setAbortController(null);
    }
  }, [onProgress, onPanelComplete]);

  const stopExtraction = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Extraction stopped by user',
      }));
    }
  }, [abortController]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      currentPanel: null,
      results: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    extractFeatures,
    stopExtraction,
    reset,
  };
}

// Utility to convert results to CSV-friendly format
export function flattenFeatureResults(
  results: FeatureExtractionResponse
): Array<Record<string, unknown>> {
  if (results.mode === 'global') {
    return (results.results as GlobalFeatureResult[]).map(r => ({
      sequence_id: r.sequenceId,
      ...r.features,
    }));
  } else {
    return (results.results as WindowedFeatureResult[]).map(r => ({
      sequence_id: r.sequenceId,
      window_start: r.windowStart,
      window_end: r.windowEnd,
      ...r.features,
    }));
  }
}
