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

interface SingleWindowConfig {
  enabled: boolean;
  windowSize: number;
  stepSize: number;
  numWindows: number;
  startIndex?: number;
  endIndex?: number;
}

interface WindowConfig {
  start?: SingleWindowConfig;
  end?: SingleWindowConfig;
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
    const { sequences, panels, window: windowConfig, referenceSet } = request;

    console.log(`Processing ${sequences.length} sequences with panels:`, Object.keys(panels).filter(p => panels[p]?.enabled));
    console.log('Window config:', JSON.stringify(windowConfig));

    const startTime = Date.now();
    
    const enabledPanels = Object.entries(panels)
      .filter(([_, config]) => config.enabled)
      .map(([id]) => id);

    // Determine if windowed analysis
    const hasWindowing = windowConfig && (windowConfig.start?.enabled || windowConfig.end?.enabled);
    
    let results;
    if (hasWindowing) {
      results = computeWindowedFeatures(sequences, enabledPanels, windowConfig, referenceSet);
    } else {
      results = computeGlobalFeatures(sequences, enabledPanels, referenceSet);
    }

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

// Codon table for translation
const CODON_TABLE: Record<string, string> = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
};

// Synonymous codon families
const SYNONYMOUS_CODONS: Record<string, string[]> = {
  'F': ['TTT', 'TTC'],
  'L': ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
  'I': ['ATT', 'ATC', 'ATA'],
  'M': ['ATG'],
  'V': ['GTT', 'GTC', 'GTA', 'GTG'],
  'S': ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
  'P': ['CCT', 'CCC', 'CCA', 'CCG'],
  'T': ['ACT', 'ACC', 'ACA', 'ACG'],
  'A': ['GCT', 'GCC', 'GCA', 'GCG'],
  'Y': ['TAT', 'TAC'],
  '*': ['TAA', 'TAG', 'TGA'],
  'H': ['CAT', 'CAC'],
  'Q': ['CAA', 'CAG'],
  'N': ['AAT', 'AAC'],
  'K': ['AAA', 'AAG'],
  'D': ['GAT', 'GAC'],
  'E': ['GAA', 'GAG'],
  'C': ['TGT', 'TGC'],
  'W': ['TGG'],
  'R': ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  'G': ['GGT', 'GGC', 'GGA', 'GGG'],
};

// E. coli highly expressed gene codon usage (reference for CAI)
const ECOLI_REFERENCE_WEIGHTS: Record<string, number> = {
  'TTT': 0.296, 'TTC': 1.000, 'TTA': 0.020, 'TTG': 0.020,
  'CTT': 0.042, 'CTC': 0.037, 'CTA': 0.007, 'CTG': 1.000,
  'ATT': 0.489, 'ATC': 1.000, 'ATA': 0.007,
  'ATG': 1.000,
  'GTT': 1.000, 'GTC': 0.185, 'GTA': 0.495, 'GTG': 0.221,
  'TCT': 1.000, 'TCC': 0.744, 'TCA': 0.077, 'TCG': 0.017,
  'CCT': 0.070, 'CCC': 0.012, 'CCA': 0.135, 'CCG': 1.000,
  'ACT': 0.965, 'ACC': 1.000, 'ACA': 0.076, 'ACG': 0.099,
  'GCT': 1.000, 'GCC': 0.122, 'GCA': 0.586, 'GCG': 0.424,
  'TAT': 0.239, 'TAC': 1.000, 'TAA': 1.000, 'TAG': 0.007, 'TGA': 0.029,
  'CAT': 0.291, 'CAC': 1.000, 'CAA': 0.124, 'CAG': 1.000,
  'AAT': 0.051, 'AAC': 1.000, 'AAA': 1.000, 'AAG': 0.253,
  'GAT': 0.434, 'GAC': 1.000, 'GAA': 1.000, 'GAG': 0.259,
  'TGT': 0.500, 'TGC': 1.000, 'TGG': 1.000,
  'CGT': 1.000, 'CGC': 0.356, 'CGA': 0.004, 'CGG': 0.003,
  'AGT': 0.085, 'AGC': 0.410, 'AGA': 0.004, 'AGG': 0.002,
  'GGT': 1.000, 'GGC': 0.724, 'GGA': 0.010, 'GGG': 0.019,
};

function getCodons(sequence: string): string[] {
  const codons: string[] = [];
  const seq = sequence.toUpperCase().replace(/U/g, 'T');
  for (let i = 0; i < seq.length - 2; i += 3) {
    const codon = seq.slice(i, i + 3);
    if (codon.length === 3 && /^[ATGC]{3}$/.test(codon)) {
      codons.push(codon);
    }
  }
  return codons;
}

function calculateGCContent(sequence: string): number {
  const seq = sequence.toUpperCase();
  const gCount = (seq.match(/G/g) || []).length;
  const cCount = (seq.match(/C/g) || []).length;
  return seq.length > 0 ? ((gCount + cCount) / seq.length) * 100 : 0;
}

function calculateGCSkew(sequence: string): number {
  const seq = sequence.toUpperCase();
  const gCount = (seq.match(/G/g) || []).length;
  const cCount = (seq.match(/C/g) || []).length;
  const total = gCount + cCount;
  return total > 0 ? (gCount - cCount) / total : 0;
}

function calculateATGCRatio(sequence: string): number {
  const seq = sequence.toUpperCase();
  const aCount = (seq.match(/A/g) || []).length;
  const tCount = (seq.match(/T/g) || []).length;
  const gCount = (seq.match(/G/g) || []).length;
  const cCount = (seq.match(/C/g) || []).length;
  const gc = gCount + cCount;
  const at = aCount + tCount;
  return gc > 0 ? at / gc : 0;
}

function calculateENC(codons: string[]): number {
  // Effective Number of Codons calculation (Wright 1990)
  const codonCounts: Record<string, number> = {};
  for (const codon of codons) {
    codonCounts[codon] = (codonCounts[codon] || 0) + 1;
  }
  
  // Group by amino acid family
  let enc = 0;
  let familyCount = 0;
  
  for (const [aa, synonymousCodons] of Object.entries(SYNONYMOUS_CODONS)) {
    if (aa === '*' || aa === 'M' || aa === 'W') continue; // Skip single-codon AAs and stops
    
    const counts = synonymousCodons.map(c => codonCounts[c] || 0);
    const n = counts.reduce((a, b) => a + b, 0);
    
    if (n > 1) {
      const k = synonymousCodons.length;
      const sumPi2 = counts.reduce((sum, count) => sum + Math.pow(count / n, 2), 0);
      const F = (n * sumPi2 - 1) / (n - 1);
      
      if (F > 0) {
        enc += 1 / F;
        familyCount++;
      }
    }
  }
  
  // Normalize to standard ENC scale (20-61)
  return familyCount > 0 ? Math.min(61, Math.max(20, 2 + enc)) : 61;
}

function calculateCAI(codons: string[], referenceWeights: Record<string, number>): number {
  // Codon Adaptation Index (Sharp & Li 1987)
  let logSum = 0;
  let count = 0;
  
  for (const codon of codons) {
    const weight = referenceWeights[codon];
    if (weight !== undefined && weight > 0) {
      logSum += Math.log(weight);
      count++;
    }
  }
  
  return count > 0 ? Math.exp(logSum / count) : 0;
}

function calculateRSCU(codons: string[]): Record<string, number> {
  // Relative Synonymous Codon Usage
  const codonCounts: Record<string, number> = {};
  for (const codon of codons) {
    codonCounts[codon] = (codonCounts[codon] || 0) + 1;
  }
  
  const rscu: Record<string, number> = {};
  
  for (const [aa, synonymousCodons] of Object.entries(SYNONYMOUS_CODONS)) {
    const counts = synonymousCodons.map(c => codonCounts[c] || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    const k = synonymousCodons.length;
    
    if (total > 0) {
      for (let i = 0; i < synonymousCodons.length; i++) {
        rscu[synonymousCodons[i]] = (counts[i] / total) * k;
      }
    }
  }
  
  return rscu;
}

function calculateMFEEstimate(sequence: string): number {
  // Simplified MFE estimate based on GC content and length
  // Real MFE requires RNA folding algorithms like ViennaRNA
  const gc = calculateGCContent(sequence);
  const length = sequence.length;
  
  // Approximate: more GC pairs = more stable (more negative MFE)
  // This is a rough estimate, not accurate MFE
  const baseEnergy = -0.1 * length; // Base energy from length
  const gcBonus = -0.5 * (gc / 100) * (length / 3); // GC pairs are stronger
  
  return Math.round((baseEnergy + gcBonus) * 100) / 100;
}

function calculateStructureEntropy(sequence: string): number {
  // Simplified structure entropy based on dinucleotide frequencies
  const seq = sequence.toUpperCase();
  const dinucleotides: Record<string, number> = {};
  let total = 0;
  
  for (let i = 0; i < seq.length - 1; i++) {
    const di = seq.slice(i, i + 2);
    if (/^[ATGC]{2}$/.test(di)) {
      dinucleotides[di] = (dinucleotides[di] || 0) + 1;
      total++;
    }
  }
  
  if (total === 0) return 0;
  
  let entropy = 0;
  for (const count of Object.values(dinucleotides)) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  return Math.round(entropy * 1000) / 1000;
}

function calculateRareCodonFrequency(codons: string[]): number {
  // Count rare codons (those with low usage in E. coli)
  const rareCodons = ['ATA', 'AGA', 'AGG', 'CGA', 'CGG', 'CTA', 'GGA', 'TTA', 'ACA', 'CCC'];
  let rareCount = 0;
  
  for (const codon of codons) {
    if (rareCodons.includes(codon)) {
      rareCount++;
    }
  }
  
  return codons.length > 0 ? (rareCount / codons.length) * 100 : 0;
}

function extractFeatures(
  sequence: string,
  enabledPanels: string[],
  _referenceSet?: string
): Record<string, number | string | null> {
  const features: Record<string, number | string | null> = {};
  const seq = sequence.toUpperCase().replace(/U/g, 'T');
  const codons = getCodons(seq);
  
  // GC Content Panel
  if (enabledPanels.includes('gc_content')) {
    features.gc_content = Math.round(calculateGCContent(seq) * 100) / 100;
    features.gc_skew = Math.round(calculateGCSkew(seq) * 1000) / 1000;
    features.at_gc_ratio = Math.round(calculateATGCRatio(seq) * 1000) / 1000;
  }
  
  // Nucleotide Frequency Panel
  if (enabledPanels.includes('nucleotide_freq')) {
    features.a_freq = Math.round(((seq.match(/A/g) || []).length / seq.length) * 10000) / 100;
    features.t_freq = Math.round(((seq.match(/T/g) || []).length / seq.length) * 10000) / 100;
    features.g_freq = Math.round(((seq.match(/G/g) || []).length / seq.length) * 10000) / 100;
    features.c_freq = Math.round(((seq.match(/C/g) || []).length / seq.length) * 10000) / 100;
    features.length = seq.length;
  }
  
  // Codon Usage Bias Panel
  if (enabledPanels.includes('codon_usage')) {
    features.enc = Math.round(calculateENC(codons) * 100) / 100;
    features.cub = Math.round((61 - calculateENC(codons)) / 41 * 10000) / 100; // Normalized CUB
    features.rare_codon_freq = Math.round(calculateRareCodonFrequency(codons) * 100) / 100;
  }
  
  // CAI Panel
  if (enabledPanels.includes('cai')) {
    features.cai = Math.round(calculateCAI(codons, ECOLI_REFERENCE_WEIGHTS) * 1000) / 1000;
    features.wcai = Math.round(calculateCAI(codons, ECOLI_REFERENCE_WEIGHTS) * 1000) / 1000; // Weighted CAI (same for now)
  }
  
  // mRNA Folding Panel  
  if (enabledPanels.includes('mrna_folding')) {
    features.mfe = calculateMFEEstimate(seq);
    features.structure_entropy = calculateStructureEntropy(seq);
    features.base_pairing_prob = Math.round((calculateGCContent(seq) / 100) * 0.8 * 1000) / 1000; // Simplified estimate
  }
  
  // Rare Codons Panel
  if (enabledPanels.includes('rare_codons')) {
    features.rare_codon_freq = Math.round(calculateRareCodonFrequency(codons) * 100) / 100;
    features.rare_codon_count = codons.filter(c => 
      ['ATA', 'AGA', 'AGG', 'CGA', 'CGG', 'CTA', 'GGA', 'TTA', 'ACA', 'CCC'].includes(c)
    ).length;
    features.stalling_propensity = Math.round(calculateRareCodonFrequency(codons) * 1.5 * 100) / 100;
  }
  
  return features;
}

function computeGlobalFeatures(
  sequences: SequenceInput[],
  enabledPanels: string[],
  referenceSet?: string
) {
  const startTime = Date.now();
  
  const results = sequences.map(seq => {
    const features = extractFeatures(seq.sequence, enabledPanels, referenceSet);
    return {
      sequenceId: seq.id,
      sequenceName: seq.name || seq.id,
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
    },
  };
}

function computeWindowedFeatures(
  sequences: SequenceInput[],
  enabledPanels: string[],
  windowConfig: WindowConfig,
  referenceSet?: string
) {
  const startTime = Date.now();
  const results: Array<{
    sequenceId: string;
    sequenceName?: string;
    windowStart: number;
    windowEnd: number;
    windowType: 'start' | 'end';
    features: Record<string, number | string | null>;
  }> = [];

  let totalWindows = 0;

  for (const seq of sequences) {
    const sequence = seq.sequence.toUpperCase().replace(/U/g, 'T');
    const seqLength = sequence.length;
    
    // Process start windows
    if (windowConfig.start?.enabled) {
      const { windowSize, stepSize, numWindows, startIndex = 0, endIndex } = windowConfig.start;
      const effectiveEnd = endIndex ?? seqLength;
      
      let windowCount = 0;
      for (let start = startIndex; start + windowSize <= effectiveEnd && windowCount < numWindows; start += stepSize) {
        const windowSeq = sequence.slice(start, start + windowSize);
        const features = extractFeatures(windowSeq, enabledPanels, referenceSet);
        
        results.push({
          sequenceId: seq.id,
          sequenceName: seq.name,
          windowStart: start,
          windowEnd: start + windowSize,
          windowType: 'start',
          features,
        });
        totalWindows++;
        windowCount++;
      }
    }
    
    // Process end windows
    if (windowConfig.end?.enabled) {
      const { windowSize, stepSize, numWindows, startIndex = 0, endIndex } = windowConfig.end;
      const effectiveEnd = endIndex ?? seqLength;
      
      // Calculate windows from the end
      const windowStarts: number[] = [];
      let currentEnd = effectiveEnd;
      
      while (currentEnd - windowSize >= startIndex && windowStarts.length < numWindows) {
        windowStarts.push(currentEnd - windowSize);
        currentEnd -= stepSize;
      }
      
      // Reverse to go from furthest to closest to end
      windowStarts.reverse();
      
      for (const start of windowStarts) {
        const windowSeq = sequence.slice(start, start + windowSize);
        const features = extractFeatures(windowSeq, enabledPanels, referenceSet);
        
        results.push({
          sequenceId: seq.id,
          sequenceName: seq.name,
          windowStart: start,
          windowEnd: start + windowSize,
          windowType: 'end',
          features,
        });
        totalWindows++;
      }
    }
  }

  return {
    success: true,
    mode: 'windowed',
    results,
    metadata: {
      totalSequences: sequences.length,
      totalWindows,
      panelsComputed: enabledPanels,
      computeTimeMs: Date.now() - startTime,
      windowConfig,
    },
  };
}
