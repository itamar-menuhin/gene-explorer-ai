import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExportDialog } from '@/components/analysis/ExportDialog';
import { generateMockFeatureData, getAllFeatureNames } from '@/lib/csvExport';
import { 
  FlaskConical, 
  Calendar, 
  Dna, 
  BarChart3, 
  Eye, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Analysis {
  id: string;
  name: string;
  hypothesis: string | null;
  sequence_count: number | null;
  selected_panels: string[] | null;
  status: string;
  created_at: string;
  computed_at: string | null;
  min_length: number | null;
  max_length: number | null;
  median_length: number | null;
}

// Mock data for demonstration
const mockSequences = [
  { id: '1', name: 'Sequence_001', sequence: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH', length: 50 },
  { id: '2', name: 'Sequence_002', sequence: 'MGHFTEEDKATITSLWGKVNVEDAGGETLGRLLVVYPWTQRFFASFGNLSS', length: 50 },
  { id: '3', name: 'Sequence_003', sequence: 'MADQLTEEQIAEFKEAFSLFDKDGDGTITTKELGTVMRSLGQNPTEAELQD', length: 50 },
];

const mockCitations = [
  { title: 'The effective number of codons used in a gene', authors: 'Wright F.', year: 1990, journal: 'Gene', doi: '10.1016/0378-1119(90)90491-9' },
  { title: 'Hydrophobicity analysis', authors: 'Kyte J, Doolittle RF', year: 1982, journal: 'J Mol Biol' },
];

export default function SharedAnalysis() {
  const { token } = useParams<{ token: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('analyses')
          .select('*')
          .eq('share_token', token)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Analysis not found or link has expired');
        } else {
          setAnalysis(data);
        }
      } catch (err) {
        console.error('Error fetching shared analysis:', err);
        setError('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Unable to Load Analysis</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-primary/5 border-b border-primary/20 py-3">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              You're viewing a <strong className="text-foreground">read-only</strong> shared analysis
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Analysis Header */}
        <div className="space-y-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">{analysis.name}</h1>
              </div>
              {analysis.hypothesis && (
                <p className="text-muted-foreground max-w-2xl">{analysis.hypothesis}</p>
              )}
            </div>
            <Badge 
              variant={analysis.status === 'completed' ? 'default' : 'secondary'}
              className={analysis.status === 'completed' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : ''}
            >
              {analysis.status}
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {new Date(analysis.created_at).toLocaleDateString()}</span>
            </div>
            {analysis.computed_at && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Computed {new Date(analysis.computed_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Dna className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{analysis.sequence_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Sequences</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{analysis.selected_panels?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Panels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div>
                <p className="text-2xl font-bold">{analysis.min_length || '-'}</p>
                <p className="text-xs text-muted-foreground">Min Length</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-4">
              <div>
                <p className="text-2xl font-bold">{analysis.max_length || '-'}</p>
                <p className="text-xs text-muted-foreground">Max Length</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panels */}
        {analysis.selected_panels && analysis.selected_panels.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Computed Panels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.selected_panels.map((panel) => (
                  <Badge key={panel} variant="secondary" className="capitalize">
                    {panel.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Section */}
        {analysis.status === 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Download the computed feature data in CSV format.
              </p>
              <ExportDialog 
                featureData={generateMockFeatureData(mockSequences, analysis.selected_panels || [])}
                featureNames={getAllFeatureNames(analysis.selected_panels || [])}
                analysisName={analysis.name}
                citations={mockCitations}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
