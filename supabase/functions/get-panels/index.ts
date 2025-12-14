/**
 * Get Panels Edge Function
 * 
 * PURPOSE: Fetch and cache panels from Python backend
 * 
 * FLOW:
 *   1. Check if panels are cached and not stale (< 1 hour old)
 *   2. If cached, return cached panels
 *   3. If not cached or stale, fetch from Python backend
 *   4. Cache the result and return
 * 
 * CALLED BY:
 *   - recommend-panels edge function
 *   - Frontend components that need panel data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default panels - fallback if Python backend is not available
const DEFAULT_PANELS = [
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

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check for force refresh parameter
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    // Check cache first
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('panel_cache')
        .select('*')
        .eq('id', 'panels')
        .single();
      
      if (cached && cached.panels && Array.isArray(cached.panels) && cached.panels.length > 0) {
        const fetchedAt = new Date(cached.fetched_at).getTime();
        const now = Date.now();
        
        // Return cached if still valid
        if (now - fetchedAt < CACHE_TTL_MS) {
          console.log('Returning cached panels');
          return new Response(JSON.stringify({
            panels: cached.panels,
            source: 'cache',
            fetchedAt: cached.fetched_at,
            pythonBackendUrl: cached.python_backend_url
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    // Fetch from Python backend if available
    let panels = DEFAULT_PANELS;
    let source = 'default';
    
    if (pythonBackendUrl) {
      try {
        console.log(`Fetching panels from Python backend: ${pythonBackendUrl}/panels`);
        const response = await fetch(`${pythonBackendUrl}/panels`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.panels && Array.isArray(data.panels) && data.panels.length > 0) {
            // Transform Python backend format to our format
            panels = data.panels.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              features: p.features || [],
              keywords: p.keywords || []
            }));
            source = 'python_backend';
            console.log(`Fetched ${panels.length} panels from Python backend`);
          }
        } else {
          console.warn(`Python backend returned ${response.status}, using defaults`);
        }
      } catch (fetchError) {
        console.warn('Failed to fetch from Python backend:', fetchError);
      }
    } else {
      console.log('No PYTHON_BACKEND_URL configured, using default panels');
    }
    
    // Update cache
    const { error: upsertError } = await supabase
      .from('panel_cache')
      .upsert({
        id: 'panels',
        panels: panels,
        fetched_at: new Date().toISOString(),
        python_backend_url: pythonBackendUrl || null
      });
    
    if (upsertError) {
      console.warn('Failed to update cache:', upsertError);
    }
    
    return new Response(JSON.stringify({
      panels,
      source,
      fetchedAt: new Date().toISOString(),
      pythonBackendUrl: pythonBackendUrl || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-panels:', error);
    
    // Return default panels on error
    return new Response(JSON.stringify({
      panels: DEFAULT_PANELS,
      source: 'error_fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
