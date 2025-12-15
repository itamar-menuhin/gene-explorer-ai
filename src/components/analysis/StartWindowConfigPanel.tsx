import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArrowRight } from 'lucide-react';
import type { SingleWindowConfig } from '@/types/featureExtraction';
import { calculateNumWindows } from '@/lib/windowCalculations';

interface StartWindowConfigPanelProps {
  config: SingleWindowConfig;
  onChange: (config: SingleWindowConfig) => void;
  maxSequenceLength?: number;
  disabled?: boolean;
}

export function StartWindowConfigPanel({
  config,
  onChange,
  maxSequenceLength = 10000,
  disabled = false,
}: StartWindowConfigPanelProps) {
  const handleToggle = (enabled: boolean) => {
    const numWindows = enabled 
      ? calculateNumWindows(config.windowSize, config.stepSize, config.startIndex, config.endIndex, maxSequenceLength)
      : 0;
    onChange({ ...config, enabled, numWindows });
  };

  const handleWindowSizeChange = (value: number) => {
    const newStepSize = Math.min(config.stepSize, value);
    const numWindows = config.enabled
      ? calculateNumWindows(value, newStepSize, config.startIndex, config.endIndex, maxSequenceLength)
      : 0;
    onChange({ ...config, windowSize: value, stepSize: newStepSize, numWindows });
  };

  const handleStepSizeChange = (value: number) => {
    const numWindows = config.enabled
      ? calculateNumWindows(config.windowSize, value, config.startIndex, config.endIndex, maxSequenceLength)
      : 0;
    onChange({ ...config, stepSize: value, numWindows });
  };

  const handleStartIndexChange = (value: number) => {
    const numWindows = config.enabled
      ? calculateNumWindows(config.windowSize, config.stepSize, value || undefined, config.endIndex, maxSequenceLength)
      : 0;
    onChange({ ...config, startIndex: value || undefined, numWindows });
  };

  const handleEndIndexChange = (value: number) => {
    const numWindows = config.enabled
      ? calculateNumWindows(config.windowSize, config.stepSize, config.startIndex, value || undefined, maxSequenceLength)
      : 0;
    onChange({ ...config, endIndex: value || undefined, numWindows });
  };

  const effectiveStart = config.startIndex ?? 0;
  const effectiveEnd = config.endIndex ?? maxSequenceLength;
  const effectiveLength = Math.max(0, effectiveEnd - effectiveStart);
  const estimatedWindows = config.enabled && config.windowSize > 0 && config.stepSize > 0 && effectiveLength >= config.windowSize
    ? Math.max(1, Math.floor((effectiveLength - config.windowSize) / config.stepSize) + 1)
    : effectiveLength < config.windowSize ? 0 : 1;

  return (
    <Card className={config.enabled ? 'ring-1 ring-primary/50' : ''}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-medium">From Start (5' → 3')</CardTitle>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={handleToggle}
            disabled={disabled}
          />
        </div>
        <CardDescription className="text-xs">
          Sliding windows from the beginning of each sequence
        </CardDescription>
      </CardHeader>

      {config.enabled && (
        <CardContent className="p-4 pt-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="start-window-size" className="text-xs">Window Size</Label>
              <span className="text-xs text-muted-foreground">{config.windowSize} bp</span>
            </div>
            <div className="flex gap-2 items-center">
              <Slider
                id="start-window-size"
                min={10}
                max={1000}
                step={1}
                value={[config.windowSize]}
                onValueChange={([value]) => handleWindowSizeChange(value)}
                disabled={disabled}
                className="flex-1"
              />
              <Input
                type="number"
                value={config.windowSize}
                onChange={(e) => handleWindowSizeChange(parseInt(e.target.value) || 45)}
                min={10}
                max={maxSequenceLength}
                className="w-20 h-8 text-xs"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="start-step-size" className="text-xs">Step Size</Label>
              <span className="text-xs text-muted-foreground">{config.stepSize} bp</span>
            </div>
            <div className="flex gap-2 items-center">
              <Slider
                id="start-step-size"
                min={1}
                max={Math.min(config.windowSize, 500)}
                step={1}
                value={[config.stepSize]}
                onValueChange={([value]) => handleStepSizeChange(value)}
                disabled={disabled}
                className="flex-1"
              />
              <Input
                type="number"
                value={config.stepSize}
                onChange={(e) => handleStepSizeChange(parseInt(e.target.value) || 3)}
                min={1}
                max={config.windowSize}
                className="w-20 h-8 text-xs"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-start-index" className="text-xs">Start Index</Label>
              <Input
                id="start-start-index"
                type="number"
                value={config.startIndex ?? ''}
                onChange={(e) => handleStartIndexChange(parseInt(e.target.value))}
                placeholder="0"
                min={0}
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-end-index" className="text-xs">End Index</Label>
              <Input
                id="start-end-index"
                type="number"
                value={config.endIndex ?? ''}
                onChange={(e) => handleEndIndexChange(parseInt(e.target.value))}
                placeholder="Sequence end"
                min={config.startIndex || 0}
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <p><strong>Overlap:</strong> {config.stepSize < config.windowSize
              ? `${config.windowSize - config.stepSize} bp (${Math.round((1 - config.stepSize / config.windowSize) * 100)}%)`
              : 'None'}</p>
            <p className="mt-1"><strong>Region:</strong> {effectiveStart}-{effectiveEnd} bp</p>
            <p className="mt-1"><strong>Est. windows:</strong> {estimatedWindows === 0 ? 'Window too large' : `~${estimatedWindows.toLocaleString()}`}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
