/**
 * Hook for fetching panels from the backend
 * 
 * This hook provides access to the dynamically cached panels
 * from the Python backend, with proper loading and error states.
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

// Default panels as fallback
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
  const [panels, setPanels] = useState<Panel[]>(DEFAULT_PANELS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<UsePanelsResult['source']>(null);

  const fetchPanels = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-panels', {
        body: {},
        headers: forceRefresh ? { 'x-refresh': 'true' } : undefined
      });
      
      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to fetch panels');
      }
      
      if (data?.panels && Array.isArray(data.panels) && data.panels.length > 0) {
        setPanels(data.panels);
        setSource(data.source || 'cache');
      } else {
        console.warn('No panels returned, using defaults');
        setPanels(DEFAULT_PANELS);
        setSource('default');
      }
    } catch (err) {
      console.error('Error fetching panels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch panels');
      // Keep using default panels on error
      setPanels(DEFAULT_PANELS);
      setSource('error_fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchPanels(true);
  }, [fetchPanels]);

  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  return { panels, loading, error, refresh, source };
}

// Export default panels for cases where we need synchronous access
export { DEFAULT_PANELS };
