import { useState } from 'react';
import type { AgentItem } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GitPullRequest, GitCommit, Bot } from 'lucide-react';

interface AgentsPageProps {
  agents: AgentItem[];
  activeAgentId?: string;
}

export function AgentsPage({ agents, activeAgentId }: AgentsPageProps) {
  const active = agents.find(a => a.id === activeAgentId);

  if (active) {
    const Icon = active.id === 'pr' ? GitPullRequest : GitCommit;
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
          This agent is ready to use. Configure triggers and review its activity
          from here.
        </div>
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
            Example agents you can enable for your repository.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {agents.map(agent => {
          const Icon = agent.id === 'pr' ? GitPullRequest : GitCommit;
          return (
            <div
              key={agent.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-4'
              )}
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
    </div>
  );
}
