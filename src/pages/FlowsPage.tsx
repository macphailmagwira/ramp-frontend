import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ApiFlowGraph, ApiFlowNode, ApiFlowEdge, DiscoveredFlowSummary, FlowStoryResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Workflow, ZoomIn, ZoomOut, Maximize2, Search,
  Sparkles, X, ChevronLeft, ChevronRight, BookOpen,
  FunctionSquare, Server, Database, ExternalLink, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedFlow extends FlowStoryResponse {
  id: string;
}

interface NodeWithPos extends ApiFlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlowsPageProps {
  repoId?: string | null;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const PALETTES = {
  function: { bg: 'rgba(59,130,246,0.12)', bgL: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.6)', borderL: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.35)', text: '#93c5fd', textL: '#1d4ed8', dot: '#3b82f6' },
  method:   { bg: 'rgba(59,130,246,0.12)', bgL: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.6)', borderL: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.35)', text: '#93c5fd', textL: '#1d4ed8', dot: '#3b82f6' },
  service:  { bg: 'rgba(16,185,129,0.12)', bgL: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.6)', borderL: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.35)', text: '#6ee7b7', textL: '#065f46', dot: '#10b981' },
  database: { bg: 'rgba(168,85,247,0.12)', bgL: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.6)', borderL: 'rgba(168,85,247,0.35)', glow: 'rgba(168,85,247,0.35)', text: '#d8b4fe', textL: '#6b21a8', dot: '#a855f7' },
  external: { bg: 'rgba(245,158,11,0.12)', bgL: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.6)', borderL: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.35)', text: '#fcd34d', textL: '#92400e', dot: '#f59e0b' },
  class:    { bg: 'rgba(236,72,153,0.12)', bgL: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.6)', borderL: 'rgba(236,72,153,0.35)', glow: 'rgba(236,72,153,0.35)', text: '#f9a8d4', textL: '#9d174d', dot: '#ec4899' },
  file:     { bg: 'rgba(20,184,166,0.12)', bgL: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.6)', borderL: 'rgba(20,184,166,0.35)', glow: 'rgba(20,184,166,0.35)', text: '#99f6e4', textL: '#134e4a', dot: '#14b8a6' },
};

type PaletteKey = keyof typeof PALETTES;
function getPalette(t: string) { return PALETTES[(t as PaletteKey)] ?? PALETTES.function; }

const LEGEND_TYPES = [
  { type: 'function', label: 'Function' },
  { type: 'method',   label: 'Method' },
  { type: 'service',  label: 'Service' },
  { type: 'database', label: 'Database' },
  { type: 'external', label: 'External' },
  { type: 'class',    label: 'Class' },
];

const LOADING_PHRASES = [
  'Reading the call graph…',
  'Identifying logical flows…',
  'Tracing execution paths…',
  'Building the narrative…',
  'Almost there…',
];

// ─── Filter helpers ───────────────────────────────────────────────────────────

function filterGraphToFlow(
  flow: EnrichedFlow,
  allNodes: ApiFlowNode[],
  allEdges: ApiFlowEdge[],
): { nodes: ApiFlowNode[]; edges: ApiFlowEdge[] } {
  const names = new Set(flow.steps.map(s => s.name.toLowerCase()));
  const nodes = allNodes.filter(n => names.has(n.label.toLowerCase()));
  const ids = new Set(nodes.map(n => n.id));
  const edges = allEdges.filter(e => ids.has(e.source) && ids.has(e.target));
  return { nodes, edges };
}

// ─── Graph layout ─────────────────────────────────────────────────────────────

function layoutNodes(nodes: ApiFlowNode[], edges: ApiFlowEdge[]): NodeWithPos[] {
  if (!nodes.length) return [];
  const W = 200, H = 64, COL_W = 280, ROW_H = 100;

  const inDegree: Record<string, number> = {};
  nodes.forEach(n => { inDegree[n.id] = 0; });
  edges.forEach(e => { if (inDegree[e.target] !== undefined) inDegree[e.target]++; });

  const layers: string[][] = [];
  const assigned = new Set<string>();
  let current = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  if (!current.length) current = [nodes[0]?.id].filter(Boolean);

  while (current.length) {
    layers.push([...new Set(current)]);
    current.forEach(id => assigned.add(id));
    const next: string[] = [];
    edges.forEach(e => { if (current.includes(e.source) && !assigned.has(e.target)) next.push(e.target); });
    current = [...new Set(next)];
  }
  nodes.forEach(n => { if (!assigned.has(n.id)) layers.push([n.id]); });

  const pos: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, col) => {
    const startY = 320 - (layer.length * ROW_H) / 2;
    layer.forEach((id, row) => { pos[id] = { x: 80 + col * COL_W, y: startY + row * ROW_H }; });
  });

  return nodes.map(n => ({ ...n, x: pos[n.id]?.x ?? 80, y: pos[n.id]?.y ?? 80, width: W, height: H }));
}

function anchor(node: NodeWithPos, fromX: number, fromY: number) {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const dx = fromX - cx, dy = fromY - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const hw = node.width / 2 - 8, hh = node.height / 2 - 6;
  const t = Math.abs(dx) * hh > Math.abs(dy) * hw ? hw / Math.abs(dx) : hh / Math.abs(dy);
  return { x: cx + dx * t, y: cy + dy * t };
}

function curve(sx: number, sy: number, tx: number, ty: number) {
  const dx = tx - sx;
  return `M ${sx} ${sy} C ${sx + dx * 0.45} ${sy} ${tx - dx * 0.45} ${ty} ${tx} ${ty}`;
}

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function stepIcon(type: string) {
  const s = { width: 12, height: 12 };
  if (type === 'service') return <Server style={s} />;
  if (type === 'database') return <Database style={s} />;
  if (type === 'external') return <ExternalLink style={s} />;
  return <FunctionSquare style={s} />;
}

// ─── Loading overlay ──────────────────────────────────────────────────────────

function LoadingOverlay({ message }: { message: string }) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx(i => (i + 1) % LOADING_PHRASES.length); setVis(true); }, 400);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative mb-7 h-[72px] w-[72px]">
        {[0, 8, 16].map((inset, i) => (
          <div key={i} style={{ inset }} className="absolute animate-ping rounded-full border border-ramp-blue/30" />
        ))}
        <div className="absolute inset-[22px] flex items-center justify-center rounded-full border border-ramp-blue/60 bg-ramp-blue/15">
          <Sparkles className="h-3.5 w-3.5 text-ramp-blue" />
        </div>
      </div>
      <div className="mb-2.5 text-base font-bold text-foreground">{message}</div>
      <div style={{ opacity: vis ? 1 : 0 }} className="text-xs text-muted-foreground transition-opacity duration-[400ms]">{LOADING_PHRASES[idx]}</div>
      <div className="mt-7 h-0.5 w-[180px] overflow-hidden rounded-full bg-border/10">
        <div className="h-full w-full animate-pulse-glow rounded-full bg-gradient-to-r from-ramp-blue to-[#a855f7]" />
      </div>
    </div>
  );
}

// ─── Story card ───────────────────────────────────────────────────────────────

function StoryCard({ flow, stepIdx, onPrev, onNext, onExit, isDark }: {
  flow: EnrichedFlow; stepIdx: number;
  onPrev: () => void; onNext: () => void; onExit: () => void; isDark: boolean;
}) {
  const step = flow.steps[stepIdx];
  const total = flow.steps.length;
  const p = getPalette(step.type);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onNext, onPrev, onExit]);

  return (
    <div className="absolute bottom-6 left-1/2 z-20 w-[480px] max-w-[calc(100vw-48px)] -translate-x-1/2 animate-fade-in overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-ramp-blue/30 bg-ramp-blue/15">
            <BookOpen className="h-2.5 w-2.5 text-ramp-blue" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {flow.name} · {stepIdx + 1} / {total}
          </span>
        </div>
        <button onClick={onExit} className="flex items-center gap-1 rounded text-[11px] text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-3 w-3" /> Exit
        </button>
      </div>

      <div className="max-h-[220px] space-y-2 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            style={{ background: isDark ? p.bg : p.bgL, borderColor: isDark ? p.border : p.borderL, color: isDark ? p.text : p.textL }}
            className="gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
          >
            {stepIcon(step.type)}
            {step.type}
          </Badge>
          {step.is_async && (
            <span className="rounded-full border border-[#a855f7]/30 bg-[#a855f7]/15 px-2 py-0.5 text-[10px] font-bold text-[#d8b4fe]">async</span>
          )}
          {step.insight && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] italic text-muted-foreground">{step.insight}</span>
          )}
        </div>
        <div className="text-[15px] font-bold leading-[1.35] tracking-[-0.02em] text-foreground">{step.name}</div>
        <div className="text-[13px] leading-[1.65] text-muted-foreground">{step.description}</div>
        {step.file && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5">
            <span className="text-[10px]">📄</span>
            <code className="font-mono text-[11px]" style={{ color: p.dot }}>{step.file}{step.line ? `:${step.line}` : ''}</code>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
        <div className="flex max-w-[200px] flex-wrap items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ background: i === stepIdx ? p.dot : undefined }} className={cn(
              'h-1.5 rounded-md transition-all duration-300',
              i === stepIdx ? 'w-3.5' : 'w-1.5 bg-border',
            )} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onPrev} disabled={stepIdx === 0} className="gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <Button size="sm" onClick={stepIdx === total - 1 ? onExit : onNext} style={{ background: stepIdx === total - 1 ? 'rgba(16,185,129,0.9)' : p.dot }} className="gap-1 border-none text-white">
            {stepIdx === total - 1 ? 'Done ✓' : <><span>Next</span><ChevronRight className="h-3.5 w-3.5" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FlowsPage({ repoId }: FlowsPageProps) {
  const isDark = useIsDark();
  const effectiveRepoId = repoId ?? localStorage.getItem('ramp_connected_repo_id');

  const [fullGraph, setFullGraph] = useState<ApiFlowGraph | null>(null);
  const [discoveredFlows, setDiscoveredFlows] = useState<DiscoveredFlowSummary[]>([]);
  const [enrichedFlows, setEnrichedFlows] = useState<EnrichedFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeFlow, setActiveFlow] = useState<EnrichedFlow | null>(null);
  const [layouted, setLayouted] = useState<NodeWithPos[]>([]);
  const [activeEdges, setActiveEdges] = useState<ApiFlowEdge[]>([]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inTourMode, setInTourMode] = useState(false);
  const [tourStepIdx, setTourStepIdx] = useState(0);

  const isWorking = isLoadingGraph || isDiscovering || isEnriching || isSearching;
  const loadingMessage = isLoadingGraph ? 'Fetching function graph…'
    : isDiscovering ? 'Discovering flows…'
    : isSearching ? `Searching for "${searchQuery}"…`
    : 'Generating narrative…';

  // ── Activate a flow (set graph + layout to only its nodes) ─────────────────

  const activateFlow = useCallback((flow: EnrichedFlow, graph: ApiFlowGraph) => {
    const { nodes, edges } = filterGraphToFlow(flow, graph.function_nodes, graph.function_edges);
    setActiveFlow(flow);
    setLayouted(layoutNodes(nodes, edges));
    setActiveEdges(edges);
    setInTourMode(false);
    setSelectedNode(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  }, []);

  // ── Init: fetch full graph + discover flows ────────────────────────────────

  const initFlows = useCallback(async () => {
    if (!effectiveRepoId) return;
    setError(null);
    setIsLoadingGraph(true);

    try {
      const graph = await api.flow.getFlow(effectiveRepoId);
      setFullGraph(graph);
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

      // Auto-enrich + activate first flow
      if (discovered.flows.length > 0) {
        const first = discovered.flows[0];
        setSelectedFlowId(first.id);
        setIsDiscovering(false);
        setIsEnriching(true);

        const story = await api.ai.enrichFlow({
          repo_id: effectiveRepoId,
          flow_name: first.name,
          function_nodes: graph.function_nodes,
          function_edges: graph.function_edges,
        });

        const enriched: EnrichedFlow = { id: first.id, ...story };
        setEnrichedFlows([enriched]);
        activateFlow(enriched, graph);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoadingGraph(false);
      setIsDiscovering(false);
      setIsEnriching(false);
    }
  }, [effectiveRepoId, activateFlow]);

  useEffect(() => {
    if (effectiveRepoId) initFlows();
  }, [effectiveRepoId]); // eslint-disable-line

  // ── Select a flow from sidebar ────────────────────────────────────────────

  const selectFlow = useCallback(async (summary: DiscoveredFlowSummary) => {
    if (!fullGraph || !effectiveRepoId) return;
    setSelectedFlowId(summary.id);
    setError(null);

    // Already enriched — just re-activate with filtered graph
    const existing = enrichedFlows.find(f => f.id === summary.id);
    if (existing) {
      activateFlow(existing, fullGraph);
      return;
    }

    setIsEnriching(true);
    try {
      const story = await api.ai.enrichFlow({
        repo_id: effectiveRepoId,
        flow_name: summary.name,
        function_nodes: fullGraph.function_nodes,
        function_edges: fullGraph.function_edges,
      });

      const enriched: EnrichedFlow = { id: summary.id, ...story };
      setEnrichedFlows(prev => [...prev, enriched]);
      activateFlow(enriched, fullGraph);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow.');
    } finally {
      setIsEnriching(false);
    }
  }, [fullGraph, effectiveRepoId, enrichedFlows, activateFlow]);

  // ── Search — fresh AI call against full graph ─────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !fullGraph || !effectiveRepoId) return;

    setIsSearching(true);
    setError(null);

    try {
      const story = await api.ai.enrichFlow({
        repo_id: effectiveRepoId,
        flow_name: searchQuery.trim(),
        function_nodes: fullGraph.function_nodes,
        function_edges: fullGraph.function_edges,
      });

      if (story.name === 'Not Found' || !story.steps.length) {
        setError(`Could not find a "${searchQuery}" flow in this codebase.`);
        return;
      }

      const id = `search-${searchQuery.trim().toLowerCase().replace(/\s+/g, '-')}`;
      const enriched: EnrichedFlow = { id, ...story };

      // Add to sidebar if not already there
      setDiscoveredFlows(prev =>
        prev.find(f => f.id === id)
          ? prev
          : [...prev, { id, name: story.name, description: story.description, function_count: story.steps.length }]
      );
      setEnrichedFlows(prev => [...prev.filter(f => f.id !== id), enriched]);
      setSelectedFlowId(id);
      activateFlow(enriched, fullGraph);
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fullGraph, effectiveRepoId, activateFlow]);

  // ── Canvas ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const p = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
      positionRef.current = p;
      setPosition({ ...p });
    };
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(3, Math.max(0.15, s - e.deltaY * 0.0008)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const connectedIds = useCallback((nodeId: string) => {
    const ids = new Set<string>();
    activeEdges.forEach(e => {
      if (e.source === nodeId) ids.add(e.target);
      if (e.target === nodeId) ids.add(e.source);
    });
    return ids;
  }, [activeEdges]);

  const focusId = hoveredNode || selectedNode;
  const focusConnected = focusId ? connectedIds(focusId) : new Set<string>();
  const tourActiveNode = (inTourMode && activeFlow)
    ? layouted.find(n => n.label === activeFlow.steps[tourStepIdx]?.name)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-background">

      {/* Sidebar */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card">

        {/* Header */}
        <div className="border-b border-border px-5 pb-4 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-ramp-blue/30 bg-ramp-blue/10">
              <Workflow className="h-4 w-4 text-ramp-blue" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none text-foreground">Flows</div>
              <div className="mt-1.5 text-xs text-muted-foreground">AI-discovered execution flows</div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isWorking && handleSearch()}
                placeholder="Ask about a flow…"
                disabled={isWorking || !fullGraph}
                className="h-9 rounded-lg bg-background pl-9 text-sm"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSearch}
              disabled={isWorking || !searchQuery.trim() || !fullGraph}
              className="h-9 w-9 shrink-0 bg-ramp-blue text-white hover:bg-ramp-blue-dark"
            >
              {isSearching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Flow list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1.5 p-3">
            {(isLoadingGraph || isDiscovering) && (
              <div className="flex flex-col items-center gap-2 p-8 text-sm text-muted-foreground">
                <Spinner className="h-5 w-5" />
                {isLoadingGraph ? 'Loading graph…' : 'Discovering flows…'}
              </div>
            )}

            {!isLoadingGraph && !isDiscovering && discoveredFlows.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No flows discovered yet
              </div>
            )}

            {discoveredFlows.map(summary => {
              const isActive = selectedFlowId === summary.id;
              const isLoadingThis = isEnriching && selectedFlowId === summary.id;
              return (
                <button
                  key={summary.id}
                  onClick={() => selectFlow(summary)}
                  disabled={isEnriching || isLoadingThis}
                  className={cn(
                    'group w-full rounded-lg border px-3 py-3 text-left transition-all',
                    isActive
                      ? 'border-ramp-blue/40 bg-ramp-blue/10'
                      : 'border-transparent hover:border-border hover:bg-muted',
                    (isEnriching && !isActive) || isLoadingThis ? 'opacity-60' : '',
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {isLoadingThis && <Spinner className="h-3 w-3 shrink-0 text-ramp-blue" />}
                    <div className="truncate text-sm font-medium text-foreground">{summary.name}</div>
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                      {summary.function_count}
                    </span>
                  </div>
                  <div className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {summary.description}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main graph */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-2.5">
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              {inTourMode && activeFlow ? `Tour · ${activeFlow.steps[tourStepIdx]?.name}` : (activeFlow?.name ?? 'Discovering flows…')}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {activeFlow
                ? inTourMode
                  ? `Step ${tourStepIdx + 1} of ${activeFlow.steps.length}`
                  : `${layouted.length} functions · ${activeEdges.length} calls`
                : 'loading execution graph'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFlow && !inTourMode && (
              <button onClick={() => { setInTourMode(true); setTourStepIdx(0); }}
                className="flex items-center gap-1.5 rounded-lg border border-ramp-blue/40 bg-ramp-blue/10 px-3.5 py-1.5 text-[12px] font-semibold text-ramp-blue transition-colors hover:bg-ramp-blue/20">
                <Sparkles className="h-3.5 w-3.5" /> Guided Tour
              </button>
            )}
            {inTourMode && (
              <button onClick={() => setInTourMode(false)}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/20">
                <X className="h-3.5 w-3.5" /> Exit Tour
              </button>
            )}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setScale(s => Math.max(0.15, s / 1.25))}><ZoomOut className="h-3.5 w-3.5" /></Button>
              <span className="w-10 text-center text-[11px] text-muted-foreground">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon-sm" onClick={() => setScale(s => Math.min(3, s * 1.25))}><ZoomIn className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="icon-sm" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); positionRef.current = { x: 0, y: 0 }; }}><Maximize2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {isWorking && <LoadingOverlay message={loadingMessage} />}

          {error && !isWorking && (
            <div className="absolute left-1/2 top-5 z-10 flex animate-fade-in items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-1 text-destructive hover:opacity-80"><X className="h-3 w-3" /></button>
            </div>
          )}

          {!isWorking && !activeFlow && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Workflow className="h-10 w-10 opacity-30" />
              <span className="text-[13px]">Select a flow from the sidebar</span>
            </div>
          )}

          {!isWorking && activeFlow && layouted.length > 0 && (
            <div ref={containerRef}
              onMouseDown={e => {
                isDraggingRef.current = true;
                dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
              }}
              onClick={() => setSelectedNode(null)}
              className="relative h-full w-full select-none cursor-grab">

              <div
                style={{ backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }}
                className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(148,163,184,0.1)_1px,transparent_1px)] [background-size:28px_28px]"
              />

              <div style={{ transform: `translate(${position.x}px,${position.y}px) scale(${scale})` }} className="absolute inset-0" >
                <svg className="pointer-events-none absolute inset-0 z-0 h-[4000px] w-[6000px] overflow-visible">
                  <defs>
                    {Object.entries(PALETTES).map(([type, p]) => (
                      <marker key={type} id={`fpm-${type}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                        <path d="M0,1 L0,6 L6,3.5 z" fill={p.dot} opacity="0.9" />
                      </marker>
                    ))}
                  </defs>
                  {activeEdges.map((edge, i) => {
                    const src = layouted.find(n => n.id === edge.source);
                    const tgt = layouted.find(n => n.id === edge.target);
                    if (!src || !tgt) return null;
                    const sc = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
                    const tc = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
                    const sa = anchor(src, tc.x, tc.y);
                    const ta = anchor(tgt, sc.x, sc.y);
                    const p = getPalette(src.node_type);
                    const isTour = tourActiveNode && (edge.source === tourActiveNode.id || edge.target === tourActiveNode.id);
                    const hi = (!!focusId && (edge.source === focusId || edge.target === focusId)) || !!isTour;
                    const dim = (!!focusId && !hi) || (inTourMode && !isTour);
                    return (
                      <g key={i}>
                        {hi && <path d={curve(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={10} opacity={0.1} />}
                        <path d={curve(sa.x, sa.y, ta.x, ta.y)} fill="none"
                          stroke={hi ? p.dot : 'rgba(148,163,184,0.18)'}
                          strokeWidth={hi ? 2 : 1}
                          opacity={dim ? 0.04 : hi ? 1 : 0.7}
                          markerEnd={hi ? `url(#fpm-${src.node_type})` : undefined}
                          style={{ transition: 'opacity 0.2s, stroke 0.2s' }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {layouted.map(node => {
                  const p = getPalette(node.node_type);
                  const isHov = hoveredNode === node.id;
                  const isSel = selectedNode === node.id;
                  const isConn = focusConnected.has(node.id);
                  const isFoc = focusId === node.id;
                  const isTour = tourActiveNode?.id === node.id;
                  const isDim = (!!focusId && !isFoc && !isConn) || (inTourMode && !isTour);
                  const filename = node.file_path?.split('/').pop();
                  return (
                    <div key={node.id}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={e => { e.stopPropagation(); setSelectedNode(selectedNode === node.id ? null : node.id); }}
                      style={{
                        position: 'absolute', zIndex: isTour ? 3 : 1,
                        left: node.x, top: node.y, width: node.width, height: node.height,
                        background: isFoc || isSel || isTour || isConn ? (isDark ? p.bg : p.bgL) : 'hsl(var(--card))',
                        border: `${isTour ? 2 : 1}px solid ${isFoc || isSel || isTour ? (isDark ? p.border : p.borderL) : isConn ? (isDark ? p.border + '88' : p.borderL) : 'hsl(var(--border))'}`,
                        boxShadow: isTour ? `0 0 0 3px ${p.dot}33, 0 0 32px ${p.glow}` : isFoc || isSel ? `0 0 0 1px ${isDark ? p.border : p.borderL}, 0 0 24px ${p.glow}` : 'none',
                        opacity: isDim ? 0.1 : 1,
                        transform: isHov || isSel || isTour ? 'scale(1.05)' : 'scale(1)',
                      }}
                      className="flex cursor-pointer flex-col justify-center rounded-xl px-3.5 backdrop-blur-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div style={{ background: p.dot, boxShadow: isFoc || isSel || isTour ? `0 0 8px ${p.dot}` : 'none' }} className="h-1.5 w-1.5 shrink-0 rounded-full" />
                        <span style={{ color: isFoc || isSel || isTour || isConn ? (isDark ? p.text : p.textL) : 'hsl(var(--muted-foreground))' }} className="truncate text-[12px] font-semibold tracking-[-0.01em]">
                          {node.label}
                        </span>
                        {node.is_async && (
                          <span className="ml-auto shrink-0 rounded border border-[#a855f7]/30 bg-[#a855f7]/15 px-1.5 py-px text-[8px] font-bold text-[#d8b4fe]">async</span>
                        )}
                      </div>
                      {filename && (
                        <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap pl-[15px] text-[10px] text-muted-foreground/70">
                          {filename}{node.line_start ? `:${node.line_start}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pointer-events-none absolute bottom-5 left-5 z-10 rounded-xl border border-border bg-popover/95 px-3.5 py-2.5 backdrop-blur-xl">
                <div className="mb-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Node type</div>
                {LEGEND_TYPES.map(({ type, label }) => {
                  const p = getPalette(type);
                  return (
                    <div key={type} className="mb-1 flex items-center gap-1.5">
                      <div style={{ background: p.dot, boxShadow: `0 0 4px ${p.dot}` }} className="h-1.5 w-1.5 rounded-full" />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inTourMode && activeFlow && !isWorking && (
            <StoryCard
              flow={activeFlow}
              stepIdx={tourStepIdx}
              onPrev={() => setTourStepIdx(i => Math.max(0, i - 1))}
              onNext={() => setTourStepIdx(i => Math.min(activeFlow.steps.length - 1, i + 1))}
              onExit={() => setInTourMode(false)}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
}
