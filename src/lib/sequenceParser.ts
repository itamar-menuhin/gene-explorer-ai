import * as XLSX from 'xlsx';

export interface ParsedSequence {
  id: string;
  name: string;
  sequence: string;
  length: number;
  annotations?: Record<string, string>;
}

export interface SequenceStats {
  count: number;
  minLength: number;
  maxLength: number;
  medianLength: number;
  meanLength: number;
}

export interface ParseResult {
  sequences: ParsedSequence[];
  stats: SequenceStats;
  errors: string[];
}

// Validate nucleotide sequence
const isValidNucleotide = (seq: string): boolean => {
  return /^[ATCGUNRYWSMKHBVD\-\s]+$/i.test(seq);
};

// Clean sequence (remove whitespace, newlines)
const cleanSequence = (seq: string): string => {
  return seq.replace(/[\s\n\r]/g, '').toUpperCase();
};

// Parse FASTA format
export const parseFasta = (content: string): ParseResult => {
  const sequences: ParsedSequence[] = [];
  const errors: string[] = [];
  
  const lines = content.split(/\r?\n/);
  let currentName = '';
  let currentSequence = '';
  let seqIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('>')) {
      // Save previous sequence if exists
      if (currentName && currentSequence) {
        const cleaned = cleanSequence(currentSequence);
        if (isValidNucleotide(cleaned)) {
          sequences.push({
            id: `seq_${seqIndex}`,
            name: currentName,
            sequence: cleaned,
            length: cleaned.length
          });
          seqIndex++;
        } else {
          errors.push(`Invalid nucleotide characters in sequence: ${currentName}`);
        }
      }
      // Start new sequence
      currentName = trimmed.substring(1).trim() || `Sequence_${seqIndex + 1}`;
      currentSequence = '';
    } else if (trimmed && !trimmed.startsWith(';')) {
      // Append to current sequence (ignore comment lines starting with ;)
      currentSequence += trimmed;
    }
  }
  
  // Don't forget the last sequence
  if (currentName && currentSequence) {
    const cleaned = cleanSequence(currentSequence);
    if (isValidNucleotide(cleaned)) {
      sequences.push({
        id: `seq_${seqIndex}`,
        name: currentName,
        sequence: cleaned,
        length: cleaned.length
      });
    } else {
      errors.push(`Invalid nucleotide characters in sequence: ${currentName}`);
    }
  }
  
  return {
    sequences,
    stats: calculateStats(sequences),
    errors
  };
};

// Parse single sequence (plain text)
export const parseSingleSequence = (content: string, name?: string): ParseResult => {
  const sequences: ParsedSequence[] = [];
  const errors: string[] = [];
  
  const cleaned = cleanSequence(content);
  
  if (!cleaned) {
    errors.push('Empty sequence provided');
  } else if (!isValidNucleotide(cleaned)) {
    errors.push('Invalid nucleotide characters in sequence');
  } else {
    sequences.push({
      id: 'seq_0',
      name: name || 'Sequence_1',
      sequence: cleaned,
      length: cleaned.length
    });
  }
  
  return {
    sequences,
    stats: calculateStats(sequences),
    errors
  };
};

// Parse CSV/Excel file
export const parseSpreadsheet = async (
  file: File,
  sequenceColumn: string,
  nameColumn?: string,
  annotationColumns?: string[]
): Promise<ParseResult> => {
  const sequences: ParsedSequence[] = [];
  const errors: string[] = [];
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        jsonData.forEach((row, index) => {
          const seqValue = row[sequenceColumn];
          if (!seqValue) {
            errors.push(`Row ${index + 2}: Missing sequence in column "${sequenceColumn}"`);
            return;
          }
          
          const cleaned = cleanSequence(String(seqValue));
          if (!isValidNucleotide(cleaned)) {
            errors.push(`Row ${index + 2}: Invalid nucleotide characters`);
            return;
          }
          
          const annotations: Record<string, string> = {};
          annotationColumns?.forEach(col => {
            if (row[col] !== undefined) {
              annotations[col] = String(row[col]);
            }
          });
          
          sequences.push({
            id: `seq_${index}`,
            name: nameColumn && row[nameColumn] ? String(row[nameColumn]) : `Sequence_${index + 1}`,
            sequence: cleaned,
            length: cleaned.length,
            annotations: Object.keys(annotations).length > 0 ? annotations : undefined
          });
        });
        
        resolve({
          sequences,
          stats: calculateStats(sequences),
          errors
        });
      } catch (err) {
        errors.push(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        resolve({
          sequences: [],
          stats: { count: 0, minLength: 0, maxLength: 0, medianLength: 0, meanLength: 0 },
          errors
        });
      }
    };
    
    reader.onerror = () => {
      errors.push('Failed to read file');
      resolve({
        sequences: [],
        stats: { count: 0, minLength: 0, maxLength: 0, medianLength: 0, meanLength: 0 },
        errors
      });
    };
    
    reader.readAsBinaryString(file);
  });
};

// Get column headers from spreadsheet
export const getSpreadsheetColumns = async (file: File): Promise<string[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        if (jsonData.length > 0) {
          resolve(Object.keys(jsonData[0]));
        } else {
          resolve([]);
        }
      } catch {
        resolve([]);
      }
    };
    
    reader.onerror = () => resolve([]);
    reader.readAsBinaryString(file);
  });
};

// Calculate statistics for sequences
const calculateStats = (sequences: ParsedSequence[]): SequenceStats => {
  if (sequences.length === 0) {
    return { count: 0, minLength: 0, maxLength: 0, medianLength: 0, meanLength: 0 };
  }
  
  const lengths = sequences.map(s => s.length).sort((a, b) => a - b);
  const sum = lengths.reduce((a, b) => a + b, 0);
  
  const mid = Math.floor(lengths.length / 2);
  const median = lengths.length % 2 !== 0
    ? lengths[mid]
    : (lengths[mid - 1] + lengths[mid]) / 2;
  
  return {
    count: sequences.length,
    minLength: lengths[0],
    maxLength: lengths[lengths.length - 1],
    medianLength: Math.round(median),
    meanLength: Math.round(sum / lengths.length)
  };
};
