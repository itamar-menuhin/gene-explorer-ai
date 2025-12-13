import { useState, useEffect } from "react";
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

// Convert FEATURE_PANELS to Panel format for display
const convertToDisplayPanels = (): Panel[] => {
  // Citation counts for different panel types (approximate from literature)
  const citationMap: Record<string, number> = {
    'sequence': 2100,
    'chemical': 1500,
    'codonUsage': 1240,
    'disorder': 890,
    'structure': 650,
    'motif': 500,
  };
  
  return FEATURE_PANELS.map(panel => ({
    id: panel.id,
    name: panel.name,
    description: panel.description,
    citations: citationMap[panel.id] || 500,
    cost: panel.category === 'structure' || panel.category === 'regulatory' ? 'high' as const : 'low' as const,
    features: panel.features.map(f => f.name),
  }));
};

const availablePanels: Panel[] = convertToDisplayPanels();

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

  const [currentStep, setCurrentStep] = useState<Step>(isGuided ? "hypothesis" : "upload");
  const [hypothesis, setHypothesis] = useState("");
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<PanelRecommendation[]>([]);
  const [windowConfig, setWindowConfig] = useState<WindowConfig>({
    start: { enabled: false, windowSize: 45, stepSize: 3 },
    end: { enabled: false, windowSize: 45, stepSize: 3 },
  });
  
  const { getRecommendations, loading: aiLoading } = usePanelRecommendations();

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
        status: 'draft'
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Failed to create analysis", description: error.message });
    } else if (data) {
      toast({ title: "Analysis created", description: "Starting computation..." });
      // Pass AI recommendations and sequences via state
      navigate(`/analysis/${data.id}`, { 
        state: { 
          aiRecommendations: aiRecommendations,
          sequences: parseResult?.sequences.map(s => ({
            id: s.id,
            sequence: s.sequence,
            name: s.name || s.id
          })) || []
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

            {/* AI Loading State */}
            {aiLoading && isGuided && (
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

            {/* Panel List - Use AI recommendations sorted by relevance if available, else mock panels */}
            <div className="space-y-4">
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
            </div>

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

              {/* Selected Panels Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-medium mb-3">Selected Panels ({selectedPanels.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPanels.map(panelId => {
                    const panel = FEATURE_PANELS.find(p => p.id === panelId);
                    const windowedEnabled = windowConfig.start.enabled || windowConfig.end.enabled;
                    return panel ? (
                      <Badge key={panelId} variant="secondary">
                        {panel.name}
                        {windowedEnabled && !panel.supportsWindowed && (
                          <span className="ml-1 text-amber-600">(global only)</span>
                        )}
                      </Badge>
                    ) : null;
                  })}
                </div>
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
