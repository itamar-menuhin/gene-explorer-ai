import { Card, CardContent } from "@/components/ui/card";
import { Dna, FileText, Zap, TrendingUp } from "lucide-react";

const stats = [
  {
    label: "Total Analyses",
    value: "47",
    change: "+3 this week",
    icon: FileText,
    color: "ocean",
  },
  {
    label: "Sequences Analyzed",
    value: "12.4k",
    change: "+1.2k this month",
    icon: Dna,
    color: "emerald",
  },
  {
    label: "Panels Computed",
    value: "186",
    change: "12 unique types",
    icon: Zap,
    color: "ocean",
  },
  {
    label: "Avg. Runtime",
    value: "2.4m",
    change: "Per analysis",
    icon: TrendingUp,
    color: "emerald",
  },
];

export function StatsOverview() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label}
          variant="glass"
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-display font-semibold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`p-2 rounded-lg ${
                stat.color === 'ocean' 
                  ? 'bg-ocean-100 text-ocean-600' 
                  : 'bg-emerald-100 text-emerald-600'
              }`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
