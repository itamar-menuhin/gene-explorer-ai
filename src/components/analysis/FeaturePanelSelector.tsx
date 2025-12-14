import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Dna, FlaskConical, Shapes, Target, Loader2 } from 'lucide-react';
import { PANEL_UI_DEFINITIONS, buildFeaturePanel, type FeaturePanel, type FeaturePanelConfig } from '@/types/featureExtraction';
import { usePanels } from '@/hooks/usePanels';
import { cn } from '@/lib/utils';

interface FeaturePanelSelectorProps {
  selectedPanels: Partial<FeaturePanelConfig>;
  onPanelChange: (panels: Partial<FeaturePanelConfig>) => void;
  isWindowedMode: boolean;
  disabled?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  sequence: <Dna className="h-4 w-4" />,
  chemical: <FlaskConical className="h-4 w-4" />,
  structure: <Shapes className="h-4 w-4" />,
  regulatory: <Target className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  sequence: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  chemical: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  structure: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  regulatory: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export function FeaturePanelSelector({
  selectedPanels,
  onPanelChange,
  isWindowedMode,
  disabled = false,
}: FeaturePanelSelectorProps) {
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const { panels: dynamicPanels, loading, error } = usePanels();

  // Build full FeaturePanel objects from dynamic panel data
  const featurePanels: FeaturePanel[] = useMemo(() => {
    return dynamicPanels.map(p => buildFeaturePanel(p));
  }, [dynamicPanels]);

  const togglePanel = (panelId: string) => {
    const panel = featurePanels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Don't allow selection if windowed mode and panel doesn't support it
    if (isWindowedMode && !panel.supportsWindowed) return;

    const currentConfig = selectedPanels[panelId];
    const isEnabled = currentConfig?.enabled ?? false;

    onPanelChange({
      ...selectedPanels,
      [panelId]: { enabled: !isEnabled },
    });
  };

  const toggleExpanded = (panelId: string) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  const isPanelEnabled = (panelId: string) => {
    const config = selectedPanels[panelId];
    return config?.enabled ?? false;
  };

  const isPanelDisabled = (panel: FeaturePanel) => {
    return disabled || (isWindowedMode && !panel.supportsWindowed);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading panels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Failed to load panels: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">Using default panels</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {featurePanels.map(panel => {
        const isEnabled = isPanelEnabled(panel.id);
        const isDisabled = isPanelDisabled(panel);
        const isExpanded = expandedPanels.has(panel.id);

        return (
          <Card
            key={panel.id}
            className={cn(
              'transition-all duration-200',
              isEnabled && !isDisabled && 'ring-1 ring-primary/50 bg-primary/5',
              isDisabled && 'opacity-50'
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`panel-${panel.id}`}
                  checked={isEnabled}
                  onCheckedChange={() => togglePanel(panel.id)}
                  disabled={isDisabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-medium">
                      {panel.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', categoryColors[panel.category])}
                    >
                      {categoryIcons[panel.category]}
                      <span className="ml-1 capitalize">{panel.category}</span>
                    </Badge>
                    {!panel.supportsWindowed && (
                      <Badge variant="secondary" className="text-xs">
                        Global only
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {panel.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(panel.id)}>
              <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
                <span className="ml-1">
                  {isExpanded ? 'Hide' : 'Show'} {panel.features.length} features
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="grid gap-2 text-xs">
                    {panel.features.map(feature => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        {feature.unit && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {feature.unit}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
