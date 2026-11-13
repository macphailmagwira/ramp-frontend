import type { AgentItem } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { GitPullRequest, GitCommit, Bot, ArrowRight } from 'lucide-react';

interface AgentsPageProps {
  agents: AgentItem[];
  activeAgentId?: string;
  onBrowse?: () => void;
}

export function AgentsPage({ agents, activeAgentId, onBrowse }: AgentsPageProps) {
  const active = agents.find(a => a.id === activeAgentId);

  if (active) {
    const Icon = active.icon ?? (active.id === 'pr' ? GitPullRequest : GitCommit);
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.05]">
            <Icon className="h-5 w-5 text-foreground/60" />
          </div>
          <h1 className="text-xl font-semibold">{active.label}</h1>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {active.description}
        </p>
        <div className="mt-6 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-foreground/70">
          This agent is enabled for your repository. Toggle it off anytime from
          the agent catalog, or browse other agents to add more capabilities.
        </div>
        {onBrowse && (
          <button
            onClick={onBrowse}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Browse all agents
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.05]">
          <Bot className="h-5 w-5 text-foreground/60" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Agents enabled for this repository.
          </p>
        </div>
      </div>

      {agents.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {agents.map(agent => {
            const Icon = agent.icon ?? (agent.id === 'pr' ? GitPullRequest : GitCommit);
            return (
              <div
                key={agent.id}
                className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
                  <Icon className="h-4 w-4 text-foreground/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{agent.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No agents are enabled yet. Browse the catalog and activate the ones
            that fit your workflow.
          </p>
          {onBrowse && (
            <Button onClick={onBrowse} className="mt-4">
              Browse agents
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
