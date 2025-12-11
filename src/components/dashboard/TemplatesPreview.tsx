import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bookmark, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Template {
  id: string;
  name: string;
  description: string;
  panelCount: number;
  usageCount: number;
  isDefault?: boolean;
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Standard Codon Analysis",
    description: "Complete codon usage bias and adaptation index calculations",
    panelCount: 3,
    usageCount: 24,
    isDefault: true,
  },
  {
    id: "2",
    name: "mRNA Structure Suite",
    description: "Secondary structure predictions and folding energy profiles",
    panelCount: 4,
    usageCount: 12,
  },
  {
    id: "3",
    name: "Expression Correlates",
    description: "Features known to correlate with gene expression levels",
    panelCount: 5,
    usageCount: 8,
  },
];

export function TemplatesPreview() {
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
        {mockTemplates.map((template, index) => (
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
