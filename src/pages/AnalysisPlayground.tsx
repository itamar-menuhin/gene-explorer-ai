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
  ChevronDown, ChevronUp, TrendingUp, Layers, ArrowUpRight, Play
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

// Mock data for visualizations
const generateProfileData = () => {
  const data = [];
  for (let i = 0; i < 100; i++) {
    const base = 0.5 + Math.sin(i / 10) * 0.15;
    data.push({
      position: i * 3,
      value: base + (Math.random() - 0.5) * 0.2,
      q95: base + 0.25 + Math.random() * 0.05,
      q75: base + 0.15 + Math.random() * 0.03,
      q50: base + Math.random() * 0.02,
      q25: base - 0.15 - Math.random() * 0.03,
      q5: base - 0.25 - Math.random() * 0.05,
    });
  }
  return data;
};

const generateDistributionData = () => {
  const data = [];
  for (let i = 0; i < 50; i++) {
    const x = 0.2 + (i / 50) * 0.6;
    const height = Math.exp(-Math.pow((x - 0.55) / 0.12, 2) / 2) * 100;
    data.push({
      value: x.toFixed(2),
      count: Math.round(height + Math.random() * 10),
    });
  }
  return data;
};

const profileData = generateProfileData();
const distributionData = generateDistributionData();

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

const sequences = [
  { id: "all", name: "All sequences (248)" },
  { id: "gene_001", name: "GENE_001 - Stress response factor" },
  { id: "gene_002", name: "GENE_002 - Heat shock protein" },
  { id: "gene_003", name: "GENE_003 - Translation elongation" },
];

export default function AnalysisPlayground() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [selectedFeature, setSelectedFeature] = useState("cai");
  const [selectedSequence, setSelectedSequence] = useState("all");
  const [analysisName, setAnalysisName] = useState("Stress Response Codon Analysis");
  const [hypothesis, setHypothesis] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'computing' | 'completed'>('draft');
  const [showProgress, setShowProgress] = useState(false);
  const [computationId, setComputationId] = useState<number | null>(null);
  
  // Cached AI recommendations from guided mode
  const [cachedRecommendations, setCachedRecommendations] = useState<PanelRecommendation[]>([]);
  
  // Real analysis data from database
  const [realAnalysisData, setRealAnalysisData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  // Options visibility state
  const [profileOptionsOpen, setProfileOptionsOpen] = useState(false);
  const [distributionOptionsOpen, setDistributionOptionsOpen] = useState(false);

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
          setStatus(data?.status ?? 'draft');
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
  const mockSequences = sequences.slice(1).map((s, i) => ({
    id: s.id,
    name: s.name.split(' - ')[0],
    sequence: 'ATGC'.repeat(100),
    length: 400 + i * 50
  }));
  
  // Sort panels by cached recommendation relevance (highest first)
  const selectedPanels = useMemo(() => {
    const basePanels = ['codon_usage', 'cai', 'mrna_folding', 'gc_content'];
    if (cachedRecommendations.length === 0) return basePanels;
    
    // Sort based on recommendation order (already sorted by relevance from guided mode)
    const recommendedOrder = cachedRecommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map(r => r.panelId);
    
    // Return panels in recommendation order, keeping any that aren't in recommendations at the end
    return [
      ...recommendedOrder.filter(p => basePanels.includes(p)),
      ...basePanels.filter(p => !recommendedOrder.includes(p))
    ];
  }, [cachedRecommendations]);
  
  // Use real data if available, otherwise fall back to mock data
  const featureData = useMemo(() => {
    // If we have real analysis data with results, use it
    if (realAnalysisData?.results) {
      return realAnalysisData.results;
    }
    
    // Otherwise, use mock data if computation was triggered
    if (computationId === null) return [];
    return generateMockFeatureData(mockSequences, selectedPanels);
  }, [realAnalysisData, computationId, selectedPanels, mockSequences]);
  
  const featureNames = getAllFeatureNames(selectedPanels);
  
  const mockCitations = [
    { title: 'The effective number of codons used in a gene', authors: 'Wright F.', year: 1990, journal: 'Gene', doi: '10.1016/0378-1119(90)90491-9' },
    { title: 'The codon adaptation index', authors: 'Sharp PM, Li WH', year: 1987, journal: 'Nucleic Acids Res', doi: '10.1093/nar/15.3.1281' },
    { title: 'Mfold web server for nucleic acid folding', authors: 'Zuker M.', year: 2003, journal: 'Nucleic Acids Res', doi: '10.1093/nar/gkg595' }
  ];

  const { state: progressState, startComputation, stopComputation, resetComputation } = 
    useComputationProgress(248, selectedPanels);

  // Load cached recommendations from navigation state
  useEffect(() => {
    const state = location.state as { aiRecommendations?: PanelRecommendation[] } | null;
    if (state?.aiRecommendations) {
      setCachedRecommendations(state.aiRecommendations);
    }
  }, [location.state]);

  // Fetch analysis data
  useEffect(() => {
    async function fetchAnalysis() {
      if (!id) return;
      const { data } = await supabase
        .from('analyses')
        .select('name, share_token, status, hypothesis, computed_at')
        .eq('id', id)
        .maybeSingle();
      
      if (data) {
        setAnalysisName(data.name);
        setShareToken(data.share_token);
        setHypothesis(data.hypothesis);
        setStatus(data.status as 'draft' | 'computing' | 'completed');
        // Only set computationId if there's an actual computation
        if (data.computed_at) {
          setComputationId(new Date(data.computed_at).getTime());
        }
      }
    }
    fetchAnalysis();
  }, [id]);

  const handleStartComputation = async () => {
    setShowProgress(true);
    setStatus('computing');
    
    if (id) {
      await supabase.from('analyses').update({ status: 'computing' }).eq('id', id);
    }
    
    const completedPanels = await startComputation();
    
    // Trigger new feature data generation
    setComputationId(Date.now());
    
    if (id) {
      await supabase.from('analyses')
        .update({ 
          status: 'completed', 
          computed_at: new Date().toISOString(),
          selected_panels: completedPanels 
        })
        .eq('id', id);
    }
    setStatus('completed');
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
            { label: "Sequences", value: "248" },
            { label: "Panels Computed", value: "4" },
            { label: "Features Available", value: "12" },
            { label: "Runtime", value: "3m 24s" },
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
                      {sequences.map((seq) => (
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
                        <CollapsibleContent className="absolute right-6 top-16 z-10 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Display Options</h4>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" defaultChecked className="rounded" />
                                Show quantile bands
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" defaultChecked className="rounded" />
                                Show median line
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="rounded" />
                                Show grid
                              </label>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                    
                    {/* Legend */}
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
                        <CollapsibleContent className="absolute right-6 top-16 z-10 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Display Options</h4>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" defaultChecked className="rounded" />
                                Show area fill
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" defaultChecked className="rounded" />
                                Show summary stats
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="rounded" />
                                Smooth curve
                              </label>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardHeader>
                  <CardContent>
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

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200">
                      {[
                        { label: "Mean", value: "0.548" },
                        { label: "Median", value: "0.562" },
                        { label: "Std Dev", value: "0.089" },
                        { label: "Range", value: "0.31 - 0.79" },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center">
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="font-semibold font-mono">{stat.value}</p>
                        </div>
                      ))}
                    </div>
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
