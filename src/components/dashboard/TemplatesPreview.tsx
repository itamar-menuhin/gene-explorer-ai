import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bookmark, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Template {
  id: string;
  name: string;
  description: string;
  panelCount: number;
  usageCount: number;
  isDefault?: boolean;
}

export function TemplatesPreview() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('templates')
          .select('id, name, description, selected_panels, is_default, usage_count')
          .eq('user_id', user.id)
          .order('usage_count', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data) {
          const formattedTemplates: Template[] = data.map(t => ({
            id: t.id,
            name: t.name || 'Untitled Template',
            description: t.description || '',
            panelCount: Array.isArray(t.selected_panels) ? t.selected_panels.length : 0,
            usageCount: t.usage_count || 0,
            isDefault: t.is_default || false,
          }));
          setTemplates(formattedTemplates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [user]);

  if (loading) {
    return (
      <section className="mt-12">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!user || templates.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold">Saved Templates</h2>
          <p className="text-muted-foreground mt-1">Reuse your analysis configurations</p>
        </div>
        <Button variant="ghost" className="gap-2" asChild>
          <Link to="/templates">
            Manage templates <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <Card 
            key={template.id} 
            variant="default"
            className="opacity-0 animate-fade-in hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                {template.isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
              <CardDescription className="text-xs line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{template.panelCount} panels</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Used {template.usageCount}×</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
