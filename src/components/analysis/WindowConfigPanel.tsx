import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal } from 'lucide-react';
import type { WindowConfig } from '@/types/featureExtraction';

interface WindowConfigPanelProps {
  config: WindowConfig;
  onChange: (config: WindowConfig) => void;
  maxSequenceLength?: number;
  disabled?: boolean;
}

export function WindowConfigPanel({
  config,
  onChange,
  maxSequenceLength = 10000,
  disabled = false,
}: WindowConfigPanelProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({ ...config, enabled });
  };

  const handleWindowSizeChange = (value: number) => {
    // Ensure step size doesn't exceed window size
    const newStepSize = Math.min(config.stepSize, value);
    onChange({ ...config, windowSize: value, stepSize: newStepSize });
  };

  const handleStepSizeChange = (value: number) => {
    onChange({ ...config, stepSize: value });
  };

  const handleFromEndChange = (fromEnd: boolean) => {
    onChange({ ...config, fromEnd });
  };

  const handleStartIndexChange = (value: number) => {
    onChange({ ...config, startIndex: value || undefined });
  };

  const handleEndIndexChange = (value: number) => {
    onChange({ ...config, endIndex: value || undefined });
  };

  // Calculate estimated number of windows for a typical sequence
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
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Windowed Analysis</CardTitle>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={handleToggle}
            disabled={disabled}
          />
        </div>
        <CardDescription className="text-xs">
          Compute features in sliding windows across sequences
        </CardDescription>
      </CardHeader>

      {config.enabled && (
        <CardContent className="p-4 pt-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="window-size" className="text-xs">
                Window Size
              </Label>
              <span className="text-xs text-muted-foreground">
                {config.windowSize} bp
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Slider
                id="window-size"
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
              <Label htmlFor="step-size" className="text-xs">
                Step Size
              </Label>
              <span className="text-xs text-muted-foreground">
                {config.stepSize} bp
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Slider
                id="step-size"
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

          {/* Start/End Indices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-index" className="text-xs">
                Start Index (optional)
              </Label>
              <Input
                id="start-index"
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
              <Label htmlFor="end-index" className="text-xs">
                End Index (optional)
              </Label>
              <Input
                id="end-index"
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

          {/* Window Direction - Both Start and End */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Window Directions</Label>
            <div className="flex items-center justify-between p-2 rounded bg-muted/30">
              <div>
                <Label htmlFor="from-start" className="text-xs">
                  From Start (5' → 3')
                </Label>
              </div>
              <Switch
                id="from-start"
                checked={config.fromStart !== false}
                onCheckedChange={(checked) => onChange({ ...config, fromStart: checked })}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/30">
              <div>
                <Label htmlFor="from-end" className="text-xs">
                  From End (3' → 5')
                </Label>
              </div>
              <Switch
                id="from-end"
                checked={config.fromEnd}
                onCheckedChange={handleFromEndChange}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <p>
              <strong>Overlap:</strong>{' '}
              {config.stepSize < config.windowSize
                ? `${config.windowSize - config.stepSize} bp (${Math.round((1 - config.stepSize / config.windowSize) * 100)}%)`
                : 'None'}
            </p>
            <p className="mt-1">
              <strong>Region:</strong> {effectiveStart}-{effectiveEnd} bp ({effectiveLength.toLocaleString()} bp)
            </p>
            <p className="mt-1">
              <strong>Est. windows:</strong> {estimatedWindows === 0 ? 'Window too large for region' : `~${estimatedWindows.toLocaleString()} per direction`}
            </p>
            <p className="mt-1">
              <strong>Directions:</strong>{' '}
              {config.fromStart !== false && config.fromEnd ? 'Both (start & end)' : config.fromEnd ? '← From end only' : '→ From start only'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}