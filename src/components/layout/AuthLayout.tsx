import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Zap,
  Sun,
  Moon,
  GitBranch,
  BookOpen,
  Brain,
  Users,
} from 'lucide-react';

const FEATURES = [
  { icon: GitBranch, label: 'Architecture maps',      desc: 'Auto-generated diagrams from your actual call graph' },
  { icon: BookOpen,  label: 'Story-based onboarding', desc: 'Trace any feature end-to-end in minutes, not weeks' },
  { icon: Brain,     label: 'Flow intelligence',      desc: 'Understand execution paths across the whole repo' },
  { icon: Users,     label: 'Knowledge retention',    desc: "Senior engineers leave. Their knowledge doesn't have to" },
];

interface AuthLayoutProps {
  headline: string;
  children: ReactNode;
}

export function AuthLayout({ headline, children }: AuthLayoutProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 relative">
        {/* Subtle top gradient wash */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-64 pointer-events-none bg-gradient-to-b from-ramp-blue/[0.04] to-transparent"
        />
        <div className="w-full max-w-md mx-auto relative animate-fade-in">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-ramp-blue to-ramp-blue-light shadow-glow-sm">
                <Zap className="h-5 w-5 text-white" strokeWidth={2.25} />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">Ramp</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          {children}
        </div>
      </div>

      {/* ── Right: visual panel ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-l border-border/60">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-ramp-blue/[0.07] via-background to-background" />
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>
        {/* Glow blobs */}
        <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] bg-ramp-blue/20 dark:bg-ramp-blue/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-ramp-blue-light/15 dark:bg-ramp-blue/10 rounded-full blur-[100px]" />

        <div className="relative flex flex-col justify-center items-center p-16 w-full">
          <div className="max-w-md text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ramp-blue/10 border border-ramp-blue/20 text-ramp-blue text-[13px] font-medium mb-7">
              <Zap className="h-3.5 w-3.5" />
              Codebase intelligence platform
            </div>

            <h2 className="font-heading text-[2.5rem] leading-[1.15] font-bold mb-4 tracking-tight">
              {headline}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Onboarding is slow, architecture lives in people's heads, and docs go stale
              the moment they're written. Ramp reads your repo and makes it navigable,
              searchable, and self-documenting.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-10 stagger-in">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/70 text-left shadow-xs hover:shadow-sm hover:border-border transition-all duration-200"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-md bg-ramp-blue/10">
                      <Icon className="h-3 w-3 text-ramp-blue shrink-0" />
                    </div>
                    <div className="font-semibold text-[13px] tracking-tight">{label}</div>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-10 pt-6 border-t border-border/50">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70 font-medium mb-3">
                Converging what used to require multiple tools
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['Sourcegraph', 'GitBook', 'Swimm', 'Cursor'].map((name) => (
                  <span
                    key={name}
                    className="text-xs text-muted-foreground/60 font-medium px-2.5 py-1 rounded-md bg-muted/50 border border-border/40"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
