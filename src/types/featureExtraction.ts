// Feature extraction types for genetic sequence analysis

export interface SequenceInput {
  id: string;
  sequence: string;
  name?: string;
  annotations?: Record<string, string>;
}

export interface WindowConfig {
  enabled: boolean;
  windowSize: number;
  stepSize: number;
}

export interface FeatureConfig {
  enabled: boolean;
  params?: Record<string, unknown>;
}

export interface FeaturePanelConfig {
  sequence: FeatureConfig;
  chemical: FeatureConfig;
  disorder: FeatureConfig;
  structure: FeatureConfig;
  motif: FeatureConfig;
  codonUsage: FeatureConfig;
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
  features: Record<string, number | string | null>;
}

export interface WindowedFeatureResult {
  sequenceId: string;
  windowStart: number;
  windowEnd: number;
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

// Available feature panels
export const FEATURE_PANELS: FeaturePanel[] = [
  {
    id: 'sequence',
    name: 'Sequence Composition',
    description: 'Nucleotide composition, GC content, k-mer frequencies',
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
  {
    id: 'chemical',
    name: 'Chemical Properties',
    description: 'Molecular weight, melting temperature, thermodynamic properties',
    category: 'chemical',
    supportsWindowed: true,
    features: [
      { id: 'molecular_weight', name: 'Molecular Weight', description: 'Molecular mass of the sequence', dataType: 'numeric', unit: 'Da' },
      { id: 'melting_temp', name: 'Melting Temperature', description: 'Predicted Tm using nearest-neighbor method', dataType: 'numeric', unit: '°C' },
      { id: 'extinction_coeff', name: 'Extinction Coefficient', description: 'Molar extinction coefficient at 260nm', dataType: 'numeric', unit: 'M⁻¹cm⁻¹' },
    ]
  },
  {
    id: 'disorder',
    name: 'Disorder Prediction',
    description: 'Intrinsic disorder propensity using IUPred and MoreRONN',
    category: 'structure',
    supportsWindowed: true,
    features: [
      { id: 'iupred_score', name: 'IUPred Score', description: 'Intrinsic disorder prediction score', dataType: 'numeric' },
      { id: 'disorder_regions', name: 'Disordered Regions', description: 'Number of disordered regions', dataType: 'numeric' },
      { id: 'disorder_fraction', name: 'Disorder Fraction', description: 'Fraction of sequence predicted disordered', dataType: 'numeric', unit: '%' },
    ]
  },
  {
    id: 'structure',
    name: 'Structure Features',
    description: 'Secondary structure predictions and structural properties',
    category: 'structure',
    supportsWindowed: true,
    features: [
      { id: 'helix_propensity', name: 'Helix Propensity', description: 'Predicted alpha-helix content', dataType: 'numeric', unit: '%' },
      { id: 'sheet_propensity', name: 'Sheet Propensity', description: 'Predicted beta-sheet content', dataType: 'numeric', unit: '%' },
      { id: 'coil_propensity', name: 'Coil Propensity', description: 'Predicted random coil content', dataType: 'numeric', unit: '%' },
    ]
  },
  {
    id: 'motif',
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
  {
    id: 'codonUsage',
    name: 'Codon Usage',
    description: 'Codon adaptation index and usage bias analysis',
    category: 'sequence',
    supportsWindowed: false,
    features: [
      { id: 'cai', name: 'Codon Adaptation Index', description: 'CAI score relative to reference organism', dataType: 'numeric' },
      { id: 'enc', name: 'Effective Number of Codons', description: 'ENC measure of codon bias', dataType: 'numeric' },
      { id: 'rscu', name: 'RSCU Values', description: 'Relative synonymous codon usage', dataType: 'categorical' },
    ]
  },
];
