import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { 
  generateCSV, 
  downloadCSV, 
  generateCitationsExport,
  FeatureData,
  ExportOptions 
} from '@/lib/csvExport';

interface ExportDialogProps {
  featureData: FeatureData[];
  featureNames: string[];
  analysisName: string;
  citations?: { title: string; authors: string; year: number; journal: string; doi?: string }[];
  children?: React.ReactNode;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  featureData,
  featureNames,
  analysisName,
  citations = [],
  children
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<'features' | 'citations'>('features');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [delimiter, setDelimiter] = useState<',' | '\t'>(',');
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    
    try {
      if (exportType === 'features') {
        const options: ExportOptions = { includeMetadata, includeAnnotations, delimiter };
        const csv = generateCSV(featureData, featureNames, options);
        const ext = delimiter === '\t' ? 'tsv' : 'csv';
        const filename = `${analysisName.replace(/\s+/g, '_')}_features.${ext}`;
        downloadCSV(csv, filename);
        toast({ title: 'Export complete', description: `Downloaded ${filename}` });
      } else {
        const citationsText = generateCitationsExport(citations);
        const blob = new Blob([citationsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${analysisName.replace(/\s+/g, '_')}_citations.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Export complete', description: 'Citations downloaded' });
      }
      
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export failed', description: 'An error occurred while exporting' });
    }
    
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Download computed features or citation references.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as 'features' | 'citations')}>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="features" id="features" />
              <Label htmlFor="features" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Feature Data</p>
                  <p className="text-sm text-muted-foreground">
                    {featureData.length} sequences × {featureNames.length} features
                  </p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="citations" id="citations" />
              <Label htmlFor="citations" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-5 w-5 text-secondary-foreground" />
                <div>
                  <p className="font-medium">Citations</p>
                  <p className="text-sm text-muted-foreground">
                    {citations.length} references from selected panels
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
          
          {exportType === 'features' && (
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Include sequence metadata</Label>
                <Switch checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Include annotations</Label>
                <Switch checked={includeAnnotations} onCheckedChange={setIncludeAnnotations} />
              </div>
              
              <div className="space-y-2">
                <Label>Format</Label>
                <RadioGroup value={delimiter} onValueChange={(v) => setDelimiter(v as ',' | '\t')} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="," id="csv" />
                    <Label htmlFor="csv">CSV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="\t" id="tsv" />
                    <Label htmlFor="tsv">TSV</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
