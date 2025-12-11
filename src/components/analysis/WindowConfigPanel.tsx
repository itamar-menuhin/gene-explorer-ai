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

  // Calculate estimated number of windows for a typical sequence
  const estimatedWindows = config.enabled && config.windowSize > 0 && config.stepSize > 0
    ? Math.max(1, Math.floor((maxSequenceLength - config.windowSize) / config.stepSize) + 1)
    : 1;

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
                step={10}
                value={[config.windowSize]}
                onValueChange={([value]) => handleWindowSizeChange(value)}
                disabled={disabled}
                className="flex-1"
              />
              <Input
                type="number"
                value={config.windowSize}
                onChange={(e) => handleWindowSizeChange(parseInt(e.target.value) || 100)}
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
                onChange={(e) => handleStepSizeChange(parseInt(e.target.value) || 10)}
                min={1}
                max={config.windowSize}
                className="w-20 h-8 text-xs"
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
              <strong>Est. windows per sequence:</strong> ~{estimatedWindows.toLocaleString()}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
