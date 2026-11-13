import type { AgentCatalogItem } from '@/data/agents';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentsCatalogPageProps {
  catalog: AgentCatalogItem[];
  enabledIds: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onViewAgent?: (id: string) => void;
}

export function AgentsCatalogPage({
  catalog,
  enabledIds,
  onToggle,
  onBack,
  onViewAgent,
}: AgentsCatalogPageProps) {
  const enabledCount = catalog.filter(a => enabledIds.has(a.id)).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </button>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Available agents</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ramp ships with a library of specialized agents. Activate the ones you
          want, and they&apos;ll start working for this repository. You can toggle
          them on or off at any time.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{enabledCount}</span>
        <span>of {catalog.length} agents enabled</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {catalog.map(agent => {
          const Icon = agent.icon;
          const enabled = enabledIds.has(agent.id);
          return (
            <div
              key={agent.id}
              className={cn(
                'group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all',
                enabled
                  ? 'border-foreground/15 ring-1 ring-foreground/[0.06]'
                  : 'border-border/70 hover:border-foreground/15'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      agent.accent
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold leading-tight">{agent.label}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{agent.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium',
                      enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-foreground/[0.05] text-foreground/50'
                    )}
                  >
                    {enabled ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => onToggle(agent.id)}
                    aria-label={`Toggle ${agent.label}`}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                {agent.description}
              </p>

              {/* How it works */}
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                  How it works
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                  {agent.howItWorks}
                </p>
              </div>

              {/* Benefits */}
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                  Benefits
                </p>
                <ul className="mt-2 space-y-1.5">
                  {agent.benefits.map(benefit => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-foreground/75">
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                          agent.accent
                        )}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Triggers */}
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                  Triggers
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {agent.triggers.map(trigger => (
                    <Badge
                      key={trigger}
                      variant="secondary"
                      className="rounded-md bg-foreground/[0.04] text-[11px] font-normal text-foreground/60"
                    >
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Token usage footer */}
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" />
                  <span className="font-mono">{agent.tokenUsage.perRun}</span>
                  <span className="text-foreground/30">/ run</span>
                  <span className="mx-1 text-foreground/20">·</span>
                  <span className="font-mono">{agent.tokenUsage.monthly}</span>
                  <span className="text-foreground/30">/ mo</span>
                </div>
                {onViewAgent && (
                  <Button
                    variant={enabled ? 'ghost' : 'default'}
                    size="sm"
                    onClick={() => onViewAgent(agent.id)}
                  >
                    {enabled ? 'View' : 'Activate'}
                  </Button>
                )}
              </div>

              <p className="mt-2 text-[11px] text-foreground/40">{agent.tokenUsage.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
