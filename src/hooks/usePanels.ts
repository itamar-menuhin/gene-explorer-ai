/**
 * Hook for fetching panels from the database cache
 * 
 * This hook loads panels directly from the database cache for instant access.
 * The cache is populated by the Python backend (via get-panels edge function)
 * and only needs to be refreshed when the backend changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Panel {
  id: string;
  name: string;
  description: string;
  features: string[];
  keywords: string[];
}

interface UsePanelsResult {
  panels: Panel[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  source: 'cache' | 'python_backend' | 'default' | 'error_fallback' | null;
}

// Default panels as fallback - used immediately while cache loads
const DEFAULT_PANELS: Panel[] = [
  {
    id: "sequence",
    name: "Sequence Composition",
    description: "Nucleotide composition, GC content, sequence length metrics.",
    features: ["GC Content", "AT Content", "Sequence Length", "Nucleotide Counts"],
    keywords: ["GC", "content", "composition", "nucleotide", "length", "sequence", "AT"]
  },
  {
    id: "chemical",
    name: "Chemical Properties",
    description: "Isoelectric point, instability index, molecular weight, GRAVY, aromaticity.",
    features: ["Isoelectric Point", "Instability Index", "Molecular Weight", "GRAVY", "Aromaticity Index"],
    keywords: ["protein", "chemical", "isoelectric", "stability", "hydropathy", "molecular weight", "aromaticity"]
  },
  {
    id: "codonUsage",
    name: "Codon Usage Bias",
    description: "ENC, RCBS, RSCU, CPB, DCBS, CAI, and FOP metrics for codon usage analysis.",
    features: ["ENC", "RCBS", "RSCU", "CPB", "DCBS", "CAI", "FOP"],
    keywords: ["codon", "translation", "expression", "efficiency", "ribosome", "protein synthesis", "tRNA", "bias"]
  },
  {
    id: "disorder",
    name: "Disorder Prediction",
    description: "Intrinsic disorder propensity using IUPred algorithm.",
    features: ["IUPred Score", "Disordered Regions", "Disorder Fraction"],
    keywords: ["disorder", "IUPred", "intrinsic", "unstructured", "flexible", "disordered regions"]
  },
  {
    id: "structure",
    name: "Structure Features",
    description: "Secondary structure propensity predictions for helix, sheet, and coil.",
    features: ["Helix Propensity", "Sheet Propensity", "Coil Propensity"],
    keywords: ["structure", "secondary", "helix", "sheet", "coil", "folding", "protein structure"]
  },
  {
    id: "motif",
    name: "Motif Analysis",
    description: "JASPAR motif scanning and regulatory element detection.",
    features: ["Motif Count", "Motif Density", "Top Motifs"],
    keywords: ["motif", "JASPAR", "regulatory", "transcription factor", "binding site", "element"]
  }
];

export function usePanels(): UsePanelsResult {
  // Start with defaults for instant UI rendering
  const [panels, setPanels] = useState<Panel[]>(DEFAULT_PANELS);
  const [loading, setLoading] = useState(false); // Don't block UI, defaults are available
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<UsePanelsResult['source']>('default');

  // Load panels directly from database cache (fast!)
  const loadFromCache = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('panel_cache')
        .select('panels')
        .eq('id', 'panels')
        .maybeSingle();
      
      if (queryError) {
        console.warn('Failed to load panels from cache:', queryError.message);
        return false;
      }
      
      if (data?.panels && Array.isArray(data.panels) && data.panels.length > 0) {
        setPanels(data.panels as unknown as Panel[]);
        setSource('cache');
        return true;
      }
      
      return false;
    } catch (err) {
      console.warn('Error loading panels from cache:', err);
      return false;
    }
  }, []);

  // Refresh from Python backend via edge function (slow, only when needed)
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-panels', {
        body: {},
        headers: { 'x-refresh': 'true' }
      });
      
      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to refresh panels');
      }
      
      if (data?.panels && Array.isArray(data.panels) && data.panels.length > 0) {
        setPanels(data.panels);
        setSource(data.source || 'python_backend');
      }
    } catch (err) {
      console.error('Error refreshing panels:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh panels');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, try to load from cache (non-blocking)
  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  return { panels, loading, error, refresh, source };
}

// Export default panels for cases where we need synchronous access
export { DEFAULT_PANELS };
