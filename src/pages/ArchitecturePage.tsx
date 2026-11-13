import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ArchitectureStoryNode, ArchitectureStoryNodeType, ArchitectureStoryResponse } from '@/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import {
  Network, Component, File, ZoomIn, ZoomOut, Maximize2,
  ChevronRight, ChevronLeft, ArrowRight, AlertCircle,
  MousePointerClick, Info, Expand, Shrink, RefreshCw,
  Server, Database, Cloud, Wrench, Monitor, Cog, FlaskConical, Webhook,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeWithPos extends ArchitectureStoryNode {
  x: number; y: number; width: number; height: number;
}
interface ArchitecturePageProps { repoId: string | null; }

// ─── Per-type styling ─────────────────────────────────────────────────────────

const TYPE_ORDER: ArchitectureStoryNodeType[] = ['feature', 'component', 'file'];

interface TypeStyle {
  dot: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
}

// Per-layer icon, keyed by the backend layer id. Colour is driven purely by the
// node *type* (Layer/Module/File) so the entire graph and details use one palette.
interface LayerMeta { icon: LucideIcon; }
const LAYER_META: Record<string, LayerMeta> = {
  ui:       { icon: Monitor },
  api:      { icon: Webhook },
  services: { icon: Cog },
  data:     { icon: Database },
  external: { icon: Cloud },
  infra:    { icon: Server },
  shared:   { icon: Wrench },
  tests:    { icon: FlaskConical },
};

// Column for each layer on the top-level map (left → right). Layers import each other in
// cycles (API ↔ Business Logic ↔ Data), so a dependency-based layout orders them arbitrarily
// (it came out reversed). Fixed ranks keep the map in architectural order. Only used at the
// top level and only when every node there is a known layer.
const LAYER_RANK: Record<string, number> = {
  ui: 0, tests: 0, api: 1, services: 2, data: 3, external: 3, infra: 3, shared: 4,
};

const TYPE_STYLE: Record<ArchitectureStoryNodeType, TypeStyle> = {
  system:    { dot: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.5)', glow: 'rgba(148,163,184,0.35)', label: 'System' },
  feature:   { dot: '#a855f7', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.55)',  glow: 'rgba(168,85,247,0.35)',  label: 'Layer'  },
  component: { dot: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.55)',  glow: 'rgba(16,185,129,0.35)',  label: 'Module' },
  file:      { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.55)',  glow: 'rgba(245,158,11,0.35)',  label: 'File'   },
};

// Edge-arrow markers: one per node type.
const MARKER_COLORS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(TYPE_STYLE).map(([k, v]) => [k, v.dot])),
};

function isLayer(node: ArchitectureStoryNode): LayerMeta | null {
  return node.type === 'feature' && LAYER_META[node.id] ? LAYER_META[node.id] : null;
}

// Every visual element (node accent, edges, contains list, details) is coloured
// only by the node *type*, so the palette stays consistent and easy to read.
function styleFor(node: ArchitectureStoryNode): TypeStyle {
  return TYPE_STYLE[node.type];
}

// Marker key is the node type, so edges share the type palette too.
function markerKey(node: ArchitectureStoryNode): string {
  return node.type;
}

function TypeIcon({ node, className }: { node: ArchitectureStoryNode; className?: string }) {
  const layer = isLayer(node);
  const Icon = layer ? layer.icon
    : node.type === 'system' ? Network
    : node.type === 'component' ? Component
    : File;
  return <Icon className={className} />;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 232, NODE_H = 104, COL_W = 360, ROW_H = 150, MAX_PER_COL = 5;

function getEdgeAnchor(node: NodeWithPos, fromX: number, fromY: number, margin = 0) {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const dx = fromX - cx, dy = fromY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = node.width / 2 - margin, hh = node.height / 2 - margin;
  const t = Math.abs(dx) * hh > Math.abs(dy) * hw ? hw / Math.abs(dx) : hh / Math.abs(dy);
  return { x: cx + dx * t, y: cy + dy * t };
}

function getCurvedPath(sx: number, sy: number, tx: number, ty: number) {
  const dx = tx - sx;
  return `M ${sx} ${sy} C ${sx + dx * 0.45} ${sy} ${tx - dx * 0.45} ${ty} ${tx} ${ty}`;
}

function layoutTree(
  nodes: ArchitectureStoryNode[],
  edges: [string, string][],
  rank?: Record<string, number>,
): NodeWithPos[] {
  if (nodes.length === 0) return [];
  const ids = new Set(nodes.map(n => n.id));

  const out: Record<string, string[]> = {};
  const hasIn = new Set<string>();
  nodes.forEach(n => { out[n.id] = []; });
  edges.forEach(([s, t]) => {
    if (ids.has(s) && ids.has(t) && s !== t) { out[s].push(t); hasIn.add(t); }
  });

  const state: Record<string, number> = {};
  const dag: Record<string, string[]> = {};
  nodes.forEach(n => { dag[n.id] = []; });
  const visit = (start: string) => {
    const stack: [string, number][] = [[start, 0]];
    state[start] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1];
      const id = top[0];
      if (top[1] < out[id].length) {
        const t = out[id][top[1]++];
        if (state[t] === 1) continue;
        dag[id].push(t);
        if (!state[t]) { state[t] = 1; stack.push([t, 0]); }
      } else {
        state[id] = 2;
        stack.pop();
      }
    }
  };
  [...nodes.filter(n => !hasIn.has(n.id)), ...nodes].forEach(n => { if (!state[n.id]) visit(n.id); });

  const level: Record<string, number> = {};
  const indeg: Record<string, number> = {};
  const preds: Record<string, string[]> = {};
  nodes.forEach(n => { level[n.id] = 0; indeg[n.id] = 0; preds[n.id] = []; });
  nodes.forEach(n => dag[n.id].forEach(t => { indeg[t]++; preds[t].push(n.id); }));
  const queue = nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const t of dag[id]) {
      level[t] = Math.max(level[t], level[id] + 1);
      if (--indeg[t] === 0) queue.push(t);
    }
  }

  // Fixed architectural order (top-level layers): overrides the dependency-based columns.
  if (rank && nodes.every(n => rank[n.id] !== undefined)) {
    nodes.forEach(n => { level[n.id] = rank[n.id]; });
  }

  const maxLevel = Math.max(...Object.values(level));
  const cols: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  nodes.forEach(n => cols[level[n.id]].push(n.id));
  const row: Record<string, number> = {};
  cols.forEach((col, ci) => {
    if (ci > 0) {
      const score = (id: string) => {
        const p = preds[id].filter(x => row[x] !== undefined);
        return p.length ? p.reduce((a, x) => a + row[x], 0) / p.length : 1e9;
      };
      col.sort((a, b) => score(a) - score(b));
    }
    col.forEach((id, r) => { row[id] = r; });
  });

  const pos: Record<string, { x: number; y: number }> = {};
  let x = 0;
  cols.forEach(col => {
    if (col.length === 0) return;
    const subs = Math.ceil(col.length / MAX_PER_COL);
    const per = Math.ceil(col.length / subs);
    for (let s = 0; s < subs; s++) {
      const chunk = col.slice(s * per, (s + 1) * per);
      chunk.forEach((id, r) => {
        pos[id] = { x: 80 + x * COL_W, y: 360 + (r - (chunk.length - 1) / 2) * ROW_H - NODE_H / 2 };
      });
      x++;
    }
  });

  return nodes.map(n => ({ ...n, x: pos[n.id]?.x ?? 80, y: pos[n.id]?.y ?? 80, width: NODE_W, height: NODE_H }));
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function nodeAt(root: ArchitectureStoryNode, path: string[]): ArchitectureStoryNode {
  let cur = root;
  for (const id of path) {
    const child = cur.children.find(c => c.id === id);
    if (!child) break;
    cur = child;
  }
  return cur;
}

function buildBreadcrumb(root: ArchitectureStoryNode, path: string[]): { id: string; label: string }[] {
  const crumbs = [{ id: root.id, label: root.label }];
  let cur = root;
  for (const id of path) {
    const child = cur.children.find(c => c.id === id);
    if (!child) break;
    crumbs.push({ id: child.id, label: child.label });
    cur = child;
  }
  return crumbs;
}

function computeFileCounts(root: ArchitectureStoryNode): Record<string, number> {
  const counts: Record<string, number> = {};
  const walk = (n: ArchitectureStoryNode): number => {
    const c = n.type === 'file' ? 1 : n.children.reduce((a, k) => a + walk(k), 0);
    counts[n.id] = c;
    return c;
  };
  walk(root);
  return counts;
}

// ─── Node card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: NodeWithPos;
  connected: boolean;
  hovered: boolean;
  selected: boolean;
  focused: boolean;
  dimmed: boolean;
  fileCount: number;
  onEnter: () => void;
  onLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
}

function NodeCard({
  node, connected, hovered, selected, focused, dimmed, fileCount, onEnter, onLeave, onClick,
}: NodeCardProps) {
  const p = styleFor(node);
  const drillable = node.children.length > 0;
  const emphasized = hovered || selected || focused || connected;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      role={drillable ? 'button' : undefined}
      tabIndex={drillable ? 0 : -1}
      className={cn(
        'group absolute flex flex-col justify-center overflow-hidden rounded-xl px-3.5 backdrop-blur-md',
        'transition-all duration-200 ease-out motion-reduce:transition-none',
        drillable ? 'cursor-pointer' : 'cursor-default',
        emphasized ? 'bg-card/95' : 'bg-card/85',
        (hovered || selected) && 'scale-[1.035]',
      )}
      style={{
        left: node.x, top: node.y, width: node.width, height: node.height, zIndex: 2,
        border: `1px solid ${emphasized ? p.border : 'hsl(var(--border))'}`,
        boxShadow: emphasized
          ? `0 0 0 1px ${p.border}, 0 0 26px ${p.glow}, 0 10px 26px rgba(0,0,0,0.22)`
          : '0 1px 2px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.06)',
        opacity: dimmed ? 0.55 : 1,
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
        style={{ background: p.dot, opacity: emphasized ? 0.95 : 0.6 }}
      />

      <div className="flex items-center gap-2 pl-1.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${p.dot}1f`, border: `1px solid ${p.dot}55`, color: p.dot }}
        >
          <TypeIcon node={node} className="h-3 w-3" />
        </span>
        <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">
          {node.label}
        </span>
        {node.insight && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto shrink-0">
                  <Info className="h-3 w-3" style={{ color: p.dot }} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
                {node.insight}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {node.description && (
        <div className="mt-1 line-clamp-2 pl-1.5 text-[10.5px] leading-snug text-muted-foreground">
          {node.description}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1.5 pl-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em]"
          style={{ background: `${TYPE_STYLE[node.type].dot}1a`, color: TYPE_STYLE[node.type].dot }}
        >
          {p.label}
        </span>
        {drillable && (
          <span className="flex items-center gap-0.5 text-[9.5px] text-muted-foreground">
            {fileCount} files
            <ChevronRight className="h-2.5 w-2.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        )}
        {node.file_path && !drillable && (
          <span className="truncate font-mono text-[9px] text-muted-foreground">{node.file_path}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArchitecturePage({ repoId }: ArchitecturePageProps) {
  const [tree, setTree] = useState<ArchitectureStoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<ArchitectureStoryNodeType | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panelOpen, setPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // ── Fullscreen sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (pageRef.current) {
        await pageRef.current.requestFullscreen();
      }
    } catch {
      // ignore — user may have blocked it
    }
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!repoId) { setTree(null); setPath([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        // 1) Instant cached load (no LLM pass)
        let data = await api.ai.getArchitectureStory(repoId);
        // 2) First time for this repo → generate + persist (happens once)
        if (!data) data = await api.ai.generateArchitectureStory(repoId);
        if (!cancelled) {
          setTree(data);
          setPath([]);
          setSelectedNode(data?.root?.id ?? null);
          setPanelOpen(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load architecture');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  const handleRegenerate = useCallback(async () => {
    if (!repoId) return;
    setLoading(true); setError(null);
    try {
      const data = await api.ai.regenerateArchitectureStory(repoId);
      setTree(data);
      setPath([]);
      setSelectedNode(data?.root?.id ?? null);
      setPanelOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate architecture');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  const root = tree?.root ?? null;
  const current = root ? nodeAt(root, path) : null;
  const breadcrumb = root ? buildBreadcrumb(root, path) : [];
  const fileCounts = useMemo(() => (root ? computeFileCounts(root) : {}), [root]);

  const { viewNodes, viewEdges, layouted } = useMemo(() => {
    const vn = current ? current.children : [];
    const ve = (current ? current.edges : []) as [string, string][];
    return {
      viewNodes: vn,
      viewEdges: ve,
      layouted: layoutTree(vn, ve, current?.type === 'system' ? LAYER_RANK : undefined),
    };
  }, [current]);

  const nodeById = useMemo(() => {
    const m: Record<string, NodeWithPos> = {};
    layouted.forEach(n => { m[n.id] = n; });
    return m;
  }, [layouted]);

  const focusId = hoveredNode ?? selectedNode;
  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    viewEdges.forEach(([s2, t2]) => {
      if (s2 === focusId) s.add(t2);
      if (t2 === focusId) s.add(s2);
    });
    return s;
  }, [viewEdges, focusId]);

  // If the focused node has no links, there is nothing to highlight — so we
  // should NOT dim anything (the whole point of dimming is to reveal connections).
  const hasFocus = focusId !== null && connectedIds.size > 0;

  const selectedData = useMemo(() => {
    if (!selectedNode || !current) return null;
    if (selectedNode === current.id) return current;
    return current.children.find(c => c.id === selectedNode) ?? null;
  }, [selectedNode, current]);

  useEffect(() => {
    if (!current) return;
    const stillVisible = selectedNode === current.id || current.children.some(c => c.id === selectedNode);
    if (!stillVisible) setSelectedNode(current.id);
  }, [current, selectedNode]);

  const selDeps = useMemo(() => {
    const isNode = (x: NodeWithPos | undefined): x is NodeWithPos => !!x;
    if (!selectedNode) return { out: [] as NodeWithPos[], inn: [] as NodeWithPos[] };
    return {
      out: viewEdges.filter(([s]) => s === selectedNode).map(([, t]) => nodeById[t]).filter(isNode),
      inn: viewEdges.filter(([, t]) => t === selectedNode).map(([s]) => nodeById[s]).filter(isNode),
    };
  }, [viewEdges, selectedNode, nodeById]);

  // ── Canvas transform ──────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newPos = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
      positionRef.current = newPos; setPosition({ ...newPos });
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
  });

  const fitView = useCallback(() => {
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      if (layouted.length === 0) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        positionRef.current = { x: 0, y: 0 };
        return;
      }
      const minX = Math.min(...layouted.map(n => n.x));
      const maxX = Math.max(...layouted.map(n => n.x + n.width));
      const minY = Math.min(...layouted.map(n => n.y));
      const maxY = Math.max(...layouted.map(n => n.y + n.height));
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const s = Math.max(0.15, Math.min(1, (w - 80) / (maxX - minX), (h - 80) / (maxY - minY)));
      const p = { x: (w / 2 - (minX + maxX) / 2) * s, y: (h / 2 - (minY + maxY) / 2) * s };
      setScale(s);
      setPosition(p);
      positionRef.current = p;
    });
  }, [layouted]);

  useEffect(() => { fitView(); }, [fitView, loading, panelOpen, isFullscreen]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
  };

  // ── Drill / selection ─────────────────────────────────────────────────────
  const handleNodeClick = (node: ArchitectureStoryNode) => {
    setSelectedNode(node.id);
    setPanelOpen(true);
    if (node.children.length > 0) setPath(p => [...p, node.id]);
  };

  const goToCrumb = (depth: number) => {
    const np = path.slice(0, depth);
    setPath(np);
    const target = root ? nodeAt(root, np) : null;
    setSelectedNode(target?.id ?? null);
  };

  const goUp = useCallback(() => {
    if (path.length === 0) return;
    goToCrumb(path.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, root]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && path.length > 0 && !document.fullscreenElement) goUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goUp, path.length]);

  // Dimming rules:
  //  - If a legend type is being hovered, filter by type.
  //  - Else if a node is focused AND has connections, dim everything not connected.
  //  - Else (no focus, or focus with no connections) → nothing is dimmed.
  const isNodeDimmed = (n: NodeWithPos) => {
    if (hoveredType) return n.type !== hoveredType;
    if (!hasFocus) return false;
    return n.id !== focusId && !connectedIds.has(n.id);
  };
  const isEdgeDimmed = (s: string, t: string) => {
    if (hoveredType && nodeById[s]?.type !== hoveredType) return true;
    if (!hasFocus) return false;
    return s !== focusId && t !== focusId;
  };

  const parentLabel = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2].label : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={pageRef}
        className={cn(
          'flex h-full flex-col bg-background text-foreground',
          isFullscreen && 'h-screen w-screen',
        )}
      >
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-5 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
              <Network className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight">Architecture</h1>
                {current && (
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                      {viewNodes.length} {viewNodes.length === 1 ? 'node' : 'nodes'}
                    </Badge>
                    {viewEdges.length > 0 && (
                      <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                        {viewEdges.length} links
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {current ? (
                  <>
                    <span className="font-medium text-foreground/80">{current.label}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    click a node to drill in
                  </>
                ) : 'Dependency visualization'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {breadcrumb.length > 1 && (
              <nav aria-label="Breadcrumb" className="hidden items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5 md:flex">
                {breadcrumb.map((c, i) => (
                  <div key={c.id} className="flex items-center">
                    {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                    <button
                      onClick={() => goToCrumb(i)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors',
                        i === breadcrumb.length - 1
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {c.label}
                    </button>
                  </div>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.15, s / 1.25))}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
              <span className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s * 1.25))}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitView}>
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                    {isFullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRegenerate} disabled={loading || !repoId}>
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate architecture</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
              <Spinner className="h-6 w-6 text-muted-foreground" />
              <div className="text-[12px] text-muted-foreground">Building architecture map…</div>
            </div>
          )}

          {!loading && error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <Card className="flex max-w-md items-center gap-2.5 border-destructive/30 bg-destructive/5 px-4 py-3 text-[12px] text-destructive shadow-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </Card>
            </div>
          )}

          {!loading && !error && !repoId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                <MousePointerClick className="h-5 w-5 text-muted-foreground/70" />
              </div>
              <span className="text-[13px] text-muted-foreground">Select a repository to visualize its architecture</span>
            </div>
          )}

          {!loading && !error && tree && !current && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[13px] text-muted-foreground">No architecture found for this repository</span>
            </div>
          )}

          {!loading && !error && current && (
            <div
              ref={containerRef}
              onMouseDown={handleCanvasMouseDown}
              className="relative min-h-0 flex-1 cursor-grab overflow-hidden select-none active:cursor-grabbing"
            >
              {/* Dot grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.18) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                  backgroundPosition: `${position.x % 28}px ${position.y % 28}px`,
                }}
              />

              {viewNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] text-muted-foreground">No sub-components — this is a leaf of the architecture</span>
                </div>
              )}

              <div
                className="absolute inset-0 motion-reduce:transition-none"
                style={{
                  transform: `translate(${position.x}px,${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Edges */}
                <svg className="pointer-events-none absolute inset-0 z-[1] overflow-visible" style={{ width: 5000, height: 4000 }}>
                  <defs>
                    {Object.entries(MARKER_COLORS).map(([k, dot]) => (
                      <marker key={k} id={`arch-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                        <path d="M0 0 L10 5 L0 10 z" fill={dot} />
                      </marker>
                    ))}
                    <marker id="arch-arrow-idle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                      <path d="M0 0 L10 5 L0 10 z" fill="hsl(var(--muted-foreground) / 0.55)" />
                    </marker>
                  </defs>
                  {viewEdges.map(([s, t], i) => {
                    const src = nodeById[s]; const tgt = nodeById[t];
                    if (!src || !tgt) return null;
                    const sc = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
                    const tc = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
                    const sa = getEdgeAnchor(src, tc.x, tc.y, 0);
                    const ta = getEdgeAnchor(tgt, sc.x, sc.y, -5);
                    const p = styleFor(src);
                    const hi = hasFocus && (s === focusId || t === focusId);
                    const dim = isEdgeDimmed(s, t);
                    const d = getCurvedPath(sa.x, sa.y, ta.x, ta.y);
                    return (
                      <g key={i} className="motion-reduce:transition-none" opacity={dim ? 0.15 : 1} style={{ transition: 'opacity 0.2s' }}>
                        {hi && <path d={d} fill="none" stroke={p.dot} strokeWidth={10} opacity={0.12} />}
                        <path
                          d={d}
                          fill="none"
                          stroke={hi ? p.dot : 'hsl(var(--muted-foreground) / 0.45)'}
                          strokeWidth={hi ? 2 : 1.4}
                          strokeDasharray={hi ? '6 4' : undefined}
                          markerEnd={`url(#arch-arrow-${hi ? markerKey(src) : 'idle'})`}
                        >
                          {hi && (
                            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.7s" repeatCount="indefinite" />
                          )}
                        </path>
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes */}
                {layouted.map(node => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    connected={connectedIds.has(node.id)}
                    hovered={hoveredNode === node.id}
                    selected={selectedNode === node.id}
                    focused={focusId === node.id}
                    dimmed={isNodeDimmed(node)}
                    fileCount={fileCounts[node.id] ?? 0}
                    onEnter={() => setHoveredNode(node.id)}
                    onLeave={() => setHoveredNode(null)}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                  />
                ))}
              </div>

              {/* Floating "Up" button */}
              {path.length > 0 && (
                <div className="pointer-events-none absolute left-4 top-4 z-20">
                  <button
                    onClick={goUp}
                    className={cn(
                      'pointer-events-auto group flex items-center gap-2 rounded-full border border-border/70',
                      'bg-card/90 py-1.5 pl-2 pr-3 text-[11.5px] font-medium text-foreground',
                      'shadow-md backdrop-blur-md transition-all duration-150',
                      'hover:-translate-y-0.5 hover:border-border hover:shadow-lg active:translate-y-0',
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                      <ChevronLeft className="h-3 w-3" />
                    </span>
                    <span className="max-w-[200px] truncate">
                      Back{parentLabel ? <> to <span className="font-semibold">{parentLabel}</span></> : ''}
                    </span>
                  </button>
                </div>
              )}

              {/* Legend */}
              <Card className="pointer-events-auto absolute bottom-4 left-4 z-10 gap-0 rounded-xl border-border/60 bg-card/85 p-3 shadow-lg backdrop-blur-xl">
                <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Node type
                </div>
                <div className="flex flex-col gap-0.5">
                  {TYPE_ORDER.map(type => {
                    const p = TYPE_STYLE[type];
                    const active = hoveredType === type;
                    return (
                      <button
                        key={type}
                        onMouseEnter={() => setHoveredType(type)}
                        onMouseLeave={() => setHoveredType(null)}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
                          active ? 'bg-muted' : 'hover:bg-muted/60',
                        )}
                      >
                        <span
                          className="h-2 w-2 rounded-full transition-shadow"
                          style={{ background: p.dot, boxShadow: active ? `0 0 8px ${p.dot}` : `0 0 4px ${p.dot}99` }}
                        />
                        <span className="text-[10.5px] text-muted-foreground">{p.label}</span>
                      </button>
                    );
                  })}
                  <Separator className="my-1" />
                  <div className="flex items-center gap-2 px-1.5 py-0.5">
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/70" />
                    <span className="text-[10.5px] text-muted-foreground">depends on</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Details panel */}
          {selectedData && panelOpen && (
            <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-border/60 bg-card/60 backdrop-blur-sm motion-safe:animate-in motion-safe:slide-in-from-right-2 motion-safe:duration-200">
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
                <span className="text-[12px] font-semibold text-foreground">Details</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Collapse details panel"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 overflow-hidden p-4">
                  {/* Identity card */}
                  {(() => {
                    const st = styleFor(selectedData);
                    return (
                  <div
                    className="flex items-center gap-2.5 overflow-hidden rounded-lg border p-3"
                    style={{ borderColor: `${st.border}55`, background: st.bg }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{
                        background: `${st.dot}22`,
                        border: `1px solid ${st.dot}55`,
                        color: st.dot,
                      }}
                    >
                      <TypeIcon node={selectedData} className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-foreground" title={selectedData.label}>
                        {selectedData.label}
                      </div>
                      <div className="truncate text-[10.5px] uppercase tracking-[0.08em] text-foreground/70">
                        {st.label}
                        {selectedData.type !== 'file' && ` · ${fileCounts[selectedData.id] ?? 0} files`}
                      </div>
                    </div>
                  </div>
                    );
                  })()}

                  {selectedData.insight && (
                    <div
                      className="rounded-lg border px-3 py-2 text-[11.5px] font-medium leading-snug"
                      style={{
                        background: `${styleFor(selectedData).dot}14`,
                        borderColor: `${styleFor(selectedData).dot}44`,
                        color: styleFor(selectedData).dot,
                      }}
                    >
                      {selectedData.insight}
                    </div>
                  )}

                  {(selectedData.description || (selectedData.type === 'system' && tree?.summary)) && (
                    <p className="break-words text-[12.5px] leading-relaxed text-foreground/75">
                      {selectedData.description ?? tree?.summary}
                    </p>
                  )}

                  {selectedData.file_path && (
                    <div className="min-w-0">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Source file
                      </div>
                      <code
                        className="block break-all rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-foreground/80"
                        title={selectedData.file_path}
                      >
                        {selectedData.file_path}
                      </code>
                    </div>
                  )}

                  <Separator />

                  {selDeps.out.length > 0 && (
                    <DepList title="Depends on" items={selDeps.out} onSelect={setSelectedNode} />
                  )}
                  {selDeps.inn.length > 0 && (
                    <DepList title="Used by" items={selDeps.inn} onSelect={setSelectedNode} />
                  )}

                  {selectedData.children.length > 0 && (
                    <div className="min-w-0">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Contains ({selectedData.children.length})
                      </div>
                      <div className="flex flex-col gap-1">
                        {selectedData.children.map(child => {
                          const cp = styleFor(child);
                          return (
                            <button
                              key={child.id}
                              onClick={() => handleNodeClick(child)}
                              className="group flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-muted"
                            >
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                                style={{ background: `${cp.dot}22`, color: cp.dot }}
                              >
                                <TypeIcon node={child} className="h-2.5 w-2.5" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground" title={child.label}>
                                {child.label}
                              </span>
                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* Reopen tab */}
          {selectedData && !panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              aria-label="Open details panel"
              className={cn(
                'absolute right-0 top-1/2 z-20 -translate-y-1/2',
                'flex h-16 w-6 items-center justify-center rounded-l-md border border-r-0 border-border/70',
                'bg-card/90 text-muted-foreground shadow-md backdrop-blur-md transition-colors hover:bg-card hover:text-foreground',
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Details-panel dependency list ────────────────────────────────────────────

function DepList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: NodeWithPos[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title} ({items.length})
      </div>
      <div className="flex flex-col gap-1">
        {items.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className="group flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted"
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center"
              style={{ color: styleFor(n).dot }}
            >
              <TypeIcon node={n} className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground" title={n.label}>
              {n.label}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}