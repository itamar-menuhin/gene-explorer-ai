import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2, StopCircle, Clock, Zap } from 'lucide-react';
import { ComputationState } from '@/hooks/useComputationProgress';

interface ComputationProgressProps {
  state: ComputationState;
  onStop: () => void;
  onReset: () => void;
}

export function ComputationProgress({ state, onStop, onReset }: ComputationProgressProps) {
  const formatTime = (ms: number | null) => {
    if (ms === null) return '--:--';
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'computing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'stopped':
        return <StopCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Complete</Badge>;
      case 'computing':
        return <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">Computing</Badge>;
      case 'stopped':
        return <Badge variant="default" className="bg-amber-500/20 text-amber-600 border-amber-500/30">Stopped</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedCount = state.panels.filter(p => p.status === 'completed').length;
  const stoppedCount = state.panels.filter(p => p.status === 'stopped').length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Computation Progress
          </CardTitle>
          {state.isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Est. remaining: {formatTime(state.estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(state.overallProgress)}%</span>
          </div>
          <Progress value={state.overallProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {state.panels.length} panels complete</span>
            {stoppedCount > 0 && <span className="text-amber-500">{stoppedCount} stopped</span>}
          </div>
        </div>

        {/* Panel List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Panel Status</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {state.panels.map((panel) => (
              <div 
                key={panel.panelId}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  panel.status === 'computing' 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(panel.status)}
                  <div>
                    <p className="text-sm font-medium">{panel.panelName}</p>
                    {panel.status === 'computing' && (
                      <p className="text-xs text-muted-foreground">
                        {panel.sequencesProcessed} / {panel.totalSequences} sequences
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {panel.status === 'computing' && (
                    <div className="w-20">
                      <Progress value={panel.progress} className="h-1.5" />
                    </div>
                  )}
                  {getStatusBadge(panel.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {state.isRunning ? (
            <Button 
              variant="destructive" 
              onClick={onStop}
              disabled={state.isStopping}
              className="flex-1"
            >
              {state.isStopping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop & Keep Results
                </>
              )}
            </Button>
          ) : (
            completedCount > 0 && (
              <Button variant="outline" onClick={onReset} className="flex-1">
                Reset
              </Button>
            )
          )}
        </div>

        {/* Results Summary */}
        {!state.isRunning && completedCount > 0 && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-600 font-medium">
              ✓ {completedCount} panel{completedCount !== 1 ? 's' : ''} computed successfully
              {stoppedCount > 0 && ` • ${stoppedCount} stopped`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
