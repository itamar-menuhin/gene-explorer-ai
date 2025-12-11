import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTemplates } from '@/hooks/useTemplates';

interface SaveTemplateDialogProps {
  selectedPanels: string[];
  windowSize?: number;
  stepSize?: number;
  children?: React.ReactNode;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  selectedPanels,
  windowSize = 45,
  stepSize = 3,
  children
}) => {
  const { saveTemplate } = useTemplates();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    const result = await saveTemplate(name, selectedPanels, description, windowSize, stepSize, isPublic);
    setSaving(false);
    
    if (result) {
      setOpen(false);
      setName('');
      setDescription('');
      setIsPublic(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" disabled={selectedPanels.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
          <DialogDescription>
            Save your current panel selection as a reusable template.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Expression Analysis Setup"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of when to use this template..."
              className="min-h-20"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share publicly</Label>
              <p className="text-xs text-muted-foreground">Others can use this template</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <p className="font-medium mb-1">Included in template:</p>
            <p className="text-muted-foreground">
              {selectedPanels.length} panels • {windowSize}nt window • {stepSize}nt step
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTemplateDialog;
