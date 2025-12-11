import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ListChecks, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickStartCard() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-display font-semibold mb-6">Start New Analysis</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Guided Mode Card */}
        <Card variant="ocean" className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-ocean-200/30 to-transparent rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-200/20 to-transparent rounded-full translate-y-6 -translate-x-6" />
          
          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-500/10 border border-ocean-200">
                <Sparkles className="h-5 w-5 text-ocean-600" />
              </div>
              <div className="px-2.5 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-medium">
                Recommended
              </div>
            </div>
            <CardTitle className="text-xl">Guided Analysis</CardTitle>
            <CardDescription className="text-slate-600">
              Describe your research question and let AI recommend the most relevant features and panels to compute.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative">
            <ul className="space-y-2 mb-6 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-ocean-400" />
                AI-powered feature recommendations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-ocean-400" />
                Hypothesis-based relevance ranking
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-ocean-400" />
                Citation-backed explanations
              </li>
            </ul>
            
            <Button variant="ocean" className="w-full group-hover:shadow-glow transition-shadow" asChild>
              <Link to="/analysis/new?mode=guided">
                Start Guided Analysis
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Manual Mode Card */}
        <Card variant="feature" className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-slate-200/40 to-transparent rounded-full -translate-y-6 translate-x-6" />
          
          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                <ListChecks className="h-5 w-5 text-slate-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Manual Selection</CardTitle>
            <CardDescription>
              Already know what to compute? Select panels and features directly, or use a saved template.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative">
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Direct panel & feature selection
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Apply saved templates
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Full customization control
              </li>
            </ul>
            
            <Button variant="outline" className="w-full" asChild>
              <Link to="/analysis/new?mode=manual">
                Manual Selection
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
