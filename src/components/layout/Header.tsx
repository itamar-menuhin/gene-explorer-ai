import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dna, Plus, User } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-ocean-400 to-emerald-400 rounded-lg blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-500 to-emerald-400">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xl font-display font-semibold tracking-tight">
            Seq<span className="gradient-text">Lens</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            to="/templates" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Templates
          </Link>
          <Link 
            to="/docs" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Documentation
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ocean" size="sm" asChild>
            <Link to="/analysis/new">
              <Plus className="h-4 w-4" />
              New Analysis
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
