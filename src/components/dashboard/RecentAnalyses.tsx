import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Dna, FileText, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Analysis {
  id: string;
  name: string;
  hypothesis?: string;
  sequenceCount: number;
  panelsComputed: number;
  status: "completed" | "computing" | "draft";
  createdAt: string;
}

const statusConfig = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  computing: { label: "Computing", className: "bg-ocean-100 text-ocean-700 border-ocean-200" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function RecentAnalyses() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalyses() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('id, name, hypothesis, sequence_count, selected_panels, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data) {
          const formattedAnalyses: Analysis[] = data.map(a => ({
            id: a.id,
            name: a.name || 'Untitled Analysis',
            hypothesis: a.hypothesis || undefined,
            sequenceCount: a.sequence_count || 0,
            panelsComputed: Array.isArray(a.selected_panels) ? a.selected_panels.length : 0,
            // Normalize status: map 'in_progress' to 'computing' for consistency
            status: (a.status === 'in_progress' ? 'computing' : a.status as "completed" | "computing" | "draft") || 'draft',
            createdAt: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }),
          }));
          setAnalyses(formattedAnalyses);
        }
      } catch (error) {
        console.error('Error fetching analyses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, [user]);

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!user || analyses.length === 0) {
    return null;
  }

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
        {analyses.map((analysis, index) => (
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
