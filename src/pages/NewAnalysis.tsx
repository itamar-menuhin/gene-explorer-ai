import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, Upload, FileText, ArrowRight, ArrowLeft, 
  Dna, Clock, BookOpen, ChevronDown, Info, Zap
} from "lucide-react";

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

const mockPanels: Panel[] = [
  {
    id: "codon_usage",
    name: "Codon Usage Bias",
    description: "Measures the deviation from uniform codon usage, including ENC, CUB, and RSCU values.",
    relevance: "Highly relevant for expression analysis—codon bias directly impacts translation efficiency.",
    citations: 1240,
    cost: "low",
    features: ["ENC (Effective Number of Codons)", "CUB (Codon Usage Bias)", "RSCU (Relative Synonymous Codon Usage)"],
  },
  {
    id: "cai",
    name: "Codon Adaptation Index",
    description: "Quantifies how well a gene's codon usage matches highly expressed reference genes.",
    relevance: "Strong predictor of expression levels—matches your hypothesis about stress genes.",
    citations: 890,
    cost: "low",
    features: ["CAI Score", "wCAI (Weighted CAI)", "Reference Set Comparison"],
  },
  {
    id: "mrna_folding",
    name: "mRNA Secondary Structure",
    description: "Predicts RNA folding and calculates minimum free energy profiles.",
    relevance: "5' UTR structure affects ribosome binding; relevant for translation initiation.",
    citations: 650,
    cost: "high",
    features: ["MFE (Minimum Free Energy)", "Base Pairing Probability", "Structure Entropy"],
  },
  {
    id: "gc_content",
    name: "GC Content Analysis",
    description: "Calculates GC content and skew across sequence positions.",
    relevance: "GC content correlates with stability and can indicate genomic features.",
    citations: 2100,
    cost: "low",
    features: ["GC%", "GC Skew", "AT/GC Ratio"],
  },
];

const costBadge = {
  low: { label: "Fast", className: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Moderate", className: "bg-yellow-100 text-yellow-700" },
  high: { label: "Intensive", className: "bg-orange-100 text-orange-700" },
};

export default function NewAnalysis() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "guided";
  const isGuided = mode === "guided";

  const [currentStep, setCurrentStep] = useState<Step>(isGuided ? "hypothesis" : "upload");
  const [hypothesis, setHypothesis] = useState("");
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const togglePanel = (panelId: string) => {
    setSelectedPanels(prev => 
      prev.includes(panelId) 
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
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
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Upload className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Upload your sequences</CardTitle>
                  <CardDescription>FASTA, CSV, or paste directly</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-ocean-300 hover:bg-ocean-50/30 transition-colors cursor-pointer">
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                    <FileText className="h-7 w-7 text-slate-500" />
                  </div>
                  <p className="font-medium mb-1">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .fasta, .fa, .csv, .xlsx
                  </p>
                </div>
              </div>

              {/* Or paste */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">or paste sequence</span>
                </div>
              </div>

              <Textarea 
                placeholder=">Gene_001&#10;ATGGCTCAATTGAGCGGTCCC..."
                className="min-h-24 font-mono text-sm"
              />

              {/* Mock Preview */}
              <Card variant="default" className="bg-slate-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3">Dataset Preview</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sequences</p>
                      <p className="font-semibold text-lg">248</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Length</p>
                      <p className="font-semibold text-lg">420 nt</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Length</p>
                      <p className="font-semibold text-lg">1,500 nt</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
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
                  onClick={() => setCurrentStep("panels")}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Panel Selection */}
        {currentStep === "panels" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated">
              <CardHeader>
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
              </CardHeader>
            </Card>

            {/* Panel List */}
            <div className="space-y-4">
              {mockPanels.map((panel, index) => (
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
              ))}
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
              {/* Window Configuration */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Window Configuration</h4>
                  <Button variant="ghost" size="sm">
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Advanced
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Window Size</p>
                    <p className="font-semibold">45 nt</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Step Size</p>
                    <p className="font-semibold">3 nt</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Early Region</p>
                    <p className="font-semibold">100 steps</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Late Region</p>
                    <p className="font-semibold">50 steps</p>
                  </div>
                </div>
              </div>

              {/* Runtime Estimate */}
              <Card variant="emerald">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <Clock className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Estimated Runtime</p>
                      <p className="text-2xl font-display font-bold text-emerald-700">2-5 minutes</p>
                      <p className="text-sm text-muted-foreground">
                        248 sequences × {selectedPanels.length} panels
                      </p>
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
                <Button variant="scientific" size="lg">
                  <Zap className="h-4 w-4 mr-2" />
                  Run Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
