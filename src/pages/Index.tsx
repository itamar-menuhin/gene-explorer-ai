import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Dna, ArrowRight, Sparkles, BarChart3, FileDown, 
  Zap, Lock, Share2, ChevronRight
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Guided Recommendations",
    description: "Describe your hypothesis and get personalized feature recommendations backed by citations.",
  },
  {
    icon: BarChart3,
    title: "Interactive Visualizations",
    description: "Explore distributions, per-position profiles, and quantile bands across your sequences.",
  },
  {
    icon: FileDown,
    title: "Export Ready Data",
    description: "Download analysis-ready CSVs and citation lists for your publications.",
  },
  {
    icon: Zap,
    title: "Fast & Interruptible",
    description: "Ranked computation lets you stop early and still explore completed panels.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Sequences are processed in memory only—never stored on our servers.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share read-only analysis links with collaborators and reviewers.",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-ocean-50/30 to-emerald-50/20">
        {/* Background decorations */}
        <div className="absolute inset-0 dna-pattern" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        
        {/* Navigation */}
        <nav className="relative container flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-emerald-400 shadow-lg shadow-ocean-500/20">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">
              Seq<span className="gradient-text">Lens</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/docs">Documentation</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button variant="ocean" asChild>
              <Link to="/auth?signup=true">Get Started</Link>
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative container pt-20 pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ocean-100/80 text-ocean-700 text-sm font-medium mb-8 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              AI-powered sequence feature analysis
            </div>
            
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-6">
              Explore nucleotide sequences{" "}
              <span className="gradient-text">without code</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Run your lab's feature engine on sequences, visualize distributions and profiles, 
              and export analysis-ready data—all through an intuitive interface.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <Button variant="scientific" size="xl" asChild>
                <Link to="/dashboard">
                  Start Analyzing
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/docs">
                  Learn More
                  <ChevronRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Floating sequence preview */}
          <div className="mt-20 max-w-4xl mx-auto">
            <Card variant="glass" className="overflow-hidden shadow-2xl">
              <div className="bg-slate-800/95 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-4 text-sm text-slate-400 font-mono">analysis_preview.fasta</span>
                </div>
              </div>
              <CardContent className="p-6 bg-slate-900/95">
                <div className="font-mono text-sm leading-relaxed">
                  <span className="text-slate-500">&gt;GENE_001 | Stress response factor</span>
                  <div className="mt-2 tracking-wider break-all">
                    <span className="text-emerald-400">ATG</span>
                    <span className="text-ocean-400">GCT</span>
                    <span className="text-rose-400">CAA</span>
                    <span className="text-orange-400">TTG</span>
                    <span className="text-emerald-400">AGC</span>
                    <span className="text-ocean-400">GGT</span>
                    <span className="text-rose-400">CCC</span>
                    <span className="text-orange-400">TAA</span>
                    <span className="text-emerald-400">ACG</span>
                    <span className="text-ocean-400">GCA</span>
                    <span className="text-slate-500">...</span>
                  </div>
                </div>
                
                {/* Mini visualization preview */}
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 45, 80, 55, 70, 35, 90, 60, 50, 75, 45, 85, 40, 70, 55, 80, 45, 65, 50].map((h, i) => (
                      <div 
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-ocean-500 to-emerald-400 opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                    <span>Position 0</span>
                    <span>Codon Adaptation Index</span>
                    <span>Position 60</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">
              Everything you need for sequence analysis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From hypothesis to publication-ready figures, SeqLens streamlines your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                variant="feature"
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-100 to-emerald-50 mb-4">
                    <feature.icon className="h-6 w-6 text-ocean-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-ocean-500 via-ocean-600 to-emerald-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container relative text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-6">
            Ready to explore your sequences?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join researchers using SeqLens to accelerate their sequence feature analysis.
          </p>
          <Button 
            size="xl" 
            className="bg-background text-foreground hover:bg-background/90 shadow-xl"
            asChild
          >
            <Link to="/dashboard">
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-500 to-emerald-400">
                <Dna className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-semibold text-slate-200">SeqLens</span>
            </div>
            <p className="text-sm">© 2024 SeqLens. Built for researchers, by researchers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
