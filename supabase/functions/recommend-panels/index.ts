import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PANELS = [
  {
    id: "codon_usage",
    name: "Codon Usage Bias",
    description: "Measures the deviation from uniform codon usage, including ENC, CUB, and RSCU values.",
    features: ["ENC (Effective Number of Codons)", "CUB (Codon Usage Bias)", "RSCU (Relative Synonymous Codon Usage)"],
    keywords: ["codon", "translation", "expression", "efficiency", "ribosome", "protein synthesis", "tRNA"]
  },
  {
    id: "cai",
    name: "Codon Adaptation Index",
    description: "Quantifies how well a gene's codon usage matches highly expressed reference genes.",
    features: ["CAI Score", "wCAI (Weighted CAI)", "Reference Set Comparison"],
    keywords: ["expression", "adaptation", "highly expressed", "translation efficiency", "optimization"]
  },
  {
    id: "mrna_folding",
    name: "mRNA Secondary Structure",
    description: "Predicts RNA folding and calculates minimum free energy profiles.",
    features: ["MFE (Minimum Free Energy)", "Base Pairing Probability", "Structure Entropy"],
    keywords: ["folding", "structure", "stability", "RNA", "secondary structure", "hairpin", "stem-loop", "ribosome binding"]
  },
  {
    id: "gc_content",
    name: "GC Content Analysis",
    description: "Calculates GC content and skew across sequence positions.",
    features: ["GC%", "GC Skew", "AT/GC Ratio"],
    keywords: ["GC", "content", "composition", "stability", "genome", "thermal"]
  },
  {
    id: "rare_codons",
    name: "Rare Codon Analysis",
    description: "Identifies clusters of rare codons that may cause ribosome stalling.",
    features: ["Rare Codon Frequency", "Cluster Detection", "Stalling Propensity"],
    keywords: ["rare", "stalling", "ribosome", "pause", "slow", "bottleneck", "translation"]
  },
  {
    id: "nucleotide_freq",
    name: "Nucleotide Frequency",
    description: "Analyzes positional nucleotide frequencies and dinucleotide patterns.",
    features: ["Position-specific Frequencies", "Dinucleotide Bias", "k-mer Analysis"],
    keywords: ["nucleotide", "frequency", "pattern", "motif", "composition", "bias"]
  }
];

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a bioinformatics expert assistant helping researchers choose sequence feature analysis panels.

Available panels for analysis:
${PANELS.map(p => `- ${p.name} (${p.id}): ${p.description}. Features: ${p.features.join(', ')}. Related to: ${p.keywords.join(', ')}`).join('\n')}

Your task is to analyze the researcher's hypothesis and score ALL panels by relevance. You MUST return all ${PANELS.length} panels with their scores and specific explanations.`;

    const userPrompt = `Based on this research hypothesis, score ALL available panels by relevance:

Hypothesis: "${hypothesis}"
${sequenceCount ? `Dataset: ${sequenceCount} sequences` : ''}
${minLength && maxLength ? `Length range: ${minLength}-${maxLength} nt` : ''}

IMPORTANT: You must return ALL ${PANELS.length} panels (${PANELS.map(p => p.id).join(', ')}), each with:
1. A relevance score from 1-10 based on how relevant it is to this SPECIFIC hypothesis
2. A specific explanation connecting the panel's features to the biological question

Even if a panel seems less relevant, include it with a lower score and explain why it's less applicable.`;

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
