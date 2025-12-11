import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Copy, Check, Link2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareAnalysisDialogProps {
  analysisId: string;
  analysisName: string;
  currentShareToken?: string | null;
  onShareUpdated: (token: string | null) => void;
}

export function ShareAnalysisDialog({ 
  analysisId, 
  analysisName, 
  currentShareToken,
  onShareUpdated 
}: ShareAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [isShared, setIsShared] = useState(!!currentShareToken);
  const [shareToken, setShareToken] = useState(currentShareToken || '');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateToken = () => {
    return `${analysisId.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const shareUrl = shareToken 
    ? `${window.location.origin}/shared/${shareToken}`
    : '';

  const handleToggleShare = async (enabled: boolean) => {
    setLoading(true);
    try {
      const newToken = enabled ? generateToken() : null;
      
      const { error } = await supabase
        .from('analyses')
        .update({ share_token: newToken })
        .eq('id', analysisId);

      if (error) throw error;

      setIsShared(enabled);
      setShareToken(newToken || '');
      onShareUpdated(newToken);
      
      toast.success(enabled ? 'Share link created' : 'Share link disabled');
    } catch (error) {
      console.error('Error updating share status:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRegenerateLink = async () => {
    setLoading(true);
    try {
      const newToken = generateToken();
      
      const { error } = await supabase
        .from('analyses')
        .update({ share_token: newToken })
        .eq('id', analysisId);

      if (error) throw error;

      setShareToken(newToken);
      onShareUpdated(newToken);
      toast.success('New share link generated');
    } catch (error) {
      console.error('Error regenerating link:', error);
      toast.error('Failed to regenerate link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Share Analysis
          </DialogTitle>
          <DialogDescription>
            Create a read-only link to share "{analysisName}" with others.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Enable Sharing Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="space-y-1">
              <Label htmlFor="share-toggle" className="text-sm font-medium">
                Enable public sharing
              </Label>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this analysis
              </p>
            </div>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleShare}
              disabled={loading}
            />
          </div>

          {/* Share URL */}
          {isShared && shareToken && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Share link</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={shareUrl}
                    readOnly
                    className="pl-10 pr-4 text-sm bg-background"
                  />
                </div>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={handleCopy}
                  disabled={loading}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRegenerateLink}
                disabled={loading}
                className="text-xs"
              >
                Regenerate link
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Read-only access:</strong> Viewers can see results and export data, 
              but cannot modify the analysis or run new computations.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
