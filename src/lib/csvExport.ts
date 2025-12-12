import { ParsedSequence } from './sequenceParser';

export interface FeatureData {
  sequenceId: string;
  sequenceName: string;
  sequenceLength: number;
  features: Record<string, number | null>;
  annotations?: Record<string, string>;
}

export interface ExportOptions {
  includeMetadata: boolean;
  includeAnnotations: boolean;
  delimiter: ',' | '\t';
}

export function generateCSV(
  data: FeatureData[],
  featureNames: string[],
  options: ExportOptions = { includeMetadata: true, includeAnnotations: true, delimiter: ',' }
): string {
  const { includeMetadata, includeAnnotations, delimiter } = options;
  
  if (data.length === 0) return '';

  // Build header row
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
        const numValue = typeof value === 'number' ? Math.round(value * 1000) / 1000 : value;
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
    codon_usage: ['ENC', 'CUB', 'RSCU_avg'],
    cai: ['CAI', 'wCAI'],
    mrna_folding: ['MFE', 'structure_entropy'],
    gc_content: ['GC_percent', 'GC_skew'],
    rare_codons: ['rare_codon_freq', 'cluster_count'],
    nucleotide_freq: ['A_freq', 'T_freq', 'G_freq', 'C_freq']
  };

  return sequences.map(seq => {
    const features: Record<string, number> = {};
    
    panels.forEach(panelId => {
      const panelFeatures = featuresByPanel[panelId] || [];
      panelFeatures.forEach(feature => {
        // Generate mock values based on feature type
        if (feature === 'ENC') features[feature] = 30 + Math.random() * 30;
        else if (feature === 'CAI' || feature === 'wCAI') features[feature] = 0.3 + Math.random() * 0.5;
        else if (feature === 'GC_percent') features[feature] = 40 + Math.random() * 20;
        else if (feature.includes('freq')) features[feature] = 0.2 + Math.random() * 0.1;
        else if (feature === 'MFE') features[feature] = -50 - Math.random() * 100;
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
    codon_usage: ['ENC', 'CUB', 'RSCU_avg'],
    cai: ['CAI', 'wCAI'],
    mrna_folding: ['MFE', 'structure_entropy'],
    gc_content: ['GC_percent', 'GC_skew'],
    rare_codons: ['rare_codon_freq', 'cluster_count'],
    nucleotide_freq: ['A_freq', 'T_freq', 'G_freq', 'C_freq']
  };

  const features: string[] = [];
  panels.forEach(panelId => {
    const panelFeatures = featuresByPanel[panelId] || [];
    features.push(...panelFeatures);
  });
  return features;
}
