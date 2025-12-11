import React, { useState, useCallback } from 'react';
import { Upload, FileText, Table, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  parseFasta,
  parseSingleSequence,
  parseSpreadsheet,
  getSpreadsheetColumns,
  ParseResult,
  SequenceStats
} from '@/lib/sequenceParser';

interface SequenceUploadProps {
  onSequencesParsed: (result: ParseResult) => void;
}

export const SequenceUpload: React.FC<SequenceUploadProps> = ({ onSequencesParsed }) => {
  const [activeTab, setActiveTab] = useState('paste');
  const [pastedSequence, setPastedSequence] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sequenceColumn, setSequenceColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaste = useCallback(() => {
    if (!pastedSequence.trim()) return;
    
    setIsProcessing(true);
    const isFasta = pastedSequence.trim().startsWith('>');
    const result = isFasta ? parseFasta(pastedSequence) : parseSingleSequence(pastedSequence);
    setParseResult(result);
    onSequencesParsed(result);
    setIsProcessing(false);
  }, [pastedSequence, onSequencesParsed]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setParseResult(null);
    
    const ext = file.name.toLowerCase().split('.').pop();
    
    if (ext === 'fasta' || ext === 'fa' || ext === 'fna' || ext === 'txt') {
      setIsProcessing(true);
      const text = await file.text();
      const result = parseFasta(text);
      setParseResult(result);
      onSequencesParsed(result);
      setIsProcessing(false);
    } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      const cols = await getSpreadsheetColumns(file);
      setColumns(cols);
      setSequenceColumn('');
      setNameColumn('');
    }
  };

  const handleSpreadsheetParse = async () => {
    if (!uploadedFile || !sequenceColumn) return;
    
    setIsProcessing(true);
    const result = await parseSpreadsheet(
      uploadedFile,
      sequenceColumn,
      nameColumn || undefined
    );
    setParseResult(result);
    onSequencesParsed(result);
    setIsProcessing(false);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setColumns([]);
    setSequenceColumn('');
    setNameColumn('');
    setParseResult(null);
  };

  const isSpreadsheet = uploadedFile && ['csv', 'xlsx', 'xls'].includes(
    uploadedFile.name.toLowerCase().split('.').pop() || ''
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-primary" />
          Upload Sequences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Paste sequence or FASTA</Label>
              <Textarea
                value={pastedSequence}
                onChange={(e) => setPastedSequence(e.target.value)}
                placeholder={`>gene_1\nATGCGTACGTAGCTAGCTA...\n\nor just paste a raw sequence:\nATGCGTACGTAGCTAGCTA...`}
                className="min-h-[150px] font-mono text-sm bg-background/50"
              />
            </div>
            <Button 
              onClick={handlePaste} 
              disabled={!pastedSequence.trim() || isProcessing}
              className="w-full"
            >
              Parse Sequences
            </Button>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4 mt-4">
            {!uploadedFile ? (
              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".fasta,.fa,.fna,.txt,.csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="sequence-file-input"
                />
                <label htmlFor="sequence-file-input" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    FASTA, CSV, or Excel files
                  </p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearUpload}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {isSpreadsheet && columns.length > 0 && (
                  <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                    <div className="space-y-2">
                      <Label>Sequence Column *</Label>
                      <Select value={sequenceColumn} onValueChange={setSequenceColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column containing sequences" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Name Column (optional)</Label>
                      <Select value={nameColumn} onValueChange={setNameColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column for sequence names" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {columns.filter(c => c !== sequenceColumn).map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleSpreadsheetParse}
                      disabled={!sequenceColumn || isProcessing}
                      className="w-full"
                    >
                      Parse Spreadsheet
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Parse Result Preview */}
        {parseResult && (
          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            {parseResult.errors.length > 0 && (
              <div className="mb-3 p-3 bg-destructive/10 rounded-md">
                <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Parsing Warnings
                </div>
                <ul className="text-xs text-destructive/80 space-y-1">
                  {parseResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {parseResult.errors.length > 3 && (
                    <li>• ... and {parseResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
            
            {parseResult.sequences.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully Parsed
                </div>
                
                <StatsPreview stats={parseResult.stats} />
                
                <div className="text-xs text-muted-foreground">
                  First sequence: <span className="font-mono">{parseResult.sequences[0].name}</span>
                  {parseResult.sequences.length > 1 && (
                    <span> and {parseResult.sequences.length - 1} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatsPreview: React.FC<{ stats: SequenceStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="text-center p-2 bg-background/50 rounded">
      <div className="text-lg font-bold text-primary">{stats.count}</div>
      <div className="text-xs text-muted-foreground">Sequences</div>
    </div>
    <div className="text-center p-2 bg-background/50 rounded">
      <div className="text-lg font-bold text-secondary-foreground">{stats.minLength}</div>
      <div className="text-xs text-muted-foreground">Min Length</div>
    </div>
    <div className="text-center p-2 bg-background/50 rounded">
      <div className="text-lg font-bold text-secondary-foreground">{stats.maxLength}</div>
      <div className="text-xs text-muted-foreground">Max Length</div>
    </div>
    <div className="text-center p-2 bg-background/50 rounded">
      <div className="text-lg font-bold text-secondary-foreground">{stats.medianLength}</div>
      <div className="text-xs text-muted-foreground">Median</div>
    </div>
  </div>
);

export default SequenceUpload;
