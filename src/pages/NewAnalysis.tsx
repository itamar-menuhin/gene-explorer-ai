import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, Upload, ArrowRight, ArrowLeft, 
  Dna, Clock, BookOpen, ChevronDown, Info, Zap, FileText, Loader2
} from "lucide-react";
import { SequenceUpload } from "@/components/sequence/SequenceUpload";
import { ParseResult } from "@/lib/sequenceParser";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePanelRecommendations, PanelRecommendation } from "@/hooks/usePanelRecommendations";
import { SaveTemplateDialog } from "@/components/analysis/SaveTemplateDialog";
import { LoadTemplateDialog } from "@/components/analysis/LoadTemplateDialog";
import { Template } from "@/hooks/useTemplates";
import { StartWindowConfigPanel } from "@/components/analysis/StartWindowConfigPanel";
import { EndWindowConfigPanel } from "@/components/analysis/EndWindowConfigPanel";
import { FEATURE_PANELS, type WindowConfig, type SingleWindowConfig, type FeaturePanelConfig } from "@/types/featureExtraction";
import { usePanels } from "@/hooks/usePanels";

type Step = "hypothesis" | "upload" | "panels" | "configure";

interface Panel {
  id: string;
  name: string;
  description: string;
  relevance?: string;
  citations: number;
  cost: "low" | "medium" | "high";
  features: string[];
}

const costBadge = {
  low: { label: "Fast", className: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Moderate", className: "bg-yellow-100 text-yellow-700" },
  high: { label: "Intensive", className: "bg-orange-100 text-orange-700" },
};

export default function NewAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const mode = searchParams.get("mode") || "guided";
  const isGuided = mode === "guided";

  // Persist step in sessionStorage to prevent losing progress on navigation
  const getInitialStep = (): Step => {
    const savedStep = sessionStorage.getItem('newAnalysis_currentStep');
    const savedMode = sessionStorage.getItem('newAnalysis_mode');
    
    // Validate that savedStep is a valid Step value
    const validSteps: Step[] = ['hypothesis', 'upload', 'panels', 'configure'];
    const isValidStep = savedStep && validSteps.includes(savedStep as Step);
    
    // Only restore if the mode matches and step is valid
    if (isValidStep && savedMode === mode) {
      return savedStep as Step;
    }
    
    return isGuided ? "hypothesis" : "upload";
  };

  const [currentStep, setCurrentStepState] = useState<Step>(getInitialStep());
  const [hypothesis, setHypothesis] = useState("");
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<PanelRecommendation[]>([]);
  const [windowConfig, setWindowConfig] = useState<WindowConfig>({
    start: { enabled: false, windowSize: 45, stepSize: 3 },
    end: { enabled: false, windowSize: 45, stepSize: 3 },
  });

  // Wrapper to persist step changes to sessionStorage
  const setCurrentStep = (step: Step) => {
    setCurrentStepState(step);
    sessionStorage.setItem('newAnalysis_currentStep', step);
    sessionStorage.setItem('newAnalysis_mode', mode);
  };
  
  const { getRecommendations, loading: aiLoading } = usePanelRecommendations();
  const { panels: dynamicPanels, loading: panelsLoading } = usePanels();
  
  // Convert dynamic panels to display format
  const availablePanels: Panel[] = useMemo(() => {
    const citationMap: Record<string, number> = {
      'sequence': 2100,
      'chemical': 1500,
      'codonUsage': 1240,
      'disorder': 890,
      'structure': 650,
      'motif': 500,
    };
    
    // Estimate cost based on panel characteristics
    const estimateCost = (panelId: string, features: string[]): "low" | "medium" | "high" => {
      // High-cost panels (structure, motif analysis)
      if (panelId === 'structure' || panelId === 'motif') return 'high';
      // Medium-cost panels (disorder prediction)
      if (panelId === 'disorder') return 'medium';
      // Low-cost panels (sequence, chemical, codon usage)
      return 'low';
    };
    
    return dynamicPanels.map(panel => ({
      id: panel.id,
      name: panel.name,
      description: panel.description,
      citations: citationMap[panel.id] || 500,
      cost: estimateCost(panel.id, panel.features),
      features: panel.features,
    }));
  }, [dynamicPanels]);

  const handleSequencesParsed = (result: ParseResult) => {
    setParseResult(result);
  };

  const togglePanel = (panelId: string) => {
    setSelectedPanels(prev => 
      prev.includes(panelId) 
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const handleLoadTemplate = (template: Template) => {
    setSelectedPanels(template.selected_panels);
    toast({ title: 'Template loaded', description: `Applied "${template.name}"` });
  };

  /**
   * AI AGENT CALL: Get panel recommendations based on research hypothesis
   * 
   * CALLS: usePanelRecommendations.getRecommendations()
   * WHICH INVOKES: Supabase Edge Function 'recommend-panels'
   * PROMPTS: /supabase/functions/prompts/recommend-panels-prompts.ts
   * AI MODEL: google/gemini-2.5-flash
   * 
   * PURPOSE: Analyzes user's research hypothesis and recommends which feature panels
   *          are most relevant for their analysis goals
   * 
   * FLOW:
   *   1. User enters hypothesis in guided mode
   *   2. This function called when user reaches 'panels' step
   *   3. Sends hypothesis + dataset metadata to AI
   *   4. AI returns relevance scores (1-10) for each available panel
   *   5. Panels with score >= 7 are auto-selected
   *   6. User sees recommendations with explanations
   */
  const handleGetRecommendations = async () => {
    const recs = await getRecommendations(
      hypothesis,
      parseResult?.stats.count,
      parseResult?.stats.minLength,
      parseResult?.stats.maxLength
    );
    setAiRecommendations(recs);
    // Auto-select recommended panels with score >= 7
    const autoSelect = recs.filter(r => r.relevanceScore >= 7).map(r => r.panelId);
    if (autoSelect.length > 0) {
      setSelectedPanels(prev => [...new Set([...prev, ...autoSelect])]);
    }
  };

  // Clear session storage if mode changes (runs only when mode changes, which is rare)
  useEffect(() => {
    const savedMode = sessionStorage.getItem('newAnalysis_mode');
    if (savedMode && savedMode !== mode) {
      sessionStorage.removeItem('newAnalysis_currentStep');
      sessionStorage.removeItem('newAnalysis_mode');
    }
  }, [mode]);

  // Automatically fetch AI recommendations when entering panels step in guided mode
  // This triggers the AI agent call to recommend relevant feature panels
  useEffect(() => {
    if (currentStep === 'panels' && isGuided && hypothesis && aiRecommendations.length === 0) {
      handleGetRecommendations();
    }
  }, [currentStep, isGuided, hypothesis]);

  const handleRunAnalysis = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Please sign in to run analysis" });
      navigate("/auth");
      return;
    }

    if (!parseResult || parseResult.sequences.length === 0) {
      toast({ variant: "destructive", title: "Please upload sequences first" });
      return;
    }

    setIsSubmitting(true);
    
    // Prepare sequences for storage
    const sequencesData = parseResult.sequences.map(seq => ({
      id: seq.id,
      name: seq.name || seq.id,
      sequence: seq.sequence,
    }));
    
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        name: hypothesis ? hypothesis.slice(0, 50) : `Analysis ${new Date().toLocaleDateString()}`,
        hypothesis: hypothesis || null,
        mode: isGuided ? 'guided' : 'manual',
        sequence_count: parseResult.stats.count,
        min_length: parseResult.stats.minLength,
        max_length: parseResult.stats.maxLength,
        median_length: parseResult.stats.medianLength,
        selected_panels: selectedPanels,
        sequences: sequencesData as any,
        window_config: windowConfig as any,
        status: 'draft'
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Failed to create analysis", description: error.message });
      console.error("Database error creating analysis:", error);
    } else if (data) {
      // Clear session storage since we're successfully navigating away
      sessionStorage.removeItem('newAnalysis_currentStep');
      sessionStorage.removeItem('newAnalysis_mode');
      
      toast({ title: "Analysis created", description: "Starting computation..." });
      // Pass AI recommendations, sequences, and auto-start flag via state
      navigate(`/analysis/${data.id}`, { 
        state: { 
          aiRecommendations: aiRecommendations,
          sequences: parseResult?.sequences.map(s => ({
            id: s.id,
            sequence: s.sequence,
            name: s.name || s.id
          })) || [],
          autoStartComputation: true
        } 
      });
    }
  };

  const steps = isGuided 
    ? ["hypothesis", "upload", "panels", "configure"] 
    : ["upload", "panels", "configure"];

  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold">
                {isGuided ? "Guided Analysis" : "Manual Analysis"}
              </h1>
              <p className="text-muted-foreground">
                {isGuided 
                  ? "Let AI help you choose the right features" 
                  : "Select panels and features directly"}
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              Step {stepIndex + 1} of {steps.length}
            </Badge>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-ocean-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step: Hypothesis (Guided only) */}
        {currentStep === "hypothesis" && isGuided && (
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-100">
                  <Sparkles className="h-5 w-5 text-ocean-600" />
                </div>
                <div>
                  <CardTitle>Describe your research question</CardTitle>
                  <CardDescription>What are you curious about?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea 
                placeholder="Example: I suspect highly expressed genes under stress have a distinctive codon usage pattern..."
                className="min-h-32 resize-none text-base"
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
              />
              
              <div className="bg-ocean-50 rounded-lg p-4 border border-ocean-100">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-ocean-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-ocean-800">
                    <p className="font-medium mb-1">Tips for better recommendations:</p>
                    <ul className="space-y-1 text-ocean-700">
                      <li>• Mention specific biological processes or conditions</li>
                      <li>• Include what you expect to observe</li>
                      <li>• Reference any previous findings if relevant</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="ocean" 
                  size="lg"
                  disabled={!hypothesis.trim()}
                  onClick={() => setCurrentStep("upload")}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Upload */}
        {currentStep === "upload" && (
          <div className="space-y-6 animate-fade-in">
            <SequenceUpload onSequencesParsed={handleSequencesParsed} />
            
            <div className="flex justify-between pt-4">
              {isGuided && (
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep("hypothesis")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button 
                variant="ocean" 
                size="lg"
                className="ml-auto"
                disabled={!parseResult || parseResult.sequences.length === 0}
                onClick={() => setCurrentStep("panels")}
              >
                Continue with {parseResult?.stats.count || 0} sequences
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Panel Selection */}
        {currentStep === "panels" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-100">
                      <Dna className="h-5 w-5 text-ocean-600" />
                    </div>
                    <div>
                      <CardTitle>
                        {isGuided ? "Recommended Panels" : "Select Panels"}
                      </CardTitle>
                      <CardDescription>
                        {isGuided 
                          ? "Based on your hypothesis, we recommend these feature panels"
                          : "Choose which feature panels to compute"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <LoadTemplateDialog onLoad={handleLoadTemplate} />
                    <SaveTemplateDialog selectedPanels={selectedPanels} />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Panels Loading State */}
            {panelsLoading && (
              <Card variant="default" className="animate-pulse">
                <CardContent className="p-6 flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <div>
                    <p className="font-medium">Loading feature panels...</p>
                    <p className="text-sm text-muted-foreground">Fetching available panels from backend</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Loading State */}
            {aiLoading && isGuided && !panelsLoading && (
              <Card variant="ocean" className="animate-pulse">
                <CardContent className="p-6 flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-ocean-600" />
                  <div>
                    <p className="font-medium text-ocean-800">Analyzing your hypothesis...</p>
                    <p className="text-sm text-ocean-600">Finding the most relevant feature panels</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Panel List - Use AI recommendations sorted by relevance if available, else dynamic panels */}
            {!panelsLoading && <div className="space-y-4">
              {(isGuided && aiRecommendations.length > 0 ? 
                [...aiRecommendations].sort((a, b) => b.relevanceScore - a.relevanceScore).map((rec, index) => {
                  const panel = availablePanels.find(p => p.id === rec.panelId) || {
                    id: rec.panelId,
                    name: rec.panel?.name || rec.panelId,
                    description: rec.panel?.description || '',
                    features: rec.panel?.features || [],
                    citations: 500,
                    cost: 'medium' as const
                  };
                  return (
                    <Card 
                      key={panel.id}
                      variant={selectedPanels.includes(panel.id) ? "ocean" : "interactive"}
                      className="opacity-0 animate-fade-in"
                      style={{ animationDelay: `${index * 75}ms` }}
                      onClick={() => togglePanel(panel.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Checkbox 
                            checked={selectedPanels.includes(panel.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{panel.name}</h3>
                              <Badge variant="outline" className="bg-ocean-100 text-ocean-700">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {rec.relevanceScore}/10 relevance
                              </Badge>
                              <Badge variant="outline" className={costBadge[panel.cost].className}>
                                <Clock className="h-3 w-3 mr-1" />
                                {costBadge[panel.cost].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {panel.description}
                            </p>
                            
                            <div className="bg-ocean-50/50 rounded-lg p-3 mb-3 border border-ocean-100">
                              <div className="flex gap-2 text-sm">
                                <Sparkles className="h-4 w-4 text-ocean-600 shrink-0 mt-0.5" />
                                <p className="text-ocean-800">{rec.relevanceExplanation}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {panel.features.map(feature => (
                                <span 
                                  key={feature}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              : availablePanels.map((panel, index) => (
                <Card 
                  key={panel.id}
                  variant={selectedPanels.includes(panel.id) ? "ocean" : "interactive"}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 75}ms` }}
                  onClick={() => togglePanel(panel.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={selectedPanels.includes(panel.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{panel.name}</h3>
                          <Badge variant="outline" className={costBadge[panel.cost].className}>
                            <Clock className="h-3 w-3 mr-1" />
                            {costBadge[panel.cost].label}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <BookOpen className="h-3 w-3" />
                            {panel.citations} citations
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {panel.description}
                        </p>
                        
                        {isGuided && panel.relevance && (
                          <div className="bg-ocean-50/50 rounded-lg p-3 mb-3 border border-ocean-100">
                            <div className="flex gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-ocean-600 shrink-0 mt-0.5" />
                              <p className="text-ocean-800">{panel.relevance}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {panel.features.map(feature => (
                            <span 
                              key={feature}
                              className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )))}
            </div>}

            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep("upload")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                variant="ocean" 
                size="lg"
                disabled={selectedPanels.length === 0}
                onClick={() => setCurrentStep("configure")}
              >
                Continue with {selectedPanels.length} panel{selectedPanels.length !== 1 ? 's' : ''}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {currentStep === "configure" && (
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Configure & Run</CardTitle>
                  <CardDescription>Review settings and start computation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Research Question/Hypothesis */}
              {isGuided && hypothesis && (
                <div className="bg-ocean-50 rounded-lg p-4 border border-ocean-100">
                  <h4 className="font-medium mb-2 text-ocean-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Research Question
                  </h4>
                  <p className="text-sm text-ocean-700">{hypothesis}</p>
                </div>
              )}

              {/* Sequence Data Summary */}
              {parseResult && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Dna className="h-4 w-4" />
                    Sequence Data
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-primary">{parseResult.stats.count}</div>
                      <div className="text-xs text-muted-foreground">Sequences</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-secondary-foreground">{parseResult.stats.minLength}</div>
                      <div className="text-xs text-muted-foreground">Min Length</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-secondary-foreground">{parseResult.stats.maxLength}</div>
                      <div className="text-xs text-muted-foreground">Max Length</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-secondary-foreground">{parseResult.stats.medianLength}</div>
                      <div className="text-xs text-muted-foreground">Median</div>
                    </div>
                  </div>
                  
                  {/* Preview of sequences */}
                  <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Preview (first {Math.min(5, parseResult.sequences.length)} sequences)
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {parseResult.sequences.slice(0, 5).map((seq, idx) => {
                        const PREVIEW_SEQUENCE_LENGTH = 80;
                        return (
                          <div key={idx} className="text-xs border-l-2 border-primary/30 pl-2">
                            <div className="font-medium text-slate-700">{seq.name}</div>
                            <div className="font-mono text-slate-500 truncate max-w-full">
                              {seq.sequence.substring(0, PREVIEW_SEQUENCE_LENGTH)}
                              {seq.sequence.length > PREVIEW_SEQUENCE_LENGTH && '...'}
                            </div>
                            <div className="text-slate-400">Length: {seq.length} bp</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Panels Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Selected Panels ({selectedPanels.length})
                </h4>
                {selectedPanels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPanels.map(panelId => {
                      const panel = FEATURE_PANELS.find(p => p.id === panelId);
                      const windowedEnabled = windowConfig.start.enabled || windowConfig.end.enabled;
                      return panel ? (
                        <Badge key={panelId} variant="secondary" className="text-sm py-1 px-3">
                          {panel.name}
                          {windowedEnabled && !panel.supportsWindowed && (
                            <span className="ml-1 text-amber-600">(global only)</span>
                          )}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No panels selected. Please go back to select panels.</p>
                )}
              </div>

              {/* Window Configuration - Separate panels for start and end */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Windowed Analysis</h4>
                <StartWindowConfigPanel
                  config={windowConfig.start}
                  onChange={(cfg) => setWindowConfig({ ...windowConfig, start: cfg })}
                  maxSequenceLength={parseResult?.stats.maxLength || 10000}
                />
                <EndWindowConfigPanel
                  config={windowConfig.end}
                  onChange={(cfg) => setWindowConfig({ ...windowConfig, end: cfg })}
                  maxSequenceLength={parseResult?.stats.maxLength || 10000}
                />
              </div>

              {/* Runtime Estimate - based on window count */}
              <Card variant="emerald">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <Clock className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Estimated Runtime</p>
                      {(() => {
                        const seqCount = parseResult?.stats.count || 0;
                        const maxLen = parseResult?.stats.maxLength || 1000;
                        
                        const calcWindows = (cfg: SingleWindowConfig, length: number) => {
                          if (!cfg.enabled || cfg.windowSize <= 0 || cfg.stepSize <= 0) return 0;
                          const effectiveLen = (cfg.endIndex ?? length) - (cfg.startIndex ?? 0);
                          if (effectiveLen < cfg.windowSize) return 0;
                          return Math.max(1, Math.floor((effectiveLen - cfg.windowSize) / cfg.stepSize) + 1);
                        };
                        
                        const startWindows = calcWindows(windowConfig.start, maxLen);
                        const endWindows = calcWindows(windowConfig.end, maxLen);
                        const totalWindowsPerSeq = startWindows + endWindows;
                        const totalOperations = seqCount * selectedPanels.length * Math.max(1, totalWindowsPerSeq);
                        
                        // Rough estimate: 0.1s per 100 operations
                        const estMinutes = Math.max(1, Math.ceil(totalOperations / 600));
                        const estMaxMinutes = estMinutes * 2;
                        
                        return (
                          <>
                            <p className="text-2xl font-display font-bold text-emerald-700">
                              {estMinutes}-{estMaxMinutes} minutes
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {seqCount} sequences × {selectedPanels.length} panels
                              {totalWindowsPerSeq > 0 && ` × ~${totalWindowsPerSeq} windows/seq`}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-ocean-50 rounded-lg p-4 border border-ocean-100">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-ocean-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-ocean-800">
                    You can stop the calculation early and still explore results from panels computed so far.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep("panels")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="scientific" size="lg" onClick={handleRunAnalysis} disabled={isSubmitting}>
                  <Zap className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Run Analysis"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
