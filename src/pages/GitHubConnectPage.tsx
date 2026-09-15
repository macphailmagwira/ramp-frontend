import { useState } from 'react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Github, ArrowLeft, LogOut, ShieldCheck, GitBranch, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface GitHubConnectPageProps {
  user: User | null;
  onLogout: () => void;
}

export function GitHubConnectPage({ user, onLogout }: GitHubConnectPageProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = api.github.getLoginUrl();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-border/70 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3" />
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden sm:inline text-sm text-muted-foreground">{user.email}</span>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-ramp-blue/10 border border-ramp-blue/20">
            <Github className="h-8 w-8 text-ramp-blue" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Connect your GitHub account
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Ramp analyzes your repositories to generate architecture diagrams,
            flow stories, and documentation. Link GitHub to get started.
          </p>

          <Button
            className="w-full gap-2 bg-ramp-blue hover:bg-ramp-blue-dark text-white font-medium rounded-lg shadow-sm hover:shadow-glow-sm transition-all duration-200 h-11"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            <Github className="h-4 w-4" />
            {isConnecting ? 'Redirecting to GitHub…' : 'Connect GitHub'}
          </Button>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3">
              <GitBranch className="h-4 w-4 text-ramp-blue" />
              <p className="text-xs text-muted-foreground">
                Browse and select the repositories you want to document.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3">
              <Sparkles className="h-4 w-4 text-ramp-blue" />
              <p className="text-xs text-muted-foreground">
                Auto-generate architecture graphs and flow stories.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3">
              <ShieldCheck className="h-4 w-4 text-ramp-blue" />
              <p className="text-xs text-muted-foreground">
                Read-only access via GitHub OAuth. You stay in control.
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/70">
            We request <code className="font-mono">repo</code>,{' '}
            <code className="font-mono">read:user</code> and{' '}
            <code className="font-mono">user:email</code> scopes.
          </p>

          <button
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Sign in with a different account
          </button>
        </div>
      </main>
    </div>
  );
}
