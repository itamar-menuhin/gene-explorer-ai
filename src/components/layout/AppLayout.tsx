import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function AppLayout({ children, showHeader = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background dna-pattern">
      {showHeader && <Header />}
      <main>{children}</main>
    </div>
  );
}
