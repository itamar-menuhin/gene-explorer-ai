import React, { useState } from 'react';
import { FolderOpen, Trash2, Loader2, Globe, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { useAuth } from '@/contexts/AuthContext';

interface LoadTemplateDialogProps {
  onLoad: (template: Template) => void;
  children?: React.ReactNode;
}

export const LoadTemplateDialog: React.FC<LoadTemplateDialogProps> = ({ onLoad, children }) => {
  const { user } = useAuth();
  const { templates, loading, deleteTemplate } = useTemplates();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleLoad = (template: Template) => {
    onLoad(template);
    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleting(id);
    await deleteTemplate(id);
    setDeleting(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Load Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <DialogDescription>
            Select a saved template to apply its panel configuration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No templates saved yet</p>
              <p className="text-sm">Save your first template during analysis setup</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleLoad(template)}
                  className="p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        {template.is_public ? (
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.selected_panels.slice(0, 4).map((panel) => (
                          <Badge key={panel} variant="outline" className="text-xs">
                            {panel}
                          </Badge>
                        ))}
                        {template.selected_panels.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.selected_panels.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {user && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDelete(e, template.id)}
                        disabled={deleting === template.id}
                      >
                        {deleting === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadTemplateDialog;
