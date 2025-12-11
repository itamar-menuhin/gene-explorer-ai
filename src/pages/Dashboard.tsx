import { AppLayout } from "@/components/layout/AppLayout";
import { QuickStartCard } from "@/components/dashboard/QuickStartCard";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import { TemplatesPreview } from "@/components/dashboard/TemplatesPreview";
import { StatsOverview } from "@/components/dashboard/StatsOverview";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Welcome back, <span className="gradient-text">Researcher</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore sequence features, visualize patterns, and export analysis-ready data.
          </p>
        </div>

        <StatsOverview />
        <QuickStartCard />
        <RecentAnalyses />
        <TemplatesPreview />
      </div>
    </AppLayout>
  );
}
