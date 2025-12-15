// Feature extraction types for genetic sequence analysis

export interface SequenceInput {
  id: string;
  sequence: string;
  name?: string;
  annotations?: Record<string, string>;
}

export interface SingleWindowConfig {
  enabled: boolean;
  windowSize: number;
  stepSize: number;
  numWindows?: number; // Maximum number of windows to generate (calculated from sequence length if not provided)
  startIndex?: number;
  endIndex?: number;
}

export interface WindowConfig {
  start: SingleWindowConfig;
  end: SingleWindowConfig;
}

export interface FeatureConfig {
  enabled: boolean;
  params?: Record<string, unknown>;
}

export interface FeaturePanelConfig {
  [key: string]: FeatureConfig;
}

export interface FeatureExtractionRequest {
  sequences: SequenceInput[];
  panels: Partial<FeaturePanelConfig>;
  window?: WindowConfig;
  referenceSet?: string;
}

// Response types for feature results
export interface GlobalFeatureResult {
  sequenceId: string;
  sequenceName?: string;
  features: Record<string, number | string | null>;
}

export interface WindowedFeatureResult {
  sequenceId: string;
  sequenceName?: string;
  windowStart?: number; // Optional - global results in windowed mode don't have this
  windowEnd?: number;
  windowType?: 'start' | 'end';
  features: Record<string, number | string | null>;
}

export interface FeatureExtractionResponse {
  success: boolean;
  mode: 'global' | 'windowed';
  results: GlobalFeatureResult[] | WindowedFeatureResult[];
  metadata: {
    totalSequences: number;
    totalWindows?: number;
    panelsComputed: string[];
    computeTimeMs: number;
  };
  errors?: Array<{
    sequenceId: string;
    panel: string;
    error: string;
  }>;
}

// Panel definitions for UI
export interface FeaturePanel {
  id: string;
  name: string;
  description: string;
  category: 'sequence' | 'chemical' | 'structure' | 'regulatory';
  features: FeatureDefinition[];
  supportsWindowed: boolean;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  dataType: 'numeric' | 'categorical' | 'boolean';
  unit?: string;
}

// UI-enriched panel definitions - provides detailed feature info for display
// The actual panels are fetched dynamically from Python backend via usePanels hook
// This map provides UI-specific metadata (units, data types, etc.) for known panels
export const PANEL_UI_DEFINITIONS: Record<string, Omit<FeaturePanel, 'id'>> = {
  sequence: {
    name: 'Sequence Composition',
    description: 'Nucleotide composition, GC content, sequence length metrics',
    category: 'sequence',
    supportsWindowed: true,
    features: [
      { id: 'gc_content', name: 'GC Content', description: 'Percentage of G and C nucleotides', dataType: 'numeric', unit: '%' },
      { id: 'at_content', name: 'AT Content', description: 'Percentage of A and T nucleotides', dataType: 'numeric', unit: '%' },
      { id: 'length', name: 'Sequence Length', description: 'Total number of nucleotides', dataType: 'numeric', unit: 'bp' },
      { id: 'a_count', name: 'Adenine Count', description: 'Number of A nucleotides', dataType: 'numeric' },
      { id: 't_count', name: 'Thymine Count', description: 'Number of T nucleotides', dataType: 'numeric' },
      { id: 'g_count', name: 'Guanine Count', description: 'Number of G nucleotides', dataType: 'numeric' },
      { id: 'c_count', name: 'Cytosine Count', description: 'Number of C nucleotides', dataType: 'numeric' },
    ]
  },
  chemical: {
    name: 'Chemical Properties',
    description: 'Isoelectric point, instability index, molecular weight, GRAVY, aromaticity',
    category: 'chemical',
    supportsWindowed: true,
    features: [
      { id: 'isoelectric_point', name: 'Isoelectric Point', description: 'pH at which protein has no net charge', dataType: 'numeric' },
      { id: 'instability_index', name: 'Instability Index', description: 'Protein stability prediction', dataType: 'numeric' },
      { id: 'molecular_weight', name: 'Molecular Weight', description: 'Molecular mass of the protein', dataType: 'numeric', unit: 'Da' },
      { id: 'gravy', name: 'GRAVY', description: 'Grand average of hydropathicity', dataType: 'numeric' },
      { id: 'aromaticity_index', name: 'Aromaticity Index', description: 'Relative frequency of aromatic amino acids', dataType: 'numeric' },
    ]
  },
  codonUsage: {
    name: 'Codon Usage Bias',
    description: 'ENC, RCBS, RSCU, CPB, DCBS, CAI, and FOP metrics',
    category: 'sequence',
    supportsWindowed: true,
    features: [
      { id: 'enc', name: 'Effective Number of Codons', description: 'ENC measure of codon bias', dataType: 'numeric' },
      { id: 'rcbs', name: 'RCBS', description: 'Relative codon bias strength', dataType: 'numeric' },
      { id: 'rscu', name: 'RSCU', description: 'Relative synonymous codon usage', dataType: 'numeric' },
      { id: 'cpb', name: 'CPB', description: 'Codon pair bias', dataType: 'numeric' },
      { id: 'dcbs', name: 'DCBS', description: 'Directional codon bias strength', dataType: 'numeric' },
      { id: 'cai', name: 'CAI', description: 'Codon adaptation index', dataType: 'numeric' },
      { id: 'fop', name: 'FOP', description: 'Frequency of optimal codons', dataType: 'numeric' },
    ]
  },
  disorder: {
    name: 'Disorder Prediction',
    description: 'Intrinsic disorder propensity using IUPred',
    category: 'structure',
    supportsWindowed: true,
    features: [
      { id: 'iupred_score', name: 'IUPred Score', description: 'Intrinsic disorder prediction score', dataType: 'numeric' },
      { id: 'disorder_regions', name: 'Disordered Regions', description: 'Number of disordered regions', dataType: 'numeric' },
      { id: 'disorder_fraction', name: 'Disorder Fraction', description: 'Fraction of sequence predicted disordered', dataType: 'numeric', unit: '%' },
    ]
  },
  structure: {
    name: 'Structure Features',
    description: 'Secondary structure propensity predictions',
    category: 'structure',
    supportsWindowed: true,
    features: [
      { id: 'helix_propensity', name: 'Helix Propensity', description: 'Predicted alpha-helix content', dataType: 'numeric', unit: '%' },
      { id: 'sheet_propensity', name: 'Sheet Propensity', description: 'Predicted beta-sheet content', dataType: 'numeric', unit: '%' },
      { id: 'coil_propensity', name: 'Coil Propensity', description: 'Predicted random coil content', dataType: 'numeric', unit: '%' },
    ]
  },
  motif: {
    name: 'Motif Analysis',
    description: 'JASPAR motif scanning and regulatory element detection',
    category: 'regulatory',
    supportsWindowed: false,
    features: [
      { id: 'motif_count', name: 'Motif Count', description: 'Number of detected motifs', dataType: 'numeric' },
      { id: 'motif_density', name: 'Motif Density', description: 'Motifs per kilobase', dataType: 'numeric', unit: 'per kb' },
      { id: 'top_motifs', name: 'Top Motifs', description: 'Most significant motifs found', dataType: 'categorical' },
    ]
  },
};

// Helper to build FeaturePanel from dynamic panel data and UI definitions
export function buildFeaturePanel(panel: { id: string; name: string; description: string; features: string[] }): FeaturePanel {
  const uiDef = PANEL_UI_DEFINITIONS[panel.id];
  
  if (uiDef) {
    // Use full UI definition if available
    return {
      id: panel.id,
      ...uiDef
    };
  }
  
  // Fallback for unknown panels - create basic definition from backend data
  return {
    id: panel.id,
    name: panel.name,
    description: panel.description,
    category: 'sequence', // Default category
    supportsWindowed: true,
    features: panel.features.map(f => ({
      id: f.toLowerCase().replace(/\s+/g, '_'),
      name: f,
      description: f,
      dataType: 'numeric' as const
    }))
  };
}

// Legacy export for backward compatibility - will be replaced by usePanels hook
export const FEATURE_PANELS: FeaturePanel[] = Object.entries(PANEL_UI_DEFINITIONS).map(
  ([id, def]) => ({ id, ...def })
);
