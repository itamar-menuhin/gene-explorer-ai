/**
 * Recommend Panels Edge Function
 * 
 * PURPOSE: AI-powered recommendation of feature analysis panels based on researcher's hypothesis
 * 
 * CALLED BY:
 *   - usePanelRecommendations hook (src/hooks/usePanelRecommendations.ts)
 *   - Via: supabase.functions.invoke('recommend-panels', { body: { hypothesis, ... } })
 * 
 * USED IN:
 *   - NewAnalysis page (src/pages/NewAnalysis.tsx) - Guided analysis mode
 *   - User enters research hypothesis, gets AI-powered panel recommendations
 * 
 * FLOW:
 *   1. Receives hypothesis and optional dataset metadata from frontend
 *   2. Fetches panels from get-panels function (cached from Python backend)
 *   3. Loads prompts from centralized location (../prompts/recommend-panels-prompts.ts)
 *   4. Calls AI model (google/gemini-2.5-flash) via Lovable AI Gateway
 *   5. AI scores all available panels (1-10) with explanations
 *   6. Returns enriched recommendations sorted by relevance score
 * 
 * AI MODEL: google/gemini-2.5-flash
 * PROMPTS: /supabase/functions/prompts/recommend-panels-prompts.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/recommend-panels-prompts.ts";
import type { Panel } from "../types/panels.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function getPanels(supabase: any): Promise<Panel[]> {
  try {
    // First try to get from cache table directly
    const { data: cached } = await supabase
      .from('panel_cache')
      .select('panels')
      .eq('id', 'panels')
      .single();
    
    if (cached?.panels && Array.isArray(cached.panels) && cached.panels.length > 0) {
      console.log('Using cached panels for recommendations');
      return cached.panels;
    }
  } catch (cacheError) {
    console.warn('Failed to read panel cache:', cacheError);
  }
  
  console.log('Using default panels for recommendations');
  return DEFAULT_PANELS;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hypothesis, sequenceCount, minLength, maxLength } = await req.json();
    
    if (!hypothesis) {
      return new Response(JSON.stringify({ error: 'Hypothesis is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get panels dynamically from cache
    const PANELS = await getPanels(supabase);
    console.log(`Using ${PANELS.length} panels for recommendation`);

    // Build prompts using centralized prompt builder functions
    // See: /supabase/functions/prompts/recommend-panels-prompts.ts for prompt definitions
    const systemPrompt = buildSystemPrompt(PANELS);
    const userPrompt = buildUserPrompt(hypothesis, PANELS, sequenceCount, minLength, maxLength);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'recommend_panels',
            description: 'Return panel recommendations with relevance explanations',
            parameters: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      panelId: { type: 'string', description: 'Panel ID from the available panels' },
                      relevanceScore: { type: 'number', description: 'Score 1-10 indicating relevance to hypothesis' },
                      relevanceExplanation: { type: 'string', description: 'Specific explanation of why this panel is relevant to the hypothesis' }
                    },
                    required: ['panelId', 'relevanceScore', 'relevanceExplanation']
                  }
                }
              },
              required: ['recommendations']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'recommend_panels' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No recommendations returned from AI');
    }

    const recommendations = JSON.parse(toolCall.function.arguments);
    
    // Enrich with full panel data
    const enrichedRecommendations = recommendations.recommendations.map((rec: any) => {
      const panel = PANELS.find(p => p.id === rec.panelId);
      return {
        ...rec,
        panel: panel || null
      };
    }).filter((rec: any) => rec.panel !== null)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    return new Response(JSON.stringify({ recommendations: enrichedRecommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recommend-panels:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
