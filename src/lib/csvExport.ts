import { ParsedSequence } from './sequenceParser';

export interface FeatureData {
  sequenceId: string;
  sequenceName: string;
  sequenceLength: number;
  features: Record<string, number | null>;
  annotations?: Record<string, string>;
  windowStart?: number;
  windowEnd?: number;
}

export interface ExportOptions {
  includeMetadata: boolean;
  includeAnnotations: boolean;
  delimiter: ',' | '\t';
}

/**
 * Get the unique sequence count from feature data.
 * Handles both global and windowed results correctly by counting unique sequence IDs.
 * 
 * @param featureData - Array of feature data (may include both global and windowed results)
 * @returns Number of unique sequences
 */
export function getUniqueSequenceCount(featureData: FeatureData[]): number {
  if (featureData.length === 0) return 0;
  const uniqueIds = new Set(featureData.map(d => d.sequenceId));
  return uniqueIds.size;
}

/**
 * Generate CSV for windowed data with global and per-window values
 * For each sequence, includes one row with: global value + window_1 + window_2 + ... + window_N
 */
export function generateWindowedCSV(
  data: FeatureData[],
  featureNames: string[],
  options: ExportOptions = { includeMetadata: true, includeAnnotations: true, delimiter: ',' }
): string {
  const { includeMetadata, includeAnnotations, delimiter } = options;
  
  if (data.length === 0) return '';

  // Group data by sequence ID
  const sequenceMap = new Map<string, { 
    global: FeatureData | null;
    windows: FeatureData[];
  }>();

  // Separate global and windowed results
  data.forEach(item => {
    if (!sequenceMap.has(item.sequenceId)) {
      sequenceMap.set(item.sequenceId, { global: null, windows: [] });
    }
    const seqData = sequenceMap.get(item.sequenceId)!;
    
    if (item.windowStart !== undefined && item.windowEnd !== undefined) {
      // This is a windowed result
      seqData.windows.push(item);
    } else {
      // This is a global result
      seqData.global = item;
    }
  });

  // Sort windows by start position for each sequence
  sequenceMap.forEach(seqData => {
    seqData.windows.sort((a, b) => (a.windowStart || 0) - (b.windowStart || 0));
  });

  // Build headers
  const headers: string[] = ['sequence_id', 'sequence_name'];
  
  if (includeMetadata) {
    headers.push('sequence_length');
  }
  
  // Add annotation columns if present
  const firstItem = data[0];
  const annotationKeys = includeAnnotations && firstItem.annotations 
    ? Object.keys(firstItem.annotations) 
    : [];
  headers.push(...annotationKeys);
  
  // Add feature columns: global + each window
  const maxWindows = Math.max(...Array.from(sequenceMap.values()).map(s => s.windows.length));
  featureNames.forEach(feature => {
    headers.push(`${feature}_global`);
    for (let i = 0; i < maxWindows; i++) {
      headers.push(`${feature}_window_${i + 1}`);
    }
  });

  // Build data rows
  const rows: string[] = [];
  sequenceMap.forEach((seqData, seqId) => {
    const row: string[] = [
      escapeCSV(seqId, delimiter),
      escapeCSV(seqData.global?.sequenceName || seqId, delimiter)
    ];
    
    if (includeMetadata) {
      row.push(String(seqData.global?.sequenceLength || 0));
    }
    
    // Add annotation values
    annotationKeys.forEach(key => {
      row.push(escapeCSV(seqData.global?.annotations?.[key] || '', delimiter));
    });
    
    // Add feature values: global + windows
    featureNames.forEach(feature => {
      // Global value
      const globalValue = seqData.global?.features[feature];
      if (globalValue !== null && globalValue !== undefined) {
        const numValue = typeof globalValue === 'number' ? roundToThreeDecimals(globalValue) : globalValue;
        row.push(String(numValue));
      } else {
        row.push('');
      }
      
      // Window values
      for (let i = 0; i < maxWindows; i++) {
        if (i < seqData.windows.length) {
          const windowValue = seqData.windows[i].features[feature];
          if (windowValue !== null && windowValue !== undefined) {
            const numValue = typeof windowValue === 'number' ? roundToThreeDecimals(windowValue) : windowValue;
            row.push(String(numValue));
          } else {
            row.push('');
          }
        } else {
          row.push('');
        }
      }
    });
    
    rows.push(row.join(delimiter));
  });

  return [headers.join(delimiter), ...rows].join('\n');
}

export function generateCSV(
  data: FeatureData[],
  featureNames: string[],
  options: ExportOptions = { includeMetadata: true, includeAnnotations: true, delimiter: ',' }
): string {
  const { includeMetadata, includeAnnotations, delimiter } = options;
  
  if (data.length === 0) return '';

  // Check if this is windowed data
  const hasWindows = data.some(item => item.windowStart !== undefined);
  if (hasWindows) {
    return generateWindowedCSV(data, featureNames, options);
  }

  // Build header row for global data
  const headers: string[] = ['sequence_id', 'sequence_name'];
  
  if (includeMetadata) {
    headers.push('sequence_length');
  }
  
  // Add annotation columns if present and requested
  const annotationKeys = includeAnnotations && data[0].annotations 
    ? Object.keys(data[0].annotations) 
    : [];
  headers.push(...annotationKeys);
  
  // Add feature columns
  headers.push(...featureNames);

  // Build data rows
  const rows = data.map(item => {
    const row: string[] = [
      escapeCSV(item.sequenceId, delimiter),
      escapeCSV(item.sequenceName, delimiter)
    ];
    
    if (includeMetadata) {
      row.push(String(item.sequenceLength));
    }
    
    // Add annotation values
    annotationKeys.forEach(key => {
      row.push(escapeCSV(item.annotations?.[key] || '', delimiter));
    });
    
    // Add feature values (rounded to nearest 0.001)
    featureNames.forEach(feature => {
      const value = item.features[feature];
      if (value !== null && value !== undefined) {
        const numValue = typeof value === 'number' ? roundToThreeDecimals(value) : value;
        row.push(String(numValue));
      } else {
        row.push('');
      }
    });
    
    return row.join(delimiter);
  });

  return [headers.join(delimiter), ...rows].join('\n');
}

function escapeCSV(value: string, delimiter: string): string {
  const str = String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function roundToThreeDecimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCitationsExport(citations: { title: string; authors: string; year: number; journal: string; doi?: string }[]): string {
  return citations.map(c => 
    `${c.authors} (${c.year}). ${c.title}. ${c.journal}.${c.doi ? ` DOI: ${c.doi}` : ''}`
  ).join('\n\n');
}

// Mock feature data generator for demo purposes
export function generateMockFeatureData(sequences: ParsedSequence[], panels: string[]): FeatureData[] {
  const featuresByPanel: Record<string, string[]> = {
    sequence: ['gc_content', 'at_content', 'length', 'a_count', 't_count', 'g_count', 'c_count'],
    chemical: ['isoelectric_point', 'instability_index', 'molecular_weight', 'gravy', 'aromaticity_index'],
    codonUsage: ['enc', 'cai', 'rcbs', 'rscu', 'cpb', 'dcbs', 'fop'],
    disorder: ['iupred_score', 'disorder_regions', 'disorder_fraction'],
    structure: ['helix_propensity', 'sheet_propensity', 'coil_propensity'],
    motif: ['motif_count', 'motif_density', 'top_motifs']
  };

  return sequences.map(seq => {
    const features: Record<string, number> = {};
    
    panels.forEach(panelId => {
      const panelFeatures = featuresByPanel[panelId] || [];
      panelFeatures.forEach(feature => {
        // Generate mock values based on feature type
        if (feature === 'enc') features[feature] = 30 + Math.random() * 30;
        else if (feature === 'cai' || feature === 'fop') features[feature] = 0.3 + Math.random() * 0.5;
        else if (feature === 'gc_content' || feature === 'at_content') features[feature] = 40 + Math.random() * 20;
        else if (feature.includes('count')) features[feature] = Math.floor(seq.length * (0.2 + Math.random() * 0.1));
        else if (feature === 'length') features[feature] = seq.length;
        else if (feature.includes('propensity') || feature.includes('fraction')) features[feature] = Math.random() * 100;
        else features[feature] = Math.random();
      });
    });

    return {
      sequenceId: seq.id,
      sequenceName: seq.name,
      sequenceLength: seq.length,
      features,
      annotations: seq.annotations
    };
  });
}

export function getAllFeatureNames(panels: string[]): string[] {
  const featuresByPanel: Record<string, string[]> = {
    sequence: ['gc_content', 'at_content', 'length', 'a_count', 't_count', 'g_count', 'c_count'],
    chemical: ['isoelectric_point', 'instability_index', 'molecular_weight', 'gravy', 'aromaticity_index'],
    codonUsage: ['enc', 'cai', 'rcbs', 'rscu', 'cpb', 'dcbs', 'fop'],
    disorder: ['iupred_score', 'disorder_regions', 'disorder_fraction'],
    structure: ['helix_propensity', 'sheet_propensity', 'coil_propensity'],
    motif: ['motif_count', 'motif_density', 'top_motifs']
  };

  const features: string[] = [];
  panels.forEach(panelId => {
    const panelFeatures = featuresByPanel[panelId] || [];
    features.push(...panelFeatures);
  });
  return features;
}
