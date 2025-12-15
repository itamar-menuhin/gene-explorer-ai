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
 *   2. Uses default panels (cached from Python backend)
 *   3. Calls AI model (google/gemini-2.5-flash-lite) - fastest model
 *   4. AI scores all available panels (1-10) with explanations
 *   5. Returns enriched recommendations sorted by relevance score
 * 
 * AI MODEL: google/gemini-2.5-flash-lite (fastest)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { Panel } from "../types/panels.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default panels
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hypothesis, sequenceCount, minLength, maxLength } = await req.json();
    console.log('Received hypothesis:', hypothesis?.slice(0, 100));
    
    if (!hypothesis) {
      return new Response(JSON.stringify({ error: 'Hypothesis is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const PANELS = DEFAULT_PANELS;
    console.log(`Using ${PANELS.length} default panels`);

    // Build a simple prompt that asks for JSON output directly
    const panelList = PANELS.map(p => `- ${p.id}: ${p.name} - ${p.description}`).join('\n');
    
    const prompt = `You are a bioinformatics expert. Given a research hypothesis, score each feature panel's relevance (1-10) and explain why.

AVAILABLE PANELS:
${panelList}

HYPOTHESIS: "${hypothesis}"
${sequenceCount ? `Dataset: ${sequenceCount} sequences, lengths ${minLength}-${maxLength}bp` : ''}

Return ONLY a valid JSON array with this exact format (no markdown, no explanation):
[{"panelId":"sequence","relevanceScore":8,"relevanceExplanation":"Brief reason"},...]

Score all ${PANELS.length} panels. Higher scores = more relevant.`;

    console.log('Calling AI...');
    
    // Use AbortController with 20 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Fastest model
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('AI response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('AI response length:', content.length);
    
    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    
    let recommendations;
    try {
      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', jsonStr.slice(0, 200));
      // Return default recommendations if parsing fails
      recommendations = PANELS.map(p => ({
        panelId: p.id,
        relevanceScore: p.id === 'sequence' || p.id === 'codonUsage' ? 8 : 5,
        relevanceExplanation: `${p.name} may be relevant to your analysis.`
      }));
    }
    
    // Enrich with full panel data
    const enrichedRecommendations = recommendations
      .map((rec: any) => {
        const panel = PANELS.find(p => p.id === rec.panelId);
        return panel ? { ...rec, panel } : null;
      })
      .filter((rec: any) => rec !== null)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    console.log(`Returning ${enrichedRecommendations.length} recommendations`);
    
    return new Response(JSON.stringify({ recommendations: enrichedRecommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recommend-panels:', error);
    
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        errorMessage = 'Request timeout - AI service took too long. Please try again.';
        statusCode = 504;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error connecting to AI service. Please try again.';
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
