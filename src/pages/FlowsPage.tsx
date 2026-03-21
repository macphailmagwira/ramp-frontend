import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ApiFlowGraph, ApiFlowNode, ApiFlowEdge, DiscoveredFlowSummary, FlowStoryResponse } from '@/types';
import {
  Workflow, ZoomIn, ZoomOut, Maximize2, Search, Loader2,
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

function LoadingOverlay({ isDark, message }: { isDark: boolean; message: string }) {
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: isDark ? '#0a0d12' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 28 }}>
        {[0, 8, 16].map((inset, i) => (
          <div key={i} style={{ position: 'absolute', inset, borderRadius: '50%', border: `1px solid rgba(59,130,246,${0.12 + i * 0.1})`, animation: `fp-ping 2s ease-out infinite ${i * 0.4}s` }} />
        ))}
        <div style={{ position: 'absolute', inset: 22, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles style={{ width: 14, height: 14, color: '#60a5fa' }} />
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a', marginBottom: 10 }}>{message}</div>
      <div style={{ fontSize: 12, color: isDark ? '#475569' : '#64748b', opacity: vis ? 1 : 0, transition: 'opacity 0.4s', minHeight: 18 }}>{LOADING_PHRASES[idx]}</div>
      <div style={{ width: 180, height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#a855f7)', borderRadius: 2, animation: 'fp-progress 6s linear forwards' }} />
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
    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: 480, maxWidth: 'calc(100vw - 48px)', background: isDark ? 'rgba(10,13,20,0.97)' : 'rgba(255,255,255,0.98)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 16, backdropFilter: 'blur(20px)', boxShadow: isDark ? '0 0 0 1px rgba(59,130,246,0.15),0 24px 48px rgba(0,0,0,0.7)' : '0 24px 48px rgba(0,0,0,0.15)', animation: 'fp-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ width: 11, height: 11, color: '#60a5fa' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {flow.name} · {stepIdx + 1} / {total}
          </span>
        </div>
        <button onClick={onExit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#475569' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
          <X style={{ width: 12, height: 12 }} /> Exit
        </button>
      </div>

      <div style={{ padding: '14px 16px', maxHeight: 220, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: isDark ? p.bg : p.bgL, border: `1px solid ${isDark ? p.border : p.borderL}`, color: isDark ? p.text : p.textL }}>
            {stepIcon(step.type)}
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{step.type}</span>
          </div>
          {step.is_async && <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe' }}>async</div>}
          {step.insight && <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>{step.insight}</div>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.35, marginBottom: 8 }}>{step.name}</div>
        <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.65 }}>{step.description}</div>
        {step.file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 10px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}` }}>
            <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8' }}>📄</span>
            <code style={{ fontSize: 11, fontFamily: 'monospace', color: p.dot }}>{step.file}{step.line ? `:${step.line}` : ''}</code>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', maxWidth: 200 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === stepIdx ? 14 : 5, height: 5, borderRadius: 3, background: i === stepIdx ? p.dot : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onPrev} disabled={stepIdx === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', color: stepIdx === 0 ? (isDark ? '#1e293b' : '#e2e8f0') : (isDark ? '#94a3b8' : '#475569'), cursor: stepIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
          </button>
          <button onClick={stepIdx === total - 1 ? onExit : onNext}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: 'none', background: stepIdx === total - 1 ? 'rgba(16,185,129,0.9)' : p.dot, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {stepIdx === total - 1 ? 'Done ✓' : <><span>Next</span><ChevronRight style={{ width: 14, height: 14 }} /></>}
          </button>
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

  const T: Record<string, string> = {
    bg: isDark ? '#0a0d12' : '#f8fafc',
    headerBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    headerBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    title: isDark ? '#e2e8f0' : '#0f172a',
    sub: isDark ? '#475569' : '#64748b',
    sidebarBg: isDark ? 'rgba(10,13,18,0.98)' : '#ffffff',
    sidebarBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    btnBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    btnBg: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    btnColor: isDark ? '#64748b' : '#94a3b8',
    dotGrid: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)',
    nodeBg: isDark ? 'rgba(15,20,30,0.9)' : 'rgba(255,255,255,0.95)',
    nodeBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    nodeText: isDark ? '#94a3b8' : '#475569',
    nodeSub: isDark ? '#334155' : '#94a3b8',
    edgeIdle: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.18)',
    flowItemBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    flowItem: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    flowActive: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
    flowActiveBorder: 'rgba(59,130,246,0.4)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
    empty: isDark ? '#1e293b' : '#cbd5e1',
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, borderRadius: 6, border: `1px solid ${T.btnBorder}`,
    background: T.btnBg, color: T.btnColor, cursor: 'pointer',
  };

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
    <div style={{ height: '100%', display: 'flex', background: T.bg, fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace" }}>

      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${T.sidebarBorder}`, background: T.sidebarBg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Workflow style={{ width: 14, height: 14, color: '#60a5fa' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.title }}>Flows</div>
              <div style={{ fontSize: 10, color: T.sub }}>AI-discovered execution flows</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isWorking && handleSearch()}
              placeholder="Ask about a flow…"
              disabled={isWorking || !fullGraph}
              style={{ flex: 1, height: 32, padding: '0 10px', fontSize: 11, borderRadius: 7, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.title, outline: 'none' }}
            />
            <button onClick={handleSearch} disabled={isWorking || !searchQuery.trim() || !fullGraph}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', cursor: isWorking || !searchQuery.trim() || !fullGraph ? 'not-allowed' : 'pointer', opacity: isWorking || !searchQuery.trim() || !fullGraph ? 0.5 : 1 }}>
              {isSearching
                ? <Loader2 style={{ width: 13, height: 13, animation: 'fp-spin 0.8s linear infinite' }} />
                : <Search style={{ width: 13, height: 13 }} />}
            </button>
          </div>
          <div style={{ fontSize: 10, color: T.sub, marginTop: 6, lineHeight: 1.5 }}>
            AI reads the full graph to find your flow
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {(isLoadingGraph || isDiscovering) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px', color: T.sub, fontSize: 11 }}>
              <Loader2 style={{ width: 18, height: 18, animation: 'fp-spin 0.8s linear infinite' }} />
              {isLoadingGraph ? 'Loading graph…' : 'Discovering flows…'}
            </div>
          )}

          {!isLoadingGraph && !isDiscovering && discoveredFlows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: T.empty, fontSize: 11 }}>
              No flows discovered yet
            </div>
          )}

          {discoveredFlows.map(summary => {
            const isActive = selectedFlowId === summary.id;
            const isLoadingThis = isEnriching && selectedFlowId === summary.id;
            return (
              <button key={summary.id} onClick={() => selectFlow(summary)} disabled={isEnriching}
                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, marginBottom: 4, border: `1px solid ${isActive ? T.flowActiveBorder : T.flowItemBorder}`, background: isActive ? T.flowActive : T.flowItem, cursor: isEnriching ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: isEnriching && !isActive ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  {isLoadingThis && <Loader2 style={{ width: 10, height: 10, flexShrink: 0, animation: 'fp-spin 0.8s linear infinite', color: '#60a5fa' }} />}
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.name}</div>
                </div>
                <div style={{ fontSize: 10, color: T.sub, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {summary.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main graph */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${T.headerBorder}`, background: T.headerBg, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.title }}>
              {inTourMode && activeFlow ? `Tour · ${activeFlow.steps[tourStepIdx]?.name}` : (activeFlow?.name ?? 'Discovering flows…')}
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>
              {activeFlow
                ? inTourMode
                  ? `Step ${tourStepIdx + 1} of ${activeFlow.steps.length}`
                  : `${layouted.length} functions · ${activeEdges.length} calls`
                : 'loading execution graph'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeFlow && !inTourMode && (
              <button onClick={() => { setInTourMode(true); setTourStepIdx(0); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <Sparkles style={{ width: 13, height: 13 }} /> Guided Tour
              </button>
            )}
            {inTourMode && (
              <button onClick={() => setInTourMode(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <X style={{ width: 13, height: 13 }} /> Exit Tour
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setScale(s => Math.max(0.15, s / 1.25))} style={btnStyle}><ZoomOut style={{ width: 14, height: 14 }} /></button>
              <span style={{ fontSize: 11, color: T.sub, width: 40, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s * 1.25))} style={btnStyle}><ZoomIn style={{ width: 14, height: 14 }} /></button>
              <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); positionRef.current = { x: 0, y: 0 }; }} style={btnStyle}><Maximize2 style={{ width: 14, height: 14 }} /></button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {isWorking && <LoadingOverlay isDark={isDark} message={loadingMessage} />}

          {error && !isWorking && (
            <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10, background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12 }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />{error}
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}><X style={{ width: 12, height: 12 }} /></button>
            </div>
          )}

          {!isWorking && !activeFlow && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.empty }}>
              <Workflow style={{ width: 40, height: 40, opacity: 0.3 }} />
              <span style={{ fontSize: 13 }}>Select a flow from the sidebar</span>
            </div>
          )}

          {!isWorking && activeFlow && layouted.length > 0 && (
            <div ref={containerRef}
              onMouseDown={e => {
                isDraggingRef.current = true;
                dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
              }}
              onClick={() => setSelectedNode(null)}
              style={{ width: '100%', height: '100%', cursor: 'grab', userSelect: 'none', position: 'relative' }}>

              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${T.dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }} />

              <div style={{ position: 'absolute', inset: 0, transform: `translate(${position.x}px,${position.y}px) scale(${scale})`, transformOrigin: 'center center' }}>
                <svg style={{ position: 'absolute', inset: 0, width: 6000, height: 4000, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}>
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
                          stroke={hi ? p.dot : T.edgeIdle} strokeWidth={hi ? 2 : 1}
                          opacity={dim ? 0.04 : hi ? 1 : 0.7}
                          markerEnd={hi ? `url(#fpm-${src.node_type})` : undefined}
                          style={{ transition: 'opacity 0.2s, stroke 0.2s' }} />
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
                        borderRadius: 10,
                        background: isFoc || isSel || isTour || isConn ? (isDark ? p.bg : p.bgL) : T.nodeBg,
                        border: `${isTour ? 2 : 1}px solid ${isFoc || isSel || isTour ? (isDark ? p.border : p.borderL) : isConn ? (isDark ? p.border + '88' : p.borderL) : T.nodeBorder}`,
                        boxShadow: isTour ? `0 0 0 3px ${p.dot}33, 0 0 32px ${p.glow}` : isFoc || isSel ? `0 0 0 1px ${isDark ? p.border : p.borderL}, 0 0 24px ${p.glow}` : 'none',
                        opacity: isDim ? 0.1 : 1,
                        cursor: 'pointer',
                        transform: isHov || isSel || isTour ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        padding: '0 14px', userSelect: 'none', backdropFilter: 'blur(8px)',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: isFoc || isSel || isTour ? `0 0 8px ${p.dot}` : 'none' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isFoc || isSel || isTour || isConn ? (isDark ? p.text : p.textL) : T.nodeText }}>
                          {node.label}
                        </span>
                        {node.is_async && (
                          <div style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(168,85,247,0.15)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.3)', flexShrink: 0, marginLeft: 'auto' }}>async</div>
                        )}
                      </div>
                      {filename && (
                        <div style={{ fontSize: 10, color: T.nodeSub, marginTop: 3, paddingLeft: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {filename}{node.line_start ? `:${node.line_start}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, background: isDark ? 'rgba(10,13,18,0.92)' : 'rgba(255,255,255,0.95)', border: `1px solid ${T.sidebarBorder}`, borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(16px)', pointerEvents: 'none' }}>
                <div style={{ fontSize: 9, color: T.sub, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Node type</div>
                {LEGEND_TYPES.map(({ type, label }) => {
                  const p = getPalette(type);
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, boxShadow: `0 0 4px ${p.dot}` }} />
                      <span style={{ fontSize: 10, color: T.sub }}>{label}</span>
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

      <style>{`
        @keyframes fp-spin     { to { transform: rotate(360deg); } }
        @keyframes fp-ping     { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes fp-progress { from { width: 0%; } to { width: 100%; } }
        @keyframes fp-slide-up { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}