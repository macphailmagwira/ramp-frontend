import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  StorybookSetUp,
  StorybookLearn,
  StorybookStep,
  StorybookStepStatus,
  ApiScanStatus,
} from '@/types';
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  PanelLeftOpen,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { StorybookSidebar } from './storybook/StorybookSidebar';
import { SetupStep } from './storybook/SetupStep';
import { LearnStep } from './storybook/LearnStep';
import { FlowsStep } from './storybook/FlowsStep';

type Phase = 'loading' | 'need-scan' | 'empty' | 'ready' | 'error';
type Busy = false | 'scan' | 'generate' | 'refresh';

export function StorybookPage({ repoId: repoIdProp }: { repoId?: string | null }) {
  const repoId = repoIdProp ?? localStorage.getItem('ramp_connected_repo_id');

  const [phase, setPhase] = useState<Phase>('loading');
  const [section, setSection] = useState<StorybookSetUp | null>(null);
  const [learn, setLearn] = useState<StorybookLearn | null>(null);
  const [bookErrors, setBookErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string>('');
  const [busy, setBusy] = useState<Busy>(false);
  const [activeId, setActiveId] = useState('set_up');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const load = useCallback(async () => {
    if (!repoId) {
      setError('No connected repository selected.');
      setPhase('error');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      // Resolve the repo name from the connected-repos list (ignore book.project).
      try {
        const conn = await api.github.getConnectedRepositories();
        const me = conn.find((r) => r.id === repoId);
        if (me) {
          // Use just the repo name, not the "owner/repo" full name.
          const name = me.name || (me.full_name ? me.full_name.split('/').pop()! : '');
          setRepoName(name || 'repository');
        }
      } catch {
        /* name is optional for layout */
      }

      const scan = (await api.scan.getStatus(repoId)) as ApiScanStatus;
      if (scan.status !== 'complete') {
        setPhase('need-scan');
        return;
      }

      const res = await api.ai.storybook.get(repoId);
      if (!res) {
        setPhase('empty');
        return;
      }
      setBookErrors(res.book.errors ?? []);
      setSection(res.book.sections.set_up);
      setLearn(res.book.sections.learn ?? null);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load storybook.');
      setPhase('error');
    }
  }, [repoId]);

  // Scan the repo, poll until complete, then load.
  const scanAndLoad = useCallback(async () => {
    if (!repoId) return;
    setBusy('scan');
    setError(null);
    try {
      await api.scan.rescan(repoId);
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const st = (await api.scan.getStatus(repoId)) as ApiScanStatus;
        if (st.status === 'complete') break;
        if (st.status === 'failed') throw new Error('Repository scan failed.');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to scan repository.');
    } finally {
      setBusy(false);
    }
  }, [repoId, load]);

  const generate = useCallback(async () => {
    if (!repoId) return;
    setBusy('generate');
    setError(null);
    try {
      const res = await api.ai.storybook.generate(repoId);
      setBookErrors(res.book.errors ?? []);
      setSection(res.book.sections.set_up);
      setLearn(res.book.sections.learn ?? null);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate storybook.');
    } finally {
      setBusy(false);
    }
  }, [repoId]);

  const refresh = useCallback(async () => {
    if (!repoId) return;
    setBusy('refresh');
    setError(null);
    try {
      const res = await api.ai.storybook.refresh(repoId);
      setBookErrors(res.book.errors ?? []);
      setSection(res.book.sections.set_up);
      setLearn(res.book.sections.learn ?? null);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh storybook.');
    } finally {
      setBusy(false);
    }
  }, [repoId]);

  useEffect(() => {
    if (repoId) load();
  }, [repoId, load]);

  const stepStatusFor = (has: boolean): StorybookStepStatus =>
    busy
      ? 'generating'
      : has
        ? 'ready'
        : error
          ? 'failed'
          : phase === 'need-scan'
            ? 'locked'
            : 'locked';

  const steps: StorybookStep[] = [
    { id: 'set_up', title: 'Setup & Run', status: stepStatusFor(!!section) },
    { id: 'flows', title: 'Flows and Features', status: stepStatusFor(!!learn) },
    { id: 'learn', title: 'API Reference', status: stepStatusFor(!!learn) },
  ];

  return (
    <SidebarProvider className="flex h-full w-full overflow-hidden bg-background">
      {sidebarOpen && (
        <StorybookSidebar
          project={{ name: repoName || 'repository' }}
          steps={steps}
          activeId={activeId}
          onStepSelect={setActiveId}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-20 shadow-sm"
          >
            <PanelLeftOpen />
          </Button>
        )}
          {busy === 'scan' && (
            <CenteredMessage
              icon={<Loader2 className="size-6 animate-spin text-ramp-blue" />}
              title="Scanning repository…"
              message="Indexing files so the storybook can be generated. This may take a minute."
            />
          )}

          {busy === 'generate' && (
            <CenteredMessage
              icon={<Loader2 className="size-6 animate-spin text-ramp-blue" />}
              title="Generating storybook…"
              message="The AI is analysing the repository. This can take up to a couple of minutes."
            />
          )}

          {!busy && phase === 'loading' && (
            <CenteredMessage
              icon={<Loader2 className="size-6 animate-spin text-ramp-blue" />}
              title="Loading storybook…"
              message="Fetching the setup guide for this repository."
            />
          )}

          {!busy && phase === 'need-scan' && (
            <CenteredCard
              icon={<BookOpen className="size-6 text-ramp-blue" />}
              title="Repository not scanned yet"
              message="Storybook needs an indexed copy of the repo. Scan it first, then the guide can be generated."
              action={
                <Button onClick={scanAndLoad}>
                  <RefreshCw className="size-4" />
                  Scan repository
                </Button>
              }
            />
          )}

          {!busy && phase === 'empty' && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="relative flex size-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-ramp-blue/15 blur-xl" />
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ramp-blue/20 to-ramp-blue/5 text-ramp-blue ring-1 ring-inset ring-ramp-blue/20">
                  <BookOpen className="size-8" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  No storybook yet
                </h1>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Generate a guided setup walkthrough for this repository.
                </p>
              </div>
              <Button onClick={generate} size="lg" className="mt-1 gap-2">
                Generate storybook
              </Button>
            </div>
          )}

          {!busy && phase === 'error' && (
            <CenteredCard
              icon={<AlertTriangle className="size-6 text-destructive" />}
              title="Something went wrong"
              message={error ?? 'Could not load the storybook.'}
              action={
                <Button onClick={load} variant="outline">
                  <RefreshCw className="size-4" />
                  Try again
                </Button>
              }
            />
          )}

          {!busy && phase === 'ready' && section && Object.keys(section).length > 0 && activeId === 'set_up' && (
            <SetupStep
              section={section}
              onRegenerate={refresh}
              regenerating={false}
              errors={bookErrors}
            />
          )}

          {!busy && phase === 'ready' && learn && Object.keys(learn).length > 0 && activeId === 'flows' && (
            <FlowsStep
              flows={learn.flows ?? []}
              repoId={repoId}
              onRegenerate={refresh}
              regenerating={false}
              errors={bookErrors}
              warnings={learn.warnings}
            />
          )}

          {!busy && phase === 'ready' && learn && Object.keys(learn).length > 0 && activeId === 'learn' && (
            <LearnStep
              section={learn}
              onRegenerate={refresh}
              regenerating={false}
              errors={bookErrors}
            />
          )}

          {busy === 'refresh' && section && Object.keys(section).length > 0 && (
            <div className="opacity-60 pointer-events-none">
              {activeId === 'learn' && learn ? (
                <LearnStep section={learn} onRegenerate={refresh} regenerating={busy === 'refresh'} errors={bookErrors} />
              ) : activeId === 'flows' && learn ? (
                <FlowsStep flows={learn.flows ?? []} repoId={repoId} onRegenerate={refresh} regenerating={busy === 'refresh'} errors={bookErrors} warnings={learn.warnings} />
              ) : (
                <SetupStep section={section} onRegenerate={refresh} regenerating={busy === 'refresh'} errors={bookErrors} />
              )}
            </div>
          )}
        </main>
      </SidebarProvider>
  );
}

function CenteredMessage({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {icon}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function CenteredCard({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl border border-ramp-blue/30 bg-ramp-blue/10">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}
