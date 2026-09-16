import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Github, ArrowLeft, LogOut, ShieldCheck, GitBranch, Sparkles, Sun, Moon } from 'lucide-react';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

interface GitHubConnectPageProps {
  user: User | null;
  onLogout: () => void;
}

export function GitHubConnectPage({ user, onLogout }: GitHubConnectPageProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() =>
      setIsDark(root.classList.contains('dark'))
    );
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center animate-fade-in">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Github className="h-8 w-8 text-foreground/80" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Connect your GitHub account</h1>
          <p className="text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
            Ramp analyzes your repositories to generate architecture diagrams, flow
            stories, and documentation. Link GitHub to get started.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left">
            <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4">
              <GitBranch className="h-4 w-4 text-foreground/70" />
              <p className="text-xs text-muted-foreground">
                Browse and select the repositories you want to document.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4">
              <Sparkles className="h-4 w-4 text-foreground/70" />
              <p className="text-xs text-muted-foreground">
                Auto-generate architecture graphs and flow stories.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4">
              <ShieldCheck className="h-4 w-4 text-foreground/70" />
              <p className="text-xs text-muted-foreground">
                Read-only access via GitHub OAuth. You stay in control.
              </p>
            </div>
          </div>

          <Button
            className="w-full h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            <Github className="h-4 w-4" />
            {isConnecting ? 'Redirecting to GitHub…' : 'Connect GitHub'}
          </Button>

          <p className="mt-6 text-xs text-muted-foreground">
            We request{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">repo</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">read:user</code>{' '}
            and{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">user:email</code>{' '}
            scopes.
          </p>

          <button
            onClick={onLogout}
            className="mt-8 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Sign in with a different account
          </button>
        </div>
      </main>
    </div>
  );
}
