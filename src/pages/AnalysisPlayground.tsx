import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PanelRecommendation } from "@/hooks/usePanelRecommendations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BarChart3, Download, BookOpen, Info, 
  ChevronDown, ChevronUp, TrendingUp, Layers, ArrowUpRight, Play, Loader2
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, AreaChart, ReferenceLine, ComposedChart, Bar
} from "recharts";
import { ExportDialog } from "@/components/analysis/ExportDialog";
import { ShareAnalysisDialog } from "@/components/analysis/ShareAnalysisDialog";
import { ComputationProgress } from "@/components/analysis/ComputationProgress";
import { useComputationProgress } from "@/hooks/useComputationProgress";
import { generateMockFeatureData, getAllFeatureNames, FeatureData } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureExtraction } from "@/hooks/useFeatureExtraction";
import type { FeaturePanelConfig } from "@/types/featureExtraction";

/**
 * Compute real profile data from windowed results
 * Groups windows by position and calculates quantiles across sequences
 */
const computeProfileData = (
  windowedResults: any[],
  featureId: string,
  selectedSequenceId: string | null
) => {
  if (!windowedResults || windowedResults.length === 0) {
    return [];
  }

  // Filter for windowed results only (those with windowStart/windowEnd)
  const windowedData = windowedResults.filter(r => r.windowStart !== undefined);
  
  if (windowedData.length === 0) {
    return [];
  }

  // If specific sequence selected, return its data
  if (selectedSequenceId && selectedSequenceId !== 'all') {
    const seqWindows = windowedData
      .filter(r => r.sequenceId === selectedSequenceId)
      .sort((a, b) => a.windowStart - b.windowStart);
    
    return seqWindows.map(w => {
      const featureValue = w.features?.[featureId] || 0;
      return {
        position: w.windowStart,
        value: featureValue,
        q50: featureValue, // For single sequence, median equals the value
      };
    });
  }

  // For "all sequences", compute quantiles across sequences at each window position
  const windowPositions = new Map<number, number[]>();
  
  windowedData.forEach(w => {
    const pos = w.windowStart;
    const value = w.features?.[featureId];
    if (typeof value === 'number') {
      if (!windowPositions.has(pos)) {
        windowPositions.set(pos, []);
      }
      windowPositions.get(pos)!.push(value);
    }
  });

  // Calculate quantiles for each position
  const profileData = Array.from(windowPositions.entries())
    .map(([position, values]) => {
      values.sort((a, b) => a - b);
      const len = values.length;
      
      return {
        position,
        value: values[Math.floor(len * 0.5)] || 0,
        q95: values[Math.floor(len * 0.95)] || 0,
        q75: values[Math.floor(len * 0.75)] || 0,
        q50: values[Math.floor(len * 0.5)] || 0,
        q25: values[Math.floor(len * 0.25)] || 0,
        q5: values[Math.floor(len * 0.05)] || 0,
      };
    })
    .sort((a, b) => a.position - b.position);

  return profileData;
};

/**
 * Compute distribution data from global results
 * Creates histogram of feature values across all sequences
 */
const computeDistributionData = (
  globalResults: any[],
  featureId: string
) => {
  if (!globalResults || globalResults.length === 0) {
    return [];
  }

  // Extract feature values from global results (those without windowStart)
  const values = globalResults
    .filter(r => r.windowStart === undefined)
    .map(r => r.features?.[featureId])
    .filter((v): v is number => typeof v === 'number');

  if (values.length === 0) {
    return [];
  }

  // Calculate histogram with dynamic binning
  const MAX_BINS = 50;
  const BIN_MULTIPLIER = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(MAX_BINS, Math.ceil(Math.sqrt(values.length)) * BIN_MULTIPLIER);
  const binSize = (max - min) / binCount;

  const bins = new Array(binCount).fill(0);
  values.forEach(v => {
    const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
    bins[binIndex]++;
  });

  return bins.map((count, i) => ({
    value: (min + (i + 0.5) * binSize).toFixed(3),
    count,
  }));
};

const features = [
  { 
    id: "enc", 
    name: "ENC (Effective Number of Codons)", 
    panel: "Codon Usage Bias",
    description: "The Effective Number of Codons (ENC) quantifies the degree of codon bias. Values range from 20 (extreme bias, only one codon per amino acid) to 61 (no bias, all codons used equally).",
    citation: "Wright F., 1990"
  },
  { 
    id: "cai", 
    name: "CAI Score", 
    panel: "Codon Adaptation Index",
    description: "The Codon Adaptation Index measures how well a gene's codon usage matches the codon usage of highly expressed reference genes. Higher values indicate better adaptation for efficient translation.",
    citation: "Sharp & Li, 1987"
  },
  { 
    id: "mfe", 
    name: "MFE (Minimum Free Energy)", 
    panel: "mRNA Secondary Structure",
    description: "Minimum Free Energy predicts the most stable RNA secondary structure. More negative values indicate stronger, more stable structures which may affect translation efficiency.",
    citation: "Zuker M., 2003"
  },
  { 
    id: "gc", 
    name: "GC Content", 
    panel: "GC Content Analysis",
    description: "The percentage of guanine and cytosine bases in the sequence. GC content affects melting temperature, secondary structure stability, and codon usage patterns.",
    citation: "Various"
  },
];

const sequenceOptions = [
  { id: "all", name: "All sequences (248)" },
  { id: "gene_001", name: "GENE_001 - Stress response factor" },
  { id: "gene_002", name: "GENE_002 - Heat shock protein" },
  { id: "gene_003", name: "GENE_003 - Translation elongation" },
];

export default function AnalysisPlayground() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState("cai");
  const [selectedSequence, setSelectedSequence] = useState("all");
  const [analysisName, setAnalysisName] = useState("Stress Response Codon Analysis");
  const [hypothesis, setHypothesis] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'computing' | 'completed'>('draft');
  const [showProgress, setShowProgress] = useState(false);
  const [computationId, setComputationId] = useState<number | null>(null);
  const [profileOptionsOpen, setProfileOptionsOpen] = useState(false);
  const [distributionOptionsOpen, setDistributionOptionsOpen] = useState(false);
  
  // Cached AI recommendations from guided mode
  const [cachedRecommendations, setCachedRecommendations] = useState<PanelRecommendation[]>([]);
  
  // Real analysis data from database
  const [realAnalysisData, setRealAnalysisData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  // Real feature extraction results
  const [extractedResults, setExtractedResults] = useState<any>(null);
  
  // Sequences from location state (passed from NewAnalysis)
  const [storedSequences, setStoredSequences] = useState<Array<{id: string; sequence: string; name?: string}>>([]);
  const [storedWindowConfig, setStoredWindowConfig] = useState<any>(null);
  
  // Feature extraction hook
  const { 
    extractFeatures, 
    isLoading: isExtracting, 
    progress: extractionProgress,
    error: extractionError 
  } = useFeatureExtraction({
    onProgress: (progress, message) => {
      console.log(`Extraction progress: ${progress}% - ${message}`);
    }
  });

  const currentFeature = features.find(f => f.id === selectedFeature);
  
  // Fetch real analysis data from database
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) return;
      
      setIsLoadingAnalysis(true);
      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching analysis:', error);
        } else if (data) {
          setRealAnalysisData(data);
          setAnalysisName(data?.name ?? 'Untitled Analysis');
          setHypothesis(data?.hypothesis ?? null);
          setShareToken(data?.share_token ?? null);
          setStatus((data?.status as 'draft' | 'computing' | 'completed') ?? 'draft');
          
          // Load sequences from database if not passed via navigation state
          if (data?.sequences && Array.isArray(data.sequences) && data.sequences.length > 0) {
            setStoredSequences(data.sequences);
            console.log(`Loaded ${data.sequences.length} sequences from database`);
          }
          
          // Load window config from database
          if (data?.window_config) {
            setStoredWindowConfig(data.window_config);
          }
          
          // Set computation ID if analysis has been computed
          if (data?.computed_at) {
            setComputationId(new Date(data.computed_at).getTime());
          }
        }
      } catch (err) {
        console.error('Failed to fetch analysis:', err);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };
    
    fetchAnalysis();
  }, [id]);

  // Get relevance from cached AI recommendations
  const getFeatureRelevance = (featureId?: string, panel?: string, hypothesis?: string | null): string => {
    if (!featureId) {
      return "Select a feature to see relevance information.";
    }
    
    // First try to find cached AI recommendation for this panel
    if (cachedRecommendations.length > 0) {
      // Map feature id to panel id
      const featureToPanelMap: Record<string, string> = {
        enc: 'codon_usage',
        cai: 'cai',
        mfe: 'mrna_folding',
        gc: 'gc_content',
      };
      const panelId = featureToPanelMap[featureId];
      const recommendation = cachedRecommendations.find(r => r.panelId === panelId);
      if (recommendation) {
        return recommendation.relevanceExplanation;
      }
    }
    
    if (!hypothesis) {
      return "Run an analysis with a hypothesis to see feature-specific relevance.";
    }
    
    return `This feature may provide insights relevant to your hypothesis.`;
  };
  
  // Generate mock data for export - regenerated on each computation
  const mockSequences = sequenceOptions.slice(1).map((s, i) => ({
    id: s.id,
    name: s.name.split(' - ')[0],
    sequence: 'ATGC'.repeat(100),
    length: 400 + i * 50
  }));
  
  // Get selected panels from analysis data, or use cached recommendations
  const selectedPanels = useMemo(() => {
    // First priority: use panels from the database
    if (realAnalysisData?.selected_panels && realAnalysisData.selected_panels.length > 0) {
      return realAnalysisData.selected_panels;
    }
    
    // Second priority: use recommended panels from AI
    if (cachedRecommendations.length > 0) {
      const recommendedOrder = cachedRecommendations
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(r => r.panelId);
      return recommendedOrder;
    }
    
    // Fallback: default panels
    return ['sequence', 'chemical'];
  }, [realAnalysisData?.selected_panels, cachedRecommendations]);
  
  // Use real extracted data if available; do not fall back to mock data
  const featureData = useMemo(() => {
    // If we have extracted results from edge function, use them
    if (extractedResults?.results) {
      return extractedResults.results.map((r: any) => {
        // Find the sequence to get length
        const seq = storedSequences.find(s => s.id === r.sequenceId);
        return {
          sequenceId: r.sequenceId,
          sequenceName: r.sequenceName || r.sequenceId,
          sequenceLength: seq?.sequence?.length || 0,
          features: r.features || {},
          annotations: {},
          // Include window information if present
          windowStart: r.windowStart,
          windowEnd: r.windowEnd
        };
      });
    }
    
    // If we have real analysis data with results, use it
    if (realAnalysisData?.results) {
      return realAnalysisData.results;
    }
    
    // No real results yet
    return [];
  }, [extractedResults, realAnalysisData, storedSequences]);
  
  // Get feature names from extracted results or fallback to panel-based names
  const featureNames = useMemo(() => {
    if (extractedResults?.results?.[0]?.features) {
      return Object.keys(extractedResults.results[0].features);
    }
    return getAllFeatureNames(selectedPanels);
  }, [extractedResults, selectedPanels]);
  
  // Compute real profile data from windowed results
  const profileData = useMemo(() => {
    if (!extractedResults?.results || extractedResults.mode !== 'windowed') {
      return [];
    }
    return computeProfileData(
      extractedResults.results,
      selectedFeature,
      selectedSequence === 'all' ? null : selectedSequence
    );
  }, [extractedResults, selectedFeature, selectedSequence]);

  // Compute real distribution data from global results
  const distributionData = useMemo(() => {
    if (!extractedResults?.results) {
      return [];
    }
    return computeDistributionData(extractedResults.results, selectedFeature);
  }, [extractedResults, selectedFeature]);
  
  const mockCitations = [
    { title: 'The effective number of codons used in a gene', authors: 'Wright F.', year: 1990, journal: 'Gene', doi: '10.1016/0378-1119(90)90491-9' },
    { title: 'The codon adaptation index', authors: 'Sharp PM, Li WH', year: 1987, journal: 'Nucleic Acids Res', doi: '10.1093/nar/15.3.1281' },
    { title: 'Mfold web server for nucleic acid folding', authors: 'Zuker M.', year: 2003, journal: 'Nucleic Acids Res', doi: '10.1093/nar/gkg595' }
  ];

  const { state: progressState, startComputation, stopComputation, resetComputation } = 
    useComputationProgress(248, selectedPanels);

  // Load cached recommendations and sequences from navigation state (prioritize over database)
  useEffect(() => {
    const state = location.state as { 
      aiRecommendations?: PanelRecommendation[];
      sequences?: Array<{id: string; sequence: string; name?: string}>;
    } | null;
    
    if (state?.aiRecommendations) {
      setCachedRecommendations(state.aiRecommendations);
    }
    // Override sequences if passed via navigation state (takes priority)
    if (state?.sequences && state.sequences.length > 0) {
      setStoredSequences(state.sequences);
      console.log(`Loaded ${state.sequences.length} sequences from navigation state`);
    }
  }, [location.state]);

  const handleStartComputation = async () => {
    if (!id) {
      toast({ variant: "destructive", title: "No analysis ID found" });
      return;
    }
    
    if (storedSequences.length === 0) {
      toast({ variant: "destructive", title: "No sequences found", description: "Please create a new analysis" });
      return;
    }
    
    if (selectedPanels.length === 0) {
      toast({ variant: "destructive", title: "No panels selected", description: "Please select at least one feature panel" });
      return;
    }
    
    setShowProgress(true);
    setStatus('computing');
    
    console.log(`Starting extraction for ${storedSequences.length} sequences with panels:`, selectedPanels);
    
    try {
      // Prepare panel configuration
      const panelConfig: Partial<FeaturePanelConfig> = {};
      selectedPanels.forEach(panelId => {
        panelConfig[panelId] = { enabled: true };
      });
      
      // Call the feature extraction API
      const result = await extractFeatures(
        storedSequences,
        panelConfig,
        storedWindowConfig || undefined
      );
      
      if (result && result.success) {
        // Store results in database
        await supabase.from('analyses')
          .update({ 
            status: 'completed', 
            computed_at: new Date().toISOString(),
            results: result as any,
            selected_panels: selectedPanels 
          })
          .eq('id', id);
        
        setExtractedResults(result);
        setStatus('completed');
        setComputationId(Date.now());
        setRealAnalysisData((prev: any) => ({ ...prev, results: result }));
        
        toast({ 
          title: "Computation complete", 
          description: `Successfully analyzed ${storedSequences.length} sequences` 
        });
      } else {
        throw new Error('Feature extraction failed - no valid result returned');
      }
    } catch (error) {
      console.error('Computation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await supabase.from('analyses')
        .update({ 
          status: 'draft',
          computed_at: null,
          selected_panels: selectedPanels 
        })
        .eq('id', id);
      
      setStatus('draft');
      
      toast({ 
        variant: "destructive", 
        title: "Computation failed", 
        description: errorMessage 
      });
    } finally {
      setShowProgress(false);
    }
  };

  const handleStopComputation = () => {
    stopComputation();
  };

  return (
    <AppLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold">{analysisName}</h1>
              <Badge 
                variant="outline" 
                className={status === 'completed' 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : status === 'computing'
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
                }
              >
                {status === 'completed' ? 'Completed' : status === 'computing' ? 'Computing' : 'Draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              "Highly expressed genes under stress have distinctive codon usage"
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'draft' && (
              <Button variant="ocean" size="sm" onClick={handleStartComputation}>
                <Play className="h-4 w-4 mr-2" />
                Run Computation
              </Button>
            )}
            {id && (
              <ShareAnalysisDialog 
                analysisId={id}
                analysisName={analysisName}
                currentShareToken={shareToken}
                onShareUpdated={setShareToken}
              />
            )}
            <ExportDialog
              featureData={featureData}
              featureNames={featureNames}
              analysisName={analysisName.replace(/\s+/g, '_')}
              citations={mockCitations}
            >
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </ExportDialog>
          </div>
        </div>

        {/* Computation Progress */}
        {showProgress && (
          <div className="mb-6">
            <ComputationProgress 
              state={progressState}
              onStop={handleStopComputation}
              onReset={() => {
                resetComputation();
                setShowProgress(false);
              }}
            />
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Sequences", value: featureData.length > 0 ? featureData.length.toString() : (storedSequences.length || realAnalysisData?.sequence_count || 0).toString() },
            { label: "Panels Computed", value: selectedPanels.length.toString() },
            { label: "Features Available", value: featureNames.length.toString() },
            { label: "Runtime", value: extractedResults?.metadata?.computeTimeMs 
              ? `${(extractedResults.metadata.computeTimeMs / 1000).toFixed(1)}s` 
              : "—" },
          ].map((stat) => (
            <Card key={stat.label} variant="glass">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Feature Selection */}
          <div className="space-y-4">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Feature Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Feature</label>
                  <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {features.map((feature) => (
                        <SelectItem key={feature.id} value={feature.id}>
                          <div className="flex flex-col items-start">
                            <span>{feature.name}</span>
                            <span className="text-xs text-muted-foreground">{feature.panel}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sequence</label>
                  <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sequenceOptions.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Feature Info Card */}
            <Card variant="ocean">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  About this Feature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">{currentFeature?.name}</h4>
                  <p className="text-muted-foreground">
                    {currentFeature?.description}
                  </p>
                </div>

                <div className="bg-ocean-100/50 rounded-lg p-3 border border-ocean-200">
                  <p className="text-ocean-800">
                    <strong>Relevance:</strong> {getFeatureRelevance(currentFeature?.id, currentFeature?.panel, hypothesis)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <a href="#" className="hover:text-foreground transition-colors flex items-center gap-1">
                    {currentFeature?.citation}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="space-y-6">
            {computationId === null ? (
              <Card variant="elevated">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">No Results Yet</h3>
                      <p className="text-muted-foreground text-sm">
                        Click "Run Computation" to analyze your sequences and view results.
                      </p>
                    </div>
                    <Button variant="ocean" onClick={handleStartComputation}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Computation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="profile" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Position Profile
                </TabsTrigger>
                <TabsTrigger value="distribution" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Distribution
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Per-Position Profile</CardTitle>
                        <CardDescription>
                          {selectedSequence === "all" 
                            ? "Quantile bands across all sequences" 
                            : "Individual sequence profile with quantile bands"}
                        </CardDescription>
                      </div>
                      <Collapsible open={profileOptionsOpen} onOpenChange={setProfileOptionsOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {profileOptionsOpen ? (
                              <ChevronUp className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            Options
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="absolute right-0 mt-2 z-10 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Display Options</h4>
                            <div className="space-y-2">
                              <label htmlFor="profile-quantile" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="profile-quantile" type="checkbox" defaultChecked className="rounded" />
                                Show quantile bands
                              </label>
                              <label htmlFor="profile-median" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="profile-median" type="checkbox" defaultChecked className="rounded" />
                                Show median line
                              </label>
                              <label htmlFor="profile-grid" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="profile-grid" type="checkbox" className="rounded" />
                                Show grid
                              </label>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profileData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <p className="text-sm">No windowed data available</p>
                          <p className="text-xs mt-2">Enable windowed analysis to see position profiles</p>
                        </div>
                      </div>
                    ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={profileData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                          <defs>
                            <linearGradient id="quantile95" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0891b2" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="quantile75" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0891b2" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="position" 
                            tickLine={false}
                            axisLine={{ stroke: "#cbd5e1" }}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={{ stroke: "#cbd5e1" }}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            domain={[0, 1]}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)"
                            }}
                            labelFormatter={(value) => `Position ${value} nt`}
                          />
                          
                          {/* Outer quantile band (5-95%) */}
                          <Area 
                            type="monotone" 
                            dataKey="q95" 
                            stroke="none" 
                            fill="url(#quantile95)"
                            isAnimationActive={false}
                          />
                          
                          {/* Inner quantile band (25-75%) */}
                          <Area 
                            type="monotone" 
                            dataKey="q75" 
                            stroke="none" 
                            fill="url(#quantile75)"
                            isAnimationActive={false}
                          />
                          
                          {/* Median line */}
                          <Line 
                            type="monotone" 
                            dataKey="q50" 
                            stroke="#0891b2" 
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                          
                          {/* Selected sequence line (if individual) */}
                          {selectedSequence !== "all" && (
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    )}
                    
                    {/* Legend */}
                    {profileData.length > 0 && (
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-ocean-500" />
                        <span>Median (50%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-ocean-500/20 rounded" />
                        <span>25-75% quantile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-ocean-500/10 rounded" />
                        <span>5-95% quantile</span>
                      </div>
                      {selectedSequence !== "all" && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-emerald-500" />
                          <span>Selected sequence</span>
                        </div>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distribution">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Global Distribution</CardTitle>
                        <CardDescription>
                          Distribution of {currentFeature?.name} across all sequences
                        </CardDescription>
                      </div>
                      <Collapsible open={distributionOptionsOpen} onOpenChange={setDistributionOptionsOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {distributionOptionsOpen ? (
                              <ChevronUp className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            Options
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="absolute right-0 mt-2 z-10 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Display Options</h4>
                            <div className="space-y-2">
                              <label htmlFor="dist-area" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="dist-area" type="checkbox" defaultChecked className="rounded" />
                                Show area fill
                              </label>
                              <label htmlFor="dist-stats" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="dist-stats" type="checkbox" defaultChecked className="rounded" />
                                Show summary stats
                              </label>
                              <label htmlFor="dist-smooth" className="flex items-center gap-2 text-sm cursor-pointer">
                                <input id="dist-smooth" type="checkbox" className="rounded" />
                                Smooth curve
                              </label>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {distributionData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <p className="text-sm">No distribution data available</p>
                          <p className="text-xs mt-2">Run computation to see feature distributions</p>
                        </div>
                      </div>
                    ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={distributionData}>
                          <defs>
                            <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(160 60% 45%)" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="hsl(160 60% 45%)" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
                          <XAxis 
                            dataKey="value" 
                            tickLine={false}
                            axisLine={{ stroke: "hsl(210 20% 80%)" }}
                            tick={{ fill: "hsl(215 15% 50%)", fontSize: 12 }}
                            label={{ value: "CAI Score", position: "insideBottom", offset: -5, fill: "hsl(215 15% 50%)" }}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={{ stroke: "hsl(210 20% 80%)" }}
                            tick={{ fill: "hsl(215 15% 50%)", fontSize: 12 }}
                            label={{ value: "Count", angle: -90, position: "insideLeft", fill: "hsl(215 15% 50%)" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(0 0% 100%)",
                              border: "1px solid hsl(210 20% 90%)",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px hsl(215 25% 12% / 0.07)"
                            }}
                            formatter={(value: number) => [value, "Sequences"]}
                            labelFormatter={(value) => `CAI: ${value}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="hsl(160 60% 45%)" 
                            strokeWidth={2}
                            fill="url(#distGradient)"
                          />
                          
                          {/* Marker for selected sequence */}
                          {selectedSequence !== "all" && (
                            <ReferenceLine 
                              x="0.62" 
                              stroke="hsl(192 70% 35%)" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ 
                                value: "Selected", 
                                position: "top",
                                fill: "hsl(192 70% 35%)",
                                fontSize: 12
                              }}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    )}

                    {/* Summary Stats */}
                    {distributionData.length > 0 && (() => {
                      // Compute real statistics from extracted results
                      const values = extractedResults?.results
                        ?.filter((r: any) => r.windowStart === undefined)
                        .map((r: any) => r.features?.[selectedFeature])
                        .filter((v: any): v is number => typeof v === 'number') || [];
                      
                      if (values.length === 0) return null;
                      
                      values.sort((a, b) => a - b);
                      const mean = values.reduce((a, b) => a + b, 0) / values.length;
                      const median = values[Math.floor(values.length / 2)];
                      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
                      const stdDev = Math.sqrt(variance);
                      const min = values[0];
                      const max = values[values.length - 1];
                      
                      return (
                        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200">
                          {[
                            { label: "Mean", value: mean.toFixed(3) },
                            { label: "Median", value: median.toFixed(3) },
                            { label: "Std Dev", value: stdDev.toFixed(3) },
                            { label: "Range", value: `${min.toFixed(2)} - ${max.toFixed(2)}` },
                          ].map((stat) => (
                            <div key={stat.label} className="text-center">
                              <p className="text-sm text-muted-foreground">{stat.label}</p>
                              <p className="font-semibold font-mono">{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
