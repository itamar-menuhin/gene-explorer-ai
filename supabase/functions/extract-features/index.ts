import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SequenceInput {
  id: string;
  sequence: string;
  name?: string;
}

interface WindowConfig {
  enabled: boolean;
  windowSize: number;
  stepSize: number;
}

interface FeatureExtractionRequest {
  sequences: SequenceInput[];
  panels: Record<string, { enabled: boolean; params?: Record<string, unknown> }>;
  window?: WindowConfig;
  referenceSet?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: FeatureExtractionRequest = await req.json();
    const { sequences, panels, window: windowConfig } = request;

    console.log(`Processing ${sequences.length} sequences with panels:`, Object.keys(panels).filter(p => panels[p]?.enabled));

    // Get Python backend URL from environment
    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');
    
    if (!pythonBackendUrl) {
      // If no Python backend configured, use local computation fallback
      console.log('No Python backend configured, using local computation');
      const results = computeFeaturesLocally(sequences, panels, windowConfig);
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Forward request to Python backend
    console.log(`Forwarding to Python backend: ${pythonBackendUrl}`);
    const startTime = Date.now();
    
    const backendResponse = await fetch(`${pythonBackendUrl}/extract-features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Python backend error:', errorText);
      throw new Error(`Python backend error: ${backendResponse.status}`);
    }

    const results = await backendResponse.json();
    const computeTime = Date.now() - startTime;
    
    console.log(`Feature extraction completed in ${computeTime}ms`);

    return new Response(JSON.stringify({
      ...results,
      metadata: {
        ...results.metadata,
        computeTimeMs: computeTime,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Feature extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Local fallback computation for basic features
function computeFeaturesLocally(
  sequences: SequenceInput[],
  panels: Record<string, { enabled: boolean }>,
  windowConfig?: WindowConfig
) {
  const startTime = Date.now();
  const enabledPanels = Object.entries(panels)
    .filter(([_, config]) => config.enabled)
    .map(([id]) => id);

  const isWindowed = windowConfig?.enabled && windowConfig.windowSize > 0;
  
  if (isWindowed) {
    return computeWindowedFeatures(sequences, enabledPanels, windowConfig!, startTime);
  } else {
    return computeGlobalFeatures(sequences, enabledPanels, startTime);
  }
}

function computeGlobalFeatures(
  sequences: SequenceInput[],
  enabledPanels: string[],
  startTime: number
) {
  const results = sequences.map(seq => {
    const features: Record<string, number | string | null> = {};
    const sequence = seq.sequence.toUpperCase();

    if (enabledPanels.includes('sequence')) {
      const aCount = (sequence.match(/A/g) || []).length;
      const tCount = (sequence.match(/T/g) || []).length;
      const gCount = (sequence.match(/G/g) || []).length;
      const cCount = (sequence.match(/C/g) || []).length;
      const total = sequence.length;

      features.length = total;
      features.a_count = aCount;
      features.t_count = tCount;
      features.g_count = gCount;
      features.c_count = cCount;
      features.gc_content = total > 0 ? ((gCount + cCount) / total) * 100 : 0;
      features.at_content = total > 0 ? ((aCount + tCount) / total) * 100 : 0;
    }

    if (enabledPanels.includes('chemical')) {
      // Simplified molecular weight calculation (average nucleotide MW)
      const avgNucleotideMW = 330; // Da
      features.molecular_weight = sequence.length * avgNucleotideMW;
      
      // Simplified Tm calculation (Wallace rule for short sequences)
      const aCount = (sequence.match(/A/g) || []).length;
      const tCount = (sequence.match(/T/g) || []).length;
      const gCount = (sequence.match(/G/g) || []).length;
      const cCount = (sequence.match(/C/g) || []).length;
      
      if (sequence.length < 14) {
        features.melting_temp = 2 * (aCount + tCount) + 4 * (gCount + cCount);
      } else {
        features.melting_temp = 64.9 + 41 * (gCount + cCount - 16.4) / sequence.length;
      }
      
      // Extinction coefficient estimation
      features.extinction_coeff = aCount * 15400 + tCount * 8700 + gCount * 11500 + cCount * 7400;
    }

    return {
      sequenceId: seq.id,
      features,
    };
  });

  return {
    success: true,
    mode: 'global',
    results,
    metadata: {
      totalSequences: sequences.length,
      panelsComputed: enabledPanels,
      computeTimeMs: Date.now() - startTime,
      computedLocally: true,
    },
  };
}

function computeWindowedFeatures(
  sequences: SequenceInput[],
  enabledPanels: string[],
  windowConfig: WindowConfig,
  startTime: number
) {
  const { windowSize, stepSize } = windowConfig;
  const results: Array<{
    sequenceId: string;
    windowStart: number;
    windowEnd: number;
    features: Record<string, number | string | null>;
  }> = [];

  let totalWindows = 0;

  for (const seq of sequences) {
    const sequence = seq.sequence.toUpperCase();
    
    for (let start = 0; start + windowSize <= sequence.length; start += stepSize) {
      const windowSeq = sequence.slice(start, start + windowSize);
      const features: Record<string, number | string | null> = {};

      if (enabledPanels.includes('sequence')) {
        const aCount = (windowSeq.match(/A/g) || []).length;
        const tCount = (windowSeq.match(/T/g) || []).length;
        const gCount = (windowSeq.match(/G/g) || []).length;
        const cCount = (windowSeq.match(/C/g) || []).length;

        features.gc_content = ((gCount + cCount) / windowSize) * 100;
        features.at_content = ((aCount + tCount) / windowSize) * 100;
        features.a_count = aCount;
        features.t_count = tCount;
        features.g_count = gCount;
        features.c_count = cCount;
      }

      if (enabledPanels.includes('chemical')) {
        const gCount = (windowSeq.match(/G/g) || []).length;
        const cCount = (windowSeq.match(/C/g) || []).length;
        const aCount = (windowSeq.match(/A/g) || []).length;
        const tCount = (windowSeq.match(/T/g) || []).length;
        
        features.melting_temp = windowSize < 14 
          ? 2 * (aCount + tCount) + 4 * (gCount + cCount)
          : 64.9 + 41 * (gCount + cCount - 16.4) / windowSize;
      }

      results.push({
        sequenceId: seq.id,
        windowStart: start,
        windowEnd: start + windowSize,
        features,
      });
      totalWindows++;
    }
  }

  return {
    success: true,
    mode: 'windowed',
    results,
    metadata: {
      totalSequences: sequences.length,
      totalWindows,
      windowSize,
      stepSize,
      panelsComputed: enabledPanels,
      computeTimeMs: Date.now() - startTime,
      computedLocally: true,
    },
  };
}
