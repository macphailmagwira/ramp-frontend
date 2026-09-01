import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type {
  ApiFlowGraph,
  DiscoveredFlowSummary,
  FlowStoryResponse,
  FlowStoryStep,
} from '@/types';
import {
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  FileCode,
  Search,
  X,
  FunctionSquare,
  Server,
  Database,
  ExternalLink,
  Zap,
  ArrowDown,
  ShieldAlert,
  Code2,
  Eye,
  EyeOff,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';

// ─── Extended types ────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  label: string;
  node_type: string;
  file_path?: string | null;
  file_id?: string | null;
  is_async?: boolean;
  line_start?: number | null;
  source_code?: string | null;
}

interface EnrichedStep extends FlowStoryStep {
  source_code?: string | null;
}

interface EnrichedFlow extends FlowStoryResponse {
  id: string;
  risks: string[];
  steps: EnrichedStep[];
}

interface StorybookPageProps {
  repoId?: string | null;
}

// ─── Source enrichment ─────────────────────────────────────────────────────────

function enrichStepsWithSource(
  steps: FlowStoryStep[],
  functionNodes: FlowNode[]
): EnrichedStep[] {
  const byName = new Map<string, FlowNode>();
  for (const node of functionNodes) {
    byName.set(node.label.toLowerCase(), node);
    const short = node.label.split('.').pop();
    if (short && !byName.has(short.toLowerCase())) {
      byName.set(short.toLowerCase(), node);
    }
  }
  return steps.map((step) => {
    const match =
      byName.get(step.name.toLowerCase()) ??
      byName.get(step.name.split('.').pop()?.toLowerCase() ?? '');
    return { ...step, source_code: match?.source_code ?? null };
  });
}

// ─── Step palettes ─────────────────────────────────────────────────────────────

const PALETTES: Record<string, { color: string; bg: string; border: string }> = {
  function: { color: 'text-ramp-blue', bg: 'bg-ramp-blue/10', border: 'border-ramp-blue/30' },
  method:   { color: 'text-ramp-blue', bg: 'bg-ramp-blue/10', border: 'border-ramp-blue/30' },
  service:  { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  database: { color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  external: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  class:    { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

function pal(type: string) {
  return PALETTES[type] ?? PALETTES.function;
}

function StepIcon({ type, size = 13 }: { type: string; size?: number }) {
  if (type === 'service')  return <Server size={size} />;
  if (type === 'database') return <Database size={size} />;
  if (type === 'external') return <ExternalLink size={size} />;
  if (type === 'class')    return <Code2 size={size} />;
  return <FunctionSquare size={size} />;
}

// ─── Loading overlay ───────────────────────────────────────────────────────────

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
      <Spinner className="size-6 text-ramp-blue" />
      <div className="text-sm font-medium text-muted-foreground">{message}</div>
    </div>
  );
}

// ─── Source code block ─────────────────────────────────────────────────────────

function SourceBlock({
  code, file, line,
}: {
  code: string; file?: string | null; line?: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lines = code.split('\n');
  const PREVIEW = 14;
  const showMore = lines.length > PREVIEW && !expanded;
  const display = showMore ? lines.slice(0, PREVIEW) : lines;
  const startLine = line ?? 1;

  const copy = () =>
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="size-2 rounded-full bg-[#ff5f56]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
          </div>
          {file && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {file.split('/').pop()}{line ? `:${line}` : ''}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
        >
          {copied
            ? <><Check className="size-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
            : <><Copy className="size-3" />Copy</>}
        </Button>
      </div>
      <div className="overflow-x-auto py-2.5">
        <pre className="m-0 font-mono text-xs leading-relaxed">
          {display.map((l, i) => (
            <div key={i} className="flex pr-4">
              <span className="w-10 flex-shrink-0 select-none pr-4 text-right text-[10px] text-muted-foreground">
                {startLine + i}
              </span>
              <span className="whitespace-pre text-foreground">{l}</span>
            </div>
          ))}
        </pre>
      </div>
      {showMore && (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
        >
          <ChevronDown className="size-3" />
          {lines.length - PREVIEW} more lines
        </button>
      )}
    </div>
  );
}

// ─── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  step, index, isExpanded, onToggle,
}: {
  step: EnrichedStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { color, bg, border } = pal(step.type);
  const filename = step.file?.split('/').pop();

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-colors',
        isExpanded ? cn(border, bg) : 'border-border'
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-xl p-4 text-left"
      >
        {/* Step number */}
        <div
          className={cn(
            'flex size-7 flex-shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-bold transition-colors',
            isExpanded ? cn(color, border, 'bg-background') : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[13px] font-semibold tracking-tight text-foreground">
              {step.name}
            </span>

            <Badge
              variant="outline"
              className={cn('gap-1 font-mono text-[10px] uppercase tracking-wider', color, bg, border)}
            >
              <StepIcon type={step.type} size={9} />
              {step.type}
            </Badge>

            {step.is_async && (
              <Badge
                variant="outline"
                className="gap-1 border-violet-500/30 bg-violet-500/10 font-mono text-[10px] uppercase text-violet-500"
              >
                async
              </Badge>
            )}

            {step.source_code && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-500"
              >
                src
              </Badge>
            )}
          </div>

          {step.file && (
            <div className="flex items-center gap-1">
              <FileCode className="size-3 flex-shrink-0 text-muted-foreground" />
              <code className="font-mono text-[10px] text-muted-foreground">
                {filename ?? step.file}{step.line ? `:${step.line}` : ''}
              </code>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-1 text-muted-foreground">
          {isExpanded
            ? <ChevronDown className="size-4" />
            : <ChevronRight className="size-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="animate-fade-in px-4 pb-4 pl-[54px]">
          {step.insight && (
              <div className="mb-2.5 inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-[11px] italic text-muted-foreground">
              {step.insight}
            </div>
          )}

          <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          {step.file && step.file !== filename && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5">
              <FileCode className="size-3 flex-shrink-0 text-muted-foreground" />
              <code className="font-mono text-[10px] text-muted-foreground">
                {step.file}{step.line ? `:${step.line}` : ''}
              </code>
            </div>
          )}

          {step.source_code && (
            <SourceBlock code={step.source_code} file={step.file} line={step.line} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Risks section ─────────────────────────────────────────────────────────────

function RisksSection({ risks }: { risks: string[] }) {
  if (!risks.length) return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="size-4 text-amber-500" />
        <span className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500">
          Risks &amp; gotchas
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {risks.map((risk, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Flame className="mt-0.5 size-3 flex-shrink-0 text-amber-500" />
            <p className="m-0 text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-600/90">{risk}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 text-xs">
      {copied
        ? <><Check className="size-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
        : <><Copy className="size-3" />Copy story</>}
    </Button>
  );
}

// ─── Story panel ───────────────────────────────────────────────────────────────

function StoryPanel({
  flow, onRegenerate, isRegenerating,
}: {
  flow: EnrichedFlow;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [showAllCode, setShowAllCode] = useState(false);

  const toggle = (i: number) =>
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  const allExp = expanded.size === flow.steps.length;
  const expandAll  = () => setExpanded(new Set(flow.steps.map((_, i) => i)));
  const collapseAll = () => setExpanded(new Set());

  const hasAnySource = flow.steps.some(s => s.source_code);
  const sourceCount  = flow.steps.filter(s => s.source_code).length;

  const copyText = [
    `# ${flow.name}`, '', flow.description, '', '## Steps', '',
    ...flow.steps.map((s, i) =>
      `### ${i + 1}. ${s.name}\n${s.description}` +
      (s.file ? `\nFile: ${s.file}${s.line ? `:${s.line}` : ''}` : '')
    ),
    ...(flow.risks?.length ? ['', '## Risks & Gotchas', '', ...flow.risks.map(r => `- ${r}`)] : []),
  ].join('\n');

  const typeCounts = flow.steps.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full overflow-y-auto">
      <Card className="mx-auto max-w-[780px] overflow-hidden rounded-xl border bg-card py-0 shadow-sm">
        <div className="px-8 pb-16">
          {/* Header */}
          <div className="animate-fade-in border-b border-border pb-7 pt-10">
            {flow.entry_point && (
              <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-md border border-ramp-blue/30 bg-ramp-blue/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-ramp-blue">
                <Zap className="size-2.5" />
                {flow.entry_point}
              </div>
            )}

            <h1 className="mb-2.5 text-2xl font-bold tracking-tight text-foreground">
              {flow.name}
            </h1>

            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              {flow.description}
            </p>

            {/* Meta chips */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <MetaChip>
                <BookOpen className="size-3" />
                {flow.steps.length} steps
              </MetaChip>
              {flow.steps.filter(s => s.is_async).length > 0 && (
                <MetaChip color="purple">
                  <Sparkles className="size-3" />
                  {flow.steps.filter(s => s.is_async).length} async
                </MetaChip>
              )}
              {hasAnySource && (
                <MetaChip color="green">
                  <Code2 className="size-3" />
                  {sourceCount} with source
                </MetaChip>
              )}
              {(flow.risks?.length ?? 0) > 0 && (
                <MetaChip color="amber">
                  <ShieldAlert className="size-3" />
                  {flow.risks.length} risks
                </MetaChip>
              )}
              {Object.entries(typeCounts).map(([type, count]) => (
                <MetaChip key={type}>
                  <StepIcon type={type} size={10} />
                  {count} {type}
                </MetaChip>
              ))}
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn onClick={allExp ? collapseAll : expandAll}>
                {allExp
                  ? <ChevronDown className="size-3" />
                  : <ChevronRight className="size-3" />}
                {allExp ? 'Collapse all' : 'Expand all'}
              </ActionBtn>

              {hasAnySource && (
                <ActionBtn onClick={() => setShowAllCode(v => !v)}>
                  {showAllCode
                    ? <EyeOff className="size-3" />
                    : <Eye className="size-3" />}
                  {showAllCode ? 'Hide code' : 'Show all code'}
                </ActionBtn>
              )}

              <CopyBtn text={copyText} />

              <ActionBtn onClick={onRegenerate} disabled={isRegenerating} accent>
                {isRegenerating
                  ? <Spinner className="size-3" />
                  : <RefreshCw className="size-3" />}
                Regenerate
              </ActionBtn>
            </div>
          </div>

          {/* Steps */}
          <div className="pt-6">
            {flow.steps.map((step, i) => (
              <div key={step.id ?? i}>
                <StepCard
                  step={step}
                  index={i}
                  isExpanded={expanded.has(i) || showAllCode}
                  onToggle={() => toggle(i)}
                />
                {i < flow.steps.length - 1 && (
                  <div className="flex h-6 items-center pl-[30px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="h-2.5 w-px bg-border" />
                      <ArrowDown className="size-2.5 text-muted-foreground/30" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <RisksSection risks={flow.risks ?? []} />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function MetaChip({
  children, color,
}: {
  children: React.ReactNode;
  color?: 'purple' | 'green' | 'amber';
}) {
  const themes = {
    purple: 'border-violet-500/30 bg-violet-500/10 text-violet-500',
    green:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
    amber:  'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500',
  };
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-mono text-[11px]', color ? themes[color] : 'text-muted-foreground')}
    >
      {children}
    </Badge>
  );
}

function ActionBtn({
  onClick, disabled, accent, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={accent ? 'outline' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'gap-1.5 text-xs',
        accent && 'border-ramp-blue/30 bg-ramp-blue/10 text-ramp-blue hover:bg-ramp-blue/20 hover:text-ramp-blue'
      )}
    >
      {children}
    </Button>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <Empty className="h-full">
      <EmptyMedia variant="icon">
        <BookOpen />
      </EmptyMedia>
      <EmptyDescription>{message}</EmptyDescription>
    </Empty>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function StorybookPage({ repoId }: StorybookPageProps) {
  const effectiveRepoId = repoId ?? localStorage.getItem('ramp_connected_repo_id');

  const [fullGraph, setFullGraph] = useState<ApiFlowGraph | null>(null);
  const [discoveredFlows, setDiscoveredFlows] = useState<DiscoveredFlowSummary[]>([]);
  const [enrichedFlows, setEnrichedFlows] = useState<EnrichedFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Sequential enrichment queue (one story at a time)
  const graphRef = useRef<ApiFlowGraph | null>(null);
  const flowMapRef = useRef<Map<string, DiscoveredFlowSummary>>(new Map());
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  const isWorking = isLoadingGraph || isDiscovering || isEnriching || isSearching;
  const loadingMessage =
    isLoadingGraph ? 'Fetching function graph…' :
    isDiscovering  ? 'Discovering flows…' :
    isSearching    ? `Searching for "${searchQuery}"…` :
                     'Generating story…';

  const activeFlow = enrichedFlows.find(f => f.id === selectedFlowId) ?? null;

  const attachSourceCode = useCallback((
    story: FlowStoryResponse,
    nodes: FlowNode[]
  ): Omit<EnrichedFlow, 'id'> => ({
    ...story,
    risks: (story as { risks?: string[] }).risks ?? [],
    steps: enrichStepsWithSource(story.steps, nodes),
  }), []);

  const enrichOne = useCallback(async (f: DiscoveredFlowSummary) => {
    const graph = graphRef.current;
    if (!graph) return;
    setLoadingIds(prev => new Set(prev).add(f.id));
    try {
      const story: FlowStoryResponse = await api.ai.enrichFlow({
        repo_id: effectiveRepoId!,
        flow_name: f.name,
        function_nodes: graph.function_nodes,
        function_edges: graph.function_edges,
      });
      const enriched = { id: f.id, ...attachSourceCode(story, graph.function_nodes as FlowNode[]) };
      setEnrichedFlows(prev =>
        prev.some(e => e.id === enriched.id) ? prev : [...prev, enriched]
      );
    } catch {
      /* ignore individual failures */
    } finally {
      setLoadingIds(prev => {
        const n = new Set(prev);
        n.delete(f.id);
        return n;
      });
    }
  }, [effectiveRepoId, attachSourceCode]);

  // Process the queue one story at a time; each becomes available as it finishes
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const id = queueRef.current.shift()!;
      const f = flowMapRef.current.get(id);
      if (f) await enrichOne(f);
    }
    processingRef.current = false;
  }, [enrichOne]);

  const initFlows = useCallback(async () => {
    if (!effectiveRepoId) return;
    setError(null);
    setEnrichedFlows([]);
    setLoadingIds(new Set());
    queueRef.current = [];
    processingRef.current = false;
    setIsLoadingGraph(true);
    try {
      const graph: ApiFlowGraph = await api.flow.getFlow(effectiveRepoId);
      setFullGraph(graph);
      graphRef.current = graph;
      setIsLoadingGraph(false);

      if (!graph.function_nodes.length) {
        setError('No functions found. Try scanning the repository first.');
        return;
      }

      setIsDiscovering(true);
      const discovered = await api.ai.discoverFlows({
        repo_id: effectiveRepoId,
        function_nodes: graph.function_nodes,
        function_edges: graph.function_edges,
      });
      setDiscoveredFlows(discovered.flows);
      setIsDiscovering(false);

      if (discovered.flows.length === 0) return;

      flowMapRef.current = new Map(discovered.flows.map(f => [f.id, f]));
      const [first, ...rest] = discovered.flows;

      // Load + activate the first story so the user sees content immediately
      setSelectedFlowId(first.id);
      await enrichOne(first);

      // Queue the rest to be prepared one by one in the background
      queueRef.current = rest.map(f => f.id);
      processQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoadingGraph(false);
      setIsDiscovering(false);
    }
  }, [effectiveRepoId, enrichOne, processQueue]);

  useEffect(() => {
    if (effectiveRepoId) initFlows();
  }, [effectiveRepoId]); // eslint-disable-line

  const selectFlow = useCallback(async (summary: DiscoveredFlowSummary) => {
    setError(null);
    setSelectedFlowId(summary.id);
    // Already loaded — just show it. Otherwise prioritise it in the queue.
    const alreadyLoaded = enrichedFlows.some(f => f.id === summary.id);
    if (!alreadyLoaded) {
      queueRef.current = [summary.id, ...queueRef.current.filter(id => id !== summary.id)];
      processQueue();
    }
  }, [enrichedFlows, processQueue]);

  const regenerate = useCallback(async () => {
    if (!activeFlow || !fullGraph || !effectiveRepoId) return;
    const summary = discoveredFlows.find(f => f.id === activeFlow.id);
    if (!summary) return;

    setIsRegenerating(true);
    setError(null);
    try {
      const story: FlowStoryResponse = await api.ai.enrichFlow({
        repo_id: effectiveRepoId,
        flow_name: summary.name,
        function_nodes: fullGraph.function_nodes,
        function_edges: fullGraph.function_edges,
      });
      setEnrichedFlows(prev =>
        prev.map(f => f.id === activeFlow.id
          ? { id: f.id, ...attachSourceCode(story, fullGraph.function_nodes as FlowNode[]) }
          : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  }, [activeFlow, fullGraph, effectiveRepoId, discoveredFlows, attachSourceCode]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !fullGraph || !effectiveRepoId) return;
    setIsSearching(true);
    setError(null);
    try {
      const story: FlowStoryResponse = await api.ai.enrichFlow({
        repo_id: effectiveRepoId,
        flow_name: searchQuery.trim(),
        function_nodes: fullGraph.function_nodes,
        function_edges: fullGraph.function_edges,
      });

      if (!story.steps.length) {
        setError(`Could not find a "${searchQuery}" flow in this codebase.`);
        return;
      }

      const id = `search-${searchQuery.trim().toLowerCase().replace(/\s+/g, '-')}`;
      const enriched: EnrichedFlow = {
        id, ...attachSourceCode(story, fullGraph.function_nodes as FlowNode[]),
      };
      setDiscoveredFlows(prev =>
        prev.find(f => f.id === id) ? prev
          : [...prev, { id, name: story.name, description: story.description, function_count: story.steps.length }]
      );
      setEnrichedFlows(prev => [...prev.filter(f => f.id !== id), enriched]);
      setSelectedFlowId(id);
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fullGraph, effectiveRepoId, attachSourceCode]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full overflow-hidden bg-background font-sans">
      {/* ── Sidebar ── */}
      <aside className="flex w-[300px] flex-shrink-0 flex-col border-r border-border bg-card">

        {/* Sidebar header */}
        <div className="border-b border-border px-5 pb-4 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-ramp-blue/30 bg-ramp-blue/10">
              <BookOpen className="size-4 text-ramp-blue" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none text-foreground">Storybook</div>
              <div className="mt-1.5 text-xs text-muted-foreground">Generate flow stories</div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !isWorking) handleSearch(); }}
                placeholder="Find a flow…"
                disabled={isWorking || !fullGraph}
                className="h-9 rounded-lg bg-background pl-9 text-sm"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSearch}
              disabled={isWorking || !searchQuery.trim() || !fullGraph}
              className="h-9 w-9 shrink-0 bg-ramp-blue shadow-glow-sm hover:bg-ramp-blue-dark"
            >
              {isSearching
                ? <Spinner className="size-4" />
                : <Search className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Flow list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1.5 p-3">
            {(isLoadingGraph || isDiscovering) && (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {!isLoadingGraph && !isDiscovering && discoveredFlows.length === 0 && !error && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No flows discovered yet
              </div>
            )}

            {discoveredFlows.length > 0 && (
              <div className="px-1 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Flows
              </div>
            )}

            {discoveredFlows.map(summary => {
              const isActive      = selectedFlowId === summary.id;
              const isLoadingThis = loadingIds.has(summary.id);
              const isDone        = enrichedFlows.some(f => f.id === summary.id);

              return (
                <button
                  key={summary.id}
                onClick={() => selectFlow(summary)}
                disabled={isLoadingThis}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-all',
                  isActive
                    ? 'border-ramp-blue/40 bg-ramp-blue/10'
                    : 'border-transparent hover:border-border hover:bg-muted',
                  isLoadingThis && 'opacity-60'
                )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {isLoadingThis
                      ? <Spinner className="size-3 text-ramp-blue" />
                      : <span
                          className={cn(
                            'size-1.5 flex-shrink-0 rounded-full',
                            isActive ? 'bg-ramp-blue' : isDone ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                          )}
                        />
                    }
                    <span className="truncate text-sm font-medium text-foreground">
                      {summary.name}
                    </span>
                  </div>
                  <p className="mb-1.5 line-clamp-2 pl-3.5 text-xs leading-snug text-muted-foreground">
                    {summary.description}
                  </p>
                  <div className="pl-3.5 text-[10px] text-muted-foreground/80">
                    {summary.function_count} functions
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Main content ── */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {isWorking && !activeFlow && <LoadingOverlay message={loadingMessage} />}

        {/* Error banner */}
        {error && !isWorking && (
          <div className="mx-auto mt-4 flex w-[calc(100%-64px)] max-w-[748px] items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            <AlertCircle className="size-3 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="rounded p-0 text-destructive">
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Empty */}
        {!isWorking && !activeFlow && !error && (
          <EmptyState
            message="Select a flow from the sidebar to read its execution story"
          />
        )}

        {/* Regenerating toast */}
        {isRegenerating && (
          <div className="absolute right-3.5 top-3.5 z-20 flex items-center gap-1.5 rounded-lg border border-border bg-popover px-3 py-1.5 text-xs font-medium text-ramp-blue shadow-md backdrop-blur">
            <Spinner className="size-3" />
            Regenerating…
          </div>
        )}

        {/* Story panel */}
        {!isWorking && activeFlow && (
          <div className="flex-1 overflow-y-auto">
            <StoryPanel
              key={activeFlow.id}
              flow={activeFlow}
              onRegenerate={regenerate}
              isRegenerating={isRegenerating}
            />
          </div>
        )}
      </main>
    </div>
  );
}
