import { useState, useCallback, useRef } from 'react';

export interface PanelProgress {
  panelId: string;
  panelName: string;
  status: 'pending' | 'computing' | 'completed' | 'stopped';
  progress: number;
  sequencesProcessed: number;
  totalSequences: number;
}

export interface ComputationState {
  isRunning: boolean;
  isStopping: boolean;
  overallProgress: number;
  currentPanel: string | null;
  panels: PanelProgress[];
  completedPanels: string[];
  startTime: Date | null;
  estimatedTimeRemaining: number | null;
}

const AVAILABLE_PANELS = [
  { id: 'sequence', name: 'Sequence Composition' },
  { id: 'chemical', name: 'Chemical Properties' },
  { id: 'disorder', name: 'Disorder Prediction' },
  { id: 'structure', name: 'Structure Features' },
  { id: 'motif', name: 'Motif Analysis' },
  { id: 'codonUsage', name: 'Codon Usage' },
];

export function useComputationProgress(sequenceCount: number, selectedPanels: string[]) {
  const [state, setState] = useState<ComputationState>({
    isRunning: false,
    isStopping: false,
    overallProgress: 0,
    currentPanel: null,
    panels: [],
    completedPanels: [],
    startTime: null,
    estimatedTimeRemaining: null,
  });

  const abortRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initializePanels = useCallback((panels: string[]): PanelProgress[] => {
    return panels.map(panelId => {
      const panelInfo = AVAILABLE_PANELS.find(p => p.id === panelId);
      return {
        panelId,
        panelName: panelInfo?.name || panelId,
        status: 'pending',
        progress: 0,
        sequencesProcessed: 0,
        totalSequences: sequenceCount,
      };
    });
  }, [sequenceCount]);

  const startComputation = useCallback(async () => {
    abortRef.current = false;
    const initialPanels = initializePanels(selectedPanels);
    
    setState({
      isRunning: true,
      isStopping: false,
      overallProgress: 0,
      currentPanel: selectedPanels[0] || null,
      panels: initialPanels,
      completedPanels: [],
      startTime: new Date(),
      estimatedTimeRemaining: null,
    });

    const totalPanels = selectedPanels.length;
    const completedPanelsList: string[] = [];

    for (let panelIndex = 0; panelIndex < totalPanels; panelIndex++) {
      if (abortRef.current) break;

      const currentPanelId = selectedPanels[panelIndex];
      
      setState(prev => ({
        ...prev,
        currentPanel: currentPanelId,
        panels: prev.panels.map(p => 
          p.panelId === currentPanelId 
            ? { ...p, status: 'computing' as const }
            : p
        ),
      }));

      // Simulate panel computation with progress updates
      for (let seq = 0; seq <= sequenceCount; seq += Math.ceil(sequenceCount / 10)) {
        if (abortRef.current) break;
        
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        
        const panelProgress = Math.min((seq / sequenceCount) * 100, 100);
        const overallProgress = ((panelIndex + panelProgress / 100) / totalPanels) * 100;
        
        const elapsed = Date.now() - (state.startTime?.getTime() || Date.now());
        const estimatedTotal = overallProgress > 0 ? (elapsed / overallProgress) * 100 : 0;
        const remaining = Math.max(0, estimatedTotal - elapsed);

        setState(prev => ({
          ...prev,
          overallProgress,
          estimatedTimeRemaining: remaining,
          panels: prev.panels.map(p => 
            p.panelId === currentPanelId 
              ? { ...p, progress: panelProgress, sequencesProcessed: Math.min(seq, sequenceCount) }
              : p
          ),
        }));
      }

      if (!abortRef.current) {
        completedPanelsList.push(currentPanelId);
        setState(prev => ({
          ...prev,
          completedPanels: [...completedPanelsList],
          panels: prev.panels.map(p => 
            p.panelId === currentPanelId 
              ? { ...p, status: 'completed' as const, progress: 100, sequencesProcessed: sequenceCount }
              : p
          ),
        }));
      }
    }

    // Mark remaining panels as stopped if aborted
    if (abortRef.current) {
      setState(prev => ({
        ...prev,
        isStopping: false,
        isRunning: false,
        panels: prev.panels.map(p => 
          p.status === 'pending' || p.status === 'computing'
            ? { ...p, status: 'stopped' as const }
            : p
        ),
      }));
    } else {
      setState(prev => ({
        ...prev,
        isRunning: false,
        overallProgress: 100,
        currentPanel: null,
      }));
    }

    return completedPanelsList;
  }, [selectedPanels, sequenceCount, initializePanels]);

  const stopComputation = useCallback(() => {
    abortRef.current = true;
    setState(prev => ({ ...prev, isStopping: true }));
  }, []);

  const resetComputation = useCallback(() => {
    abortRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState({
      isRunning: false,
      isStopping: false,
      overallProgress: 0,
      currentPanel: null,
      panels: [],
      completedPanels: [],
      startTime: null,
      estimatedTimeRemaining: null,
    });
  }, []);

  return {
    state,
    startComputation,
    stopComputation,
    resetComputation,
  };
}
