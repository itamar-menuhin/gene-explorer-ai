import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Dna, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Analysis {
  id: string;
  name: string;
  hypothesis?: string;
  sequenceCount: number;
  panelsComputed: number;
  status: "completed" | "in_progress" | "draft";
  createdAt: string;
}

const mockAnalyses: Analysis[] = [
  {
    id: "1",
    name: "Stress Response Codon Analysis",
    hypothesis: "Highly expressed genes under stress have distinctive codon usage",
    sequenceCount: 248,
    panelsComputed: 4,
    status: "completed",
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    name: "mRNA Secondary Structure Study",
    hypothesis: "5' UTR folding correlates with translation efficiency",
    sequenceCount: 156,
    panelsComputed: 2,
    status: "in_progress",
    createdAt: "1 day ago",
  },
  {
    id: "3",
    name: "Quick Feature Check",
    sequenceCount: 12,
    panelsComputed: 6,
    status: "completed",
    createdAt: "3 days ago",
  },
];

const statusConfig = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  in_progress: { label: "In Progress", className: "bg-ocean-100 text-ocean-700 border-ocean-200" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function RecentAnalyses() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold">Recent Analyses</h2>
          <p className="text-muted-foreground mt-1">Continue where you left off</p>
        </div>
        <Button variant="ghost" className="gap-2">
          View all <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        {mockAnalyses.map((analysis, index) => (
          <Card 
            key={analysis.id} 
            variant="interactive"
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="truncate">{analysis.name}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={statusConfig[analysis.status].className}
                    >
                      {statusConfig[analysis.status].label}
                    </Badge>
                  </div>
                  {analysis.hypothesis && (
                    <CardDescription className="line-clamp-1">
                      "{analysis.hypothesis}"
                    </CardDescription>
                  )}
                </div>
                <Button variant="subtle" size="sm" asChild>
                  <Link to={`/analysis/${analysis.id}`}>
                    Open
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Dna className="h-4 w-4" />
                  <span>{analysis.sequenceCount} sequences</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span>{analysis.panelsComputed} panels</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{analysis.createdAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
