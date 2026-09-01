import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { Network, ZoomIn, ZoomOut, Maximize2, Layers, File, X, BookOpen, ChevronLeft, ChevronRight, Sparkles, ChevronDown, GitBranch, ArrowRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchNode { id: string; type: string; file_count: number; }
interface ArchEdge { source: string; target: string; weight: number; }
interface ArchGraph {
  nodes: ArchNode[]; edges: ArchEdge[];
  file_nodes: ArchNode[]; file_edges: ArchEdge[];
}
interface NodeWithPos extends ArchNode { x: number; y: number; width: number; height: number; }
interface ArchitecturePageProps { repoId: string | null; }
interface StoryStep {
  title: string;
  description: string;
  highlight_nodes: string[];
  highlight_edges: string[][];
  insight?: string;
}
interface Story { summary: string; steps: StoryStep[]; }

interface GraphSection {
  nodes: ArchNode[];
  edges: ArchEdge[];
  crossEdges: ArchEdge[];
  depth: number;
  chunkIndex: number;
  totalChunks: number;
  depthLabel: string;
}

interface FolderBoundary {
  folder: string;
  x: number;
  y: number;
  width: number;
  height: number;
  palette: FolderPaletteEntry;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 14;

const NODE_PALETTES = [
  { bg: 'rgba(59,130,246,0.13)', bgLight: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.55)', borderLight: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.3)', text: '#93c5fd', textLight: '#1d4ed8', dot: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.13)', bgLight: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.55)', borderLight: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.3)', text: '#6ee7b7', textLight: '#065f46', dot: '#10b981' },
  { bg: 'rgba(245,158,11,0.13)', bgLight: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.55)', borderLight: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.3)', text: '#fcd34d', textLight: '#92400e', dot: '#f59e0b' },
  { bg: 'rgba(239,68,68,0.13)',  bgLight: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.55)',  borderLight: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.3)',  text: '#fca5a5', textLight: '#991b1b', dot: '#ef4444' },
  { bg: 'rgba(168,85,247,0.13)', bgLight: 'rgba(168,85,247,0.07)', border: 'rgba(168,85,247,0.55)', borderLight: 'rgba(168,85,247,0.3)', glow: 'rgba(168,85,247,0.3)', text: '#d8b4fe', textLight: '#6b21a8', dot: '#a855f7' },
  { bg: 'rgba(236,72,153,0.13)', bgLight: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.55)', borderLight: 'rgba(236,72,153,0.3)', glow: 'rgba(236,72,153,0.3)', text: '#f9a8d4', textLight: '#9d174d', dot: '#ec4899' },
  { bg: 'rgba(20,184,166,0.13)', bgLight: 'rgba(20,184,166,0.07)', border: 'rgba(20,184,166,0.55)', borderLight: 'rgba(20,184,166,0.3)', glow: 'rgba(20,184,166,0.3)', text: '#99f6e4', textLight: '#134e4a', dot: '#14b8a6' },
];

interface FolderPaletteEntry {
  fill: string;
  stroke: string;
  label: string;
  labelBg: string;
  labelBorder: string;
}

const FOLDER_PALETTES: FolderPaletteEntry[] = [
  { fill: 'rgba(59,130,246,0.05)',  stroke: 'rgba(59,130,246,0.28)',  label: 'rgba(59,130,246,0.95)',  labelBg: 'rgba(59,130,246,0.13)',  labelBorder: 'rgba(59,130,246,0.35)'  },
  { fill: 'rgba(16,185,129,0.05)',  stroke: 'rgba(16,185,129,0.28)',  label: 'rgba(16,185,129,0.95)',  labelBg: 'rgba(16,185,129,0.13)',  labelBorder: 'rgba(16,185,129,0.35)'  },
  { fill: 'rgba(245,158,11,0.05)',  stroke: 'rgba(245,158,11,0.28)',  label: 'rgba(245,158,11,0.95)',  labelBg: 'rgba(245,158,11,0.13)',  labelBorder: 'rgba(245,158,11,0.35)'  },
  { fill: 'rgba(168,85,247,0.05)',  stroke: 'rgba(168,85,247,0.28)',  label: 'rgba(168,85,247,0.95)',  labelBg: 'rgba(168,85,247,0.13)',  labelBorder: 'rgba(168,85,247,0.35)'  },
  { fill: 'rgba(236,72,153,0.05)',  stroke: 'rgba(236,72,153,0.28)',  label: 'rgba(236,72,153,0.95)',  labelBg: 'rgba(236,72,153,0.13)',  labelBorder: 'rgba(236,72,153,0.35)'  },
  { fill: 'rgba(20,184,166,0.05)',  stroke: 'rgba(20,184,166,0.28)',  label: 'rgba(20,184,166,0.95)',  labelBg: 'rgba(20,184,166,0.13)',  labelBorder: 'rgba(20,184,166,0.35)'  },
  { fill: 'rgba(239,68,68,0.05)',   stroke: 'rgba(239,68,68,0.28)',   label: 'rgba(239,68,68,0.95)',   labelBg: 'rgba(239,68,68,0.13)',   labelBorder: 'rgba(239,68,68,0.35)'   },
];

const CINEMATIC_PHRASES = [
  'Mapping the codebase…',
  'Tracing dependencies…',
  'Identifying entry points…',
  'Analysing import chains…',
  'Finding the core modules…',
  'Building your guided tour…',
];

// ─── Folder helpers ───────────────────────────────────────────────────────────

function getFolderPalette(folder: string): FolderPaletteEntry {
  let hash = 0;
  for (const c of folder) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return FOLDER_PALETTES[hash % FOLDER_PALETTES.length];
}

function getParentFolder(nodeId: string): string {
  const parts = nodeId.split('/');
  return parts.length <= 1 ? '__root__' : parts.slice(0, -1).join('/');
}

// ─── Hierarchical section builder ─────────────────────────────────────────────

function buildHierarchicalSections(nodes: ArchNode[], edges: ArchEdge[]): GraphSection[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree: Record<string, number> = {};
  nodes.forEach(n => { inDegree[n.id] = 0; });
  edges.forEach(e => { if (nodeIds.has(e.target)) inDegree[e.target]++; });

  const depthOf: Record<string, number> = {};
  let frontier = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  if (frontier.length === 0) frontier = [nodes[0].id];
  frontier.forEach(id => { depthOf[id] = 0; });
  const visited = new Set(frontier);

  while (frontier.length > 0) {
    const next: string[] = [];
    edges.forEach(e => {
      if (frontier.includes(e.source) && nodeIds.has(e.target) && !visited.has(e.target)) {
        depthOf[e.target] = (depthOf[e.source] ?? 0) + 1;
        visited.add(e.target);
        next.push(e.target);
      }
    });
    frontier = [...new Set(next)];
  }

  const maxReached = Math.max(0, ...Object.values(depthOf));
  nodes.forEach(n => { if (depthOf[n.id] === undefined) depthOf[n.id] = maxReached + 1; });

  const byDepth = new Map<number, ArchNode[]>();
  nodes.forEach(n => {
    const d = depthOf[n.id];
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  });
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const totalDepths = depths.length;

  const humanLabel = (depth: number) => {
    if (depth === 0) return 'Entry points';
    if (depth === totalDepths - 1 && depth > 0) return 'Leaf modules';
    return `Layer ${depth + 1}`;
  };

  const sections: GraphSection[] = [];
  depths.forEach(depth => {
    const layerNodes = byDepth.get(depth)!;
    const totalChunks = Math.max(1, Math.ceil(layerNodes.length / PAGE_SIZE));
    for (let ci = 0; ci < totalChunks; ci++) {
      const chunkNodes = layerNodes.slice(ci * PAGE_SIZE, (ci + 1) * PAGE_SIZE);
      const chunkIds = new Set(chunkNodes.map(n => n.id));
      const internalEdges = edges.filter(e => chunkIds.has(e.source) && chunkIds.has(e.target));
      const crossEdges = edges.filter(
        e => (chunkIds.has(e.source) && !chunkIds.has(e.target)) ||
             (!chunkIds.has(e.source) && chunkIds.has(e.target))
      );
      const label = totalChunks === 1
        ? humanLabel(depth)
        : `${humanLabel(depth)} (${ci + 1}/${totalChunks})`;
      sections.push({ nodes: chunkNodes, edges: internalEdges, crossEdges, depth, chunkIndex: ci, totalChunks, depthLabel: label });
    }
  });

  return sections;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function getPalette(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return NODE_PALETTES[hash % NODE_PALETTES.length];
}

function layoutFolder(nodes: ArchNode[], edges: ArchEdge[]): NodeWithPos[] {
  const W = 168, H = 72;
  const hasEdges = edges.length > 0;

  if (!hasEdges) {
    const COLS = Math.ceil(Math.sqrt(nodes.length * 1.6));
    const GAP_X = W + 28, GAP_Y = H + 22;
    const totalCols = Math.max(1, COLS);
    const totalW = totalCols * GAP_X - 28;
    const totalRows = Math.ceil(nodes.length / totalCols);
    const totalH = totalRows * GAP_Y;
    const startX = 600 - totalW / 2;
    const startY = 380 - totalH / 2;
    return nodes.map((node, i) => ({
      ...node,
      x: startX + (i % totalCols) * GAP_X,
      y: startY + Math.floor(i / totalCols) * GAP_Y,
      width: W, height: H,
    }));
  }

  const inDeg: Record<string, number> = {};
  nodes.forEach(n => { inDeg[n.id] = 0; });
  edges.forEach(e => { if (inDeg[e.target] !== undefined) inDeg[e.target]++; });
  const layers: string[][] = [];
  const assigned = new Set<string>();
  let current = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  if (current.length === 0) current = [nodes[0]?.id].filter(Boolean);
  while (current.length > 0) {
    layers.push(current);
    current.forEach(id => assigned.add(id));
    const next: string[] = [];
    edges.forEach(e => { if (current.includes(e.source) && !assigned.has(e.target)) next.push(e.target); });
    current = [...new Set(next)];
  }
  nodes.forEach(n => { if (!assigned.has(n.id)) layers.push([n.id]); });

  const COL_W = 220, ROW_H = 96;
  const posMap: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, col) => {
    const totalH = layer.length * ROW_H;
    const startY = 380 - totalH / 2;
    layer.forEach((id, row) => { posMap[id] = { x: 80 + col * COL_W, y: startY + row * ROW_H }; });
  });
  return nodes.map(n => ({ ...n, x: posMap[n.id]?.x ?? 80, y: posMap[n.id]?.y ?? 80, width: W, height: H }));
}

/**
 * layoutFiles — folder-aware layout.
 * Groups nodes by their parent folder, assigns each folder a column band,
 * and stacks files within each band. This makes the folder boundaries
 * tight and non-overlapping.
 */
function layoutFiles(nodes: ArchNode[], edges: ArchEdge[]): NodeWithPos[] {
  const W = 188, H = 58;

  if (nodes.length === 0) return [];

  // Group by folder
  const folderMap = new Map<string, ArchNode[]>();
  nodes.forEach(n => {
    const folder = getParentFolder(n.id);
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder)!.push(n);
  });

  const folders = [...folderMap.keys()];

  // If only one folder (or no grouping needed), fall back to original layout
  if (folders.length <= 1) {
    const hasEdges = edges.length > 0;
    if (!hasEdges) {
      const COLS = Math.ceil(Math.sqrt(nodes.length * 1.8));
      const GAP_X = W + 20, GAP_Y = H + 18;
      const totalCols = Math.max(1, COLS);
      const totalW = totalCols * GAP_X - 20;
      const totalRows = Math.ceil(nodes.length / totalCols);
      const totalH = totalRows * GAP_Y;
      const startX = 600 - totalW / 2;
      const startY = 360 - totalH / 2;
      return nodes.map((node, i) => ({
        ...node,
        x: startX + (i % totalCols) * GAP_X,
        y: startY + Math.floor(i / totalCols) * GAP_Y,
        width: W, height: H,
      }));
    }

    const inDegree: Record<string, number> = {};
    nodes.forEach(n => { inDegree[n.id] = 0; });
    edges.forEach(e => { if (inDegree[e.target] !== undefined) inDegree[e.target]++; });
    const layers: string[][] = [];
    const assigned = new Set<string>();
    let cur = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    if (cur.length === 0) cur = [nodes[0]?.id].filter(Boolean);
    while (cur.length > 0) {
      layers.push(cur);
      cur.forEach(id => assigned.add(id));
      const next: string[] = [];
      edges.forEach(e => { if (cur.includes(e.source) && !assigned.has(e.target)) next.push(e.target); });
      cur = [...new Set(next)];
    }
    nodes.forEach(n => { if (!assigned.has(n.id)) layers.push([n.id]); });

    const COL_W = 240, ROW_H = 82;
    const posMap: Record<string, { x: number; y: number }> = {};
    layers.forEach((layer, col) => {
      const totalH = layer.length * ROW_H;
      const startY = 360 - totalH / 2;
      layer.forEach((id, row) => { posMap[id] = { x: 80 + col * COL_W, y: startY + row * ROW_H }; });
    });
    return nodes.map(n => ({ ...n, x: posMap[n.id]?.x ?? 80, y: posMap[n.id]?.y ?? 80, width: W, height: H }));
  }

  // Multi-folder layout: columns of folder groups
  const ROW_H = H + 16;
  const COL_GAP = 52;  // gap between folder columns
  const FOLDER_PAD_X = 20;
  const FOLDER_PAD_TOP = 36; // room for label pill
  const FOLDER_PAD_BOTTOM = 18;

  // Compute max files per column to determine canvas height
  const maxFilesInFolder = Math.max(...[...folderMap.values()].map(v => v.length));
  const canvasHeight = FOLDER_PAD_TOP + maxFilesInFolder * ROW_H + FOLDER_PAD_BOTTOM;
  const centerY = canvasHeight / 2;

  const posMap: Record<string, { x: number; y: number }> = {};

  let cursorX = 80;
  folders.forEach(folder => {
    const folderNodes = folderMap.get(folder)!;
    const colHeight = folderNodes.length * ROW_H;
    const startY = centerY - colHeight / 2 + FOLDER_PAD_TOP;

    folderNodes.forEach((node, row) => {
      posMap[node.id] = {
        x: cursorX + FOLDER_PAD_X,
        y: startY + row * ROW_H,
      };
    });

    // Advance cursor by the column width
    cursorX += W + FOLDER_PAD_X * 2 + COL_GAP;
  });

  return nodes.map(n => ({
    ...n,
    x: posMap[n.id]?.x ?? 80,
    y: posMap[n.id]?.y ?? 80,
    width: W,
    height: H,
  }));
}

function layoutStoryNodes(nodes: ArchNode[]): NodeWithPos[] {
  const W = 210, H = 66;
  if (nodes.length === 0) return [];
  const COLS = Math.min(nodes.length, Math.ceil(Math.sqrt(nodes.length * 1.5)));
  const GAP_X = 270, GAP_Y = 112;
  const totalCols = COLS || 1;
  const totalRows = Math.ceil(nodes.length / totalCols);

  return nodes.map((node, i) => {
  const col = i % totalCols;
  const row = Math.floor(i / totalCols);
  const totalW = totalCols * GAP_X - (GAP_X - W);
  const totalH = totalRows * GAP_Y;
  return { ...node, x: 600 - totalW / 2 + col * GAP_X, y: 280 - totalH / 2 + row * GAP_Y, width: W, height: H };  
});
}

function getEdgeAnchor(node: NodeWithPos, fromX: number, fromY: number, margin = 10) {
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

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Section Navigator ────────────────────────────────────────────────────────

function SectionNavigator({
  sections, currentIndex, onGoTo, isDark,
}: {
  sections: GraphSection[]; currentIndex: number; onGoTo: (i: number) => void; isDark: boolean;
}) {
  const [showJump, setShowJump] = useState(false);
  const current = sections[currentIndex];
  if (!current) return null;
  const total = sections.length;

  const depthColors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444'];
  const colorFor = (depth: number) => depthColors[depth % depthColors.length];
  const currentColor = colorFor(current.depth);

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: isDark ? 'rgba(10,13,20,0.95)' : 'rgba(255,255,255,0.97)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 10, padding: '5px 12px',
        backdropFilter: 'blur(20px)',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentColor, boxShadow: `0 0 6px ${currentColor}`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a', whiteSpace: 'nowrap' }}>
          {current.depthLabel}
        </span>
        <span style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8', whiteSpace: 'nowrap' }}>
          · {current.nodes.length} {current.nodes.length === 1 ? 'node' : 'nodes'}
          {current.crossEdges.length > 0 && ` · ${current.crossEdges.length} cross-links`}
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: isDark ? 'rgba(10,13,20,0.95)' : 'rgba(255,255,255,0.97)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 12, padding: '6px 10px',
        backdropFilter: 'blur(20px)',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <button
          onClick={() => onGoTo(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 7, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
            color: currentIndex === 0 ? (isDark ? '#1e293b' : '#e2e8f0') : (isDark ? '#94a3b8' : '#475569'),
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>

        {total <= 14 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {sections.map((sec, i) => {
              const isActive = i === currentIndex;
              const color = colorFor(sec.depth);
              const depthChanged = i > 0 && sec.depth !== sections[i - 1].depth;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {depthChanged && <div style={{ width: 1, height: 14, background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', borderRadius: 1, margin: '0 2px' }} />}
                  <button
                    onClick={() => onGoTo(i)}
                    title={sec.depthLabel}
                    style={{
                      width: isActive ? 22 : 8, height: 8, borderRadius: 4,
                      border: 'none', padding: 0, flexShrink: 0, cursor: 'pointer',
                      background: isActive ? color : `${color}55`,
                      boxShadow: isActive ? `0 0 6px ${color}` : 'none',
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowJump(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6,
                border: `1px solid ${currentColor}55`, background: `${currentColor}18`,
                color: currentColor, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              {currentIndex + 1} / {total} <ChevronDown style={{ width: 11, height: 11 }} />
            </button>
            {showJump && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: 8,
                background: isDark ? 'rgba(10,13,20,0.98)' : 'rgba(255,255,255,0.98)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: 10, padding: 10,
                boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.8)' : '0 16px 40px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', gap: 2,
                minWidth: 230, maxHeight: 300, overflowY: 'auto',
              }}>
                {sections.map((sec, i) => {
                  const depthChanged = i > 0 && sec.depth !== sections[i - 1].depth;
                  const color = colorFor(sec.depth);
                  return (
                    <div key={i}>
                      {depthChanged && <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '4px 0' }} />}
                      <button
                        onClick={() => { onGoTo(i); setShowJump(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '6px 10px', borderRadius: 6, border: 'none', textAlign: 'left',
                          background: i === currentIndex ? `${color}22` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: color, boxShadow: i === currentIndex ? `0 0 5px ${color}` : 'none' }} />
                        <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#475569', flex: 1, whiteSpace: 'nowrap' }}>{sec.depthLabel}</span>
                        <span style={{ fontSize: 10, color: isDark ? '#334155' : '#94a3b8' }}>{sec.nodes.length}n</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onGoTo(Math.min(total - 1, currentIndex + 1))}
          disabled={currentIndex === total - 1}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 7, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
            color: currentIndex === total - 1 ? (isDark ? '#1e293b' : '#e2e8f0') : (isDark ? '#94a3b8' : '#475569'),
            cursor: currentIndex === total - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

// ─── Cinematic Loader ─────────────────────────────────────────────────────────

function CinematicLoader({ isDark }: { isDark: boolean }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setPhraseIdx(i => (i + 1) % CINEMATIC_PHRASES.length); setVisible(true); }, 400);
    }, 2200);
    return () => clearInterval(cycle);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: isDark ? '#0a0d12' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 32 }}>
        {[0, 8, 16].map((inset, i) => (
          <div key={i} style={{ position: 'absolute', inset, borderRadius: '50%', border: `1px solid rgba(59,130,246,${0.15 + i * 0.1})`, animation: `story-ping 2s ease-out infinite ${i * 0.4}s` }} />
        ))}
        <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles style={{ width: 16, height: 16, color: '#60a5fa' }} />
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: '-0.03em', marginBottom: 12 }}>Analysing your codebase</div>
      <div style={{ fontSize: 13, color: isDark ? '#475569' : '#64748b', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: 20 }}>{CINEMATIC_PHRASES[phraseIdx]}</div>
      <div style={{ width: 200, height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#a855f7)', borderRadius: 2, animation: 'story-progress 8s linear forwards' }} />
      </div>
    </div>
  );
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({ story, step, total, onPrev, onNext, onExit, isDark }: {
  story: Story; step: number; total: number;
  onPrev: () => void; onNext: () => void; onExit: () => void; isDark: boolean;
}) {
  const current = story.steps[step];
  const progress = ((step + 1) / total) * 100;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onExit]);

  const bg = isDark ? 'rgba(8,11,18,0.97)' : 'rgba(255,255,255,0.99)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const titleColor = isDark ? '#f1f5f9' : '#0f172a';
  const descColor = isDark ? '#94a3b8' : '#475569';
  const labelColor = isDark ? '#475569' : '#94a3b8';

  return (
    <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
  zIndex: 30, width: 900, maxWidth: 'calc(100vw - 80px)',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 20,
      backdropFilter: 'blur(24px)',
      boxShadow: isDark
        ? '0 0 0 1px rgba(59,130,246,0.12), 0 32px 64px rgba(0,0,0,0.8), 0 0 120px rgba(59,130,246,0.06)'
        : '0 0 0 1px rgba(59,130,246,0.08), 0 32px 64px rgba(0,0,0,0.12)',
      animation: 'story-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      overflow: 'hidden',
      fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'",
    }}>
      <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
          borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 8px rgba(59,130,246,0.6)',
        }} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: `1px solid ${divider}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOpen style={{ width: 13, height: 13, color: '#60a5fa' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guided Tour</div>
            <div style={{ fontSize: 11, color: labelColor, marginTop: 1 }}>Step {step + 1} of {total} · {Math.round(progress)}% complete</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flex: 1, justifyContent: 'center', padding: '0 16px' }}>
          {total <= 12 && Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i === step ? '#3b82f6' : i < step ? 'rgba(59,130,246,0.4)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', flexShrink: 0,
            }} />
          ))}
        </div>

        <button onClick={onExit} style={{
          background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          <X style={{ width: 12, height: 12 }} /> Exit tour
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, minHeight: 0 }}
>
        <div style={{ flex: 1, minWidth: 0 }}>
          {current.insight && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, marginBottom: 12,
              background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
              border: '1px solid rgba(59,130,246,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Sparkles style={{ width: 9, height: 9 }} />
              {current.insight}
            </div>
          )}
          <div style={{ fontSize: 17, fontWeight: 700, color: titleColor, letterSpacing: '-0.025em', lineHeight: 1.3, marginBottom: 10 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 13, color: descColor, lineHeight: 1.75, letterSpacing: '-0.005em' }}>
            {current.description}
          </div>
          {step === 0 && story.summary && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Overview</div>
              <div style={{ fontSize: 12, color: descColor, lineHeight: 1.65 }}>{story.summary}</div>
            </div>
          )}
        </div>

        {current.highlight_nodes.length > 0 && (
          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Files in this step · {current.highlight_nodes.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5,maxHeight: 120, overflowY: 'auto' }}>
              {current.highlight_nodes.map((n, i) => {
                const p = getPalette(n);
                const filename = n.split('/').pop()!;
                const ext = filename.includes('.') ? filename.split('.').pop()! : '';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
                    background: isDark ? p.bg : p.bgLight,
                    border: `1px solid ${isDark ? p.border + '44' : p.borderLight}`,
                    animation: `story-node-in 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s both`,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: `0 0 6px ${p.dot}` }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? p.text : p.textLight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{filename}</span>
                    {ext && (
                      <div style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, flexShrink: 0, background: `${p.dot}22`, color: p.dot, border: `1px solid ${p.dot}33` }}>
                        {ext.toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {current.highlight_edges.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                  Connections · {current.highlight_edges.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
                  {current.highlight_edges.slice(0, 6).map(([src, tgt], i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 10, color: labelColor, padding: '4px 8px', borderRadius: 6,
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${divider}`,
                    }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>{src.split('/').pop()}</span>
                      <ArrowRight style={{ width: 9, height: 9, flexShrink: 0, color: '#3b82f6' }} />
                      <span style={{ color: isDark ? '#94a3b8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>{tgt.split('/').pop()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderTop: `1px solid ${divider}`,
      }}>
        <div style={{ fontSize: 11, color: labelColor }}>
          Use <kbd style={{ padding: '1px 5px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', fontSize: 10, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>←</kbd>
          {' '}<kbd style={{ padding: '1px 5px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', fontSize: 10, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>→</kbd>
          {' '}to navigate
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPrev} disabled={step === 0} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
            color: step === 0 ? (isDark ? '#1e293b' : '#e2e8f0') : (isDark ? '#94a3b8' : '#475569'),
            cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Previous
          </button>
          <button onClick={step === total - 1 ? onExit : onNext} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 8,
            border: 'none',
            background: step === total - 1 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            boxShadow: step === total - 1 ? '0 4px 16px rgba(16,185,129,0.35)' : '0 4px 16px rgba(59,130,246,0.35)',
            transition: 'all 0.2s',
          }}>
            {step === total - 1 ? <>Done ✓</> : <><span>Next step</span><ChevronRight style={{ width: 14, height: 14 }} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Story Graph ──────────────────────────────────────────────────────────────

function StoryGraph({ step, allFileNodes, allFileEdges, isDark, hoveredStoryNode, onHoverNode }: {
  step: StoryStep;
  allFileNodes: ArchNode[];
  allFileEdges: ArchEdge[];
  isDark: boolean;
  hoveredStoryNode: string | null;
  onHoverNode: (id: string | null) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 0);
    const t2 = setTimeout(() => { setScale(1); setPosition({ x: 0, y: 0 }); positionRef.current = { x: 0, y: 0 }; }, 0);
    const t3 = setTimeout(() => setVisible(true), 80);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step.title]);

  const stepNodeIds = new Set(step.highlight_nodes);
  const stepNodes = allFileNodes.filter(n => stepNodeIds.has(n.id));
  const layouted = layoutStoryNodes(stepNodes);
  const stepEdgeKeys = new Set(step.highlight_edges.map(([s, t]) => `${s}|||${t}`));
  const stepEdges = allFileEdges.filter(e =>
    stepNodeIds.has(e.source) && stepNodeIds.has(e.target) &&
    stepEdgeKeys.has(`${e.source}|||${e.target}`)
  );

  const hoveredConnected = useMemo(() => {
    if (!hoveredStoryNode) return new Set<string>();
    const ids = new Set<string>();
    stepEdges.forEach(e => {
      if (e.source === hoveredStoryNode) ids.add(e.target);
      if (e.target === hoveredStoryNode) ids.add(e.source);
    });
    return ids;
  }, [hoveredStoryNode, stepEdges]);

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
    setScale(s => Math.min(3, Math.max(0.2, s - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const bg = isDark ? '#0a0d12' : '#f8fafc';
  const dotGrid = isDark ? 'rgba(148,163,184,0.07)' : 'rgba(100,116,139,0.1)';
  const empty = isDark ? '#1e293b' : '#cbd5e1';
  const btnBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const legendBg = isDark ? 'rgba(10,13,18,0.92)' : 'rgba(255,255,255,0.95)';
  const btnColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div
      ref={containerRef}
      onMouseDown={e => { isDraggingRef.current = true; dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }; }}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease', background: bg }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: isDark ? 'radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.04) 0%, transparent 70%)' : 'radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.03) 0%, transparent 70%)' }} />

      {stepNodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: empty }}>No specific files highlighted for this step</span>
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${position.x}px,${position.y}px) scale(${scale})`, transformOrigin: 'center center' }}>
        <svg style={{ position: 'absolute', inset: 0, width: 5000, height: 4000, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}>
          <defs>
            {NODE_PALETTES.map((p, i) => (
              <marker key={i} id={`sa${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,1 L0,6 L6,3.5 z" fill={p.dot} opacity="0.9" />
              </marker>
            ))}
          </defs>
          {stepEdges.map((edge, i) => {
            const src = layouted.find(n => n.id === edge.source);
            const tgt = layouted.find(n => n.id === edge.target);
            if (!src || !tgt) return null;
            const sc = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
            const tc = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
            const sa = getEdgeAnchor(src, tc.x, tc.y, 6);
            const ta = getEdgeAnchor(tgt, sc.x, sc.y, 16);
            const p = getPalette(src.id);
            const pi = NODE_PALETTES.indexOf(p);
            const isHovered = hoveredStoryNode === edge.source || hoveredStoryNode === edge.target;
            return (
              <g key={i}>
                <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={isHovered ? 10 : 8} opacity={isHovered ? 0.18 : 0.08} />
                <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={isHovered ? 2.5 : 1.5} opacity={isHovered ? 1 : 0.6} markerEnd={`url(#sa${pi})`} />
              </g>
            );
          })}
        </svg>
        {layouted.map(node => {
          const p = getPalette(node.id);
          const label = node.id.split('/').pop()!;
          const ext = label.includes('.') ? label.split('.').pop()! : '';
          const isHov = hoveredStoryNode === node.id;
          const isConn = hoveredConnected.has(node.id);
          const isDim = !!hoveredStoryNode && !isHov && !isConn;
          return (
            <div
              key={node.id}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
              style={{
                position: 'absolute', zIndex: 1, left: node.x, top: node.y, width: node.width, height: node.height,
                borderRadius: 12,
                background: isHov || isConn ? (isDark ? p.bg : p.bgLight) : isDark ? 'rgba(15,20,30,0.9)' : 'rgba(255,255,255,0.95)',
                border: `1px solid ${isHov ? (isDark ? p.border : p.borderLight) : isConn ? (isDark ? p.border + '77' : p.borderLight + '77') : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isHov
                  ? `0 0 0 1px ${isDark ? p.border : p.borderLight}, 0 0 32px ${p.glow}, 0 8px 24px rgba(0,0,0,0.3)`
                  : isConn ? `0 0 16px ${p.glow}55` : isDark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.06)',
                opacity: isDim ? 0.2 : 1,
                transform: isHov ? 'scale(1.07) translateY(-2px)' : 'scale(1)',
                cursor: 'default',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px',
                userSelect: 'none', backdropFilter: 'blur(8px)',
                transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                animation: 'story-node-in 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: isHov || isConn ? `0 0 8px ${p.dot}` : 'none', animation: 'story-pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isHov || isConn ? (isDark ? p.text : p.textLight) : isDark ? '#94a3b8' : '#475569', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                {ext && <div style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${p.dot}22`, color: p.dot, border: `1px solid ${p.dot}44`, flexShrink: 0, marginLeft: 'auto' }}>{ext.toUpperCase()}</div>}
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#334155' : '#94a3b8', marginTop: 3, paddingLeft: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.id}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 10 }}>
        <button onClick={() => setScale(s => Math.max(0.2, s / 1.25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${btnBorder}`, background: legendBg, color: btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}><ZoomOut style={{ width: 13, height: 13 }} /></button>
        <button onClick={() => setScale(s => Math.min(3, s * 1.25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${btnBorder}`, background: legendBg, color: btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}><ZoomIn style={{ width: 13, height: 13 }} /></button>
        <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); positionRef.current = { x: 0, y: 0 }; }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${btnBorder}`, background: legendBg, color: btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}><Maximize2 style={{ width: 13, height: 13 }} /></button>
      </div>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: isDark ? 'rgba(10,13,18,0.85)' : 'rgba(255,255,255,0.9)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 8, padding: '6px 10px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
          <GitBranch style={{ width: 10, height: 10 }} />
          Hover nodes to see connections
        </div>
      </div>
    </div>
  );
}

// ─── Folder Boundary Layer ────────────────────────────────────────────────────
// Rendered as an SVG behind the file nodes to show folder groupings.

function FolderBoundaryLayer({
  boundaries,
  isDark,
}: {
  boundaries: FolderBoundary[];
  isDark: boolean;
}) {
  if (boundaries.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: 5000,
        height: 4000,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {boundaries.map(({ folder, x, y, width, height, palette }) => {
        // Shorten label for display: show last 2 path segments max
        const parts = folder.split('/');
        const displayLabel = parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : folder;
        // Label pill dimensions
        const charW = 7;
        const pillW = Math.min(displayLabel.length * charW + 20, width - 8);
        const pillH = 18;
        const pillX = x + 10;
        const pillY = y - pillH / 2;

        // Light mode overrides for the fill — slightly more visible
        const fillColor = isDark ? palette.fill : palette.fill.replace('0.05', '0.07');
        const strokeColor = isDark ? palette.stroke : palette.stroke.replace('0.28', '0.35');

        return (
          <g key={folder}>
            {/* Main boundary rect */}
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={14}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            {/* Label pill background — sits straddling the top border */}
            <rect
              x={pillX}
              y={pillY}
              width={pillW}
              height={pillH}
              rx={5}
              fill={palette.labelBg}
              stroke={palette.labelBorder}
              strokeWidth={0.75}
            />
            {/* Label text */}
            <text
              x={pillX + pillW / 2}
              y={pillY + pillH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontSize: 10,
                fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
                fontWeight: 700,
                fill: palette.label,
                letterSpacing: '0.02em',
              }}
            >
              {displayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ArchitecturePage({ repoId }: ArchitecturePageProps) {
  const isDark = useIsDark();
  const [graph, setGraph] = useState<ArchGraph | null>(null);
  const [loading, setLoading] = useState(!!repoId);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folder' | 'file'>('folder');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [storyStep, setStoryStep] = useState(0);
  const [inStoryMode, setInStoryMode] = useState(false);
  const [hoveredStoryNode, setHoveredStoryNode] = useState<string | null>(null);

  const T: Record<string, string> = {
    bg: isDark ? '#0a0d12' : '#f8fafc',
    headerBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    headerBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    iconBg: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
    iconBorder: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
    title: isDark ? '#e2e8f0' : '#0f172a',
    sub: isDark ? '#475569' : '#64748b',
    toggleBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    toggleBg: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    activeTabBg: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
    activeTabColor: isDark ? '#93c5fd' : '#1d4ed8',
    inactiveTabColor: isDark ? '#64748b' : '#94a3b8',
    btnBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    btnBg: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    btnColor: isDark ? '#64748b' : '#94a3b8',
    dotGrid: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(100,116,139,0.1)',
    nodeBg: isDark ? 'rgba(15,20,30,0.9)' : 'rgba(255,255,255,0.95)',
    nodeBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    nodeText: isDark ? '#94a3b8' : '#475569',
    nodeSub: isDark ? '#334155' : '#94a3b8',
    edgeIdle: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.15)',
    legendBg: isDark ? 'rgba(10,13,18,0.92)' : 'rgba(255,255,255,0.95)',
    legendBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    legendLabel: isDark ? '#334155' : '#94a3b8',
    panelBg: isDark ? 'rgba(10,13,18,0.98)' : 'rgba(255,255,255,0.98)',
    panelBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    panelTitle: isDark ? '#e2e8f0' : '#0f172a',
    connBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    connBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    connHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    connText: isDark ? '#94a3b8' : '#475569',
    connSub: isDark ? '#334155' : '#94a3b8',
    empty: isDark ? '#1e293b' : '#cbd5e1',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    const fetchGraph = async () => {
      try {
        const data = await api.architecture.getGraph(repoId);
        if (!cancelled) { setGraph(data); setError(null); }
      } catch {
        if (!cancelled) setError('Failed to load architecture graph');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchGraph();
    return () => { cancelled = true; };
  }, [repoId]);

  useEffect(() => { setSectionIndex(0); }, [graph, viewMode]);
  useEffect(() => { setSelectedNode(null); setHoveredNode(null); }, [viewMode]);

  const sections = useMemo<GraphSection[]>(() => {
    if (!graph) return [];
    if (viewMode === 'folder') return buildHierarchicalSections(graph.nodes, graph.edges);
    return buildHierarchicalSections(graph.file_nodes, graph.file_edges);
  }, [graph, viewMode]);

  const isPaginated = sections.length > 1;
  const currentSection = sections[Math.min(sectionIndex, sections.length - 1)] ?? null;

  const activeNodes: NodeWithPos[] = useMemo(() => {
    if (!currentSection) return [];
    if (viewMode === 'folder') return layoutFolder(currentSection.nodes, currentSection.edges);
    return layoutFiles(currentSection.nodes, currentSection.edges);
  }, [currentSection, viewMode]);

  const activeEdges = currentSection?.edges ?? [];

  // ─── Folder boundaries (file view only) ──────────────────────────────────
  const folderBoundaries = useMemo<FolderBoundary[]>(() => {
    if (viewMode !== 'file' || activeNodes.length === 0) return [];

    const PAD_X = 16;
    const PAD_TOP = 32;   // extra top clearance for label pill
    const PAD_BOTTOM = 14;

    const byFolder = new Map<string, NodeWithPos[]>();
    activeNodes.forEach(n => {
      const folder = getParentFolder(n.id);
      if (folder === '__root__') return; // don't wrap root-level files
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder)!.push(n);
    });

    // Only show boundaries for folders that have more than one file,
    // OR if there are multiple distinct folders (so even single-file folders
    // get shown to communicate structure).
    const folders = [...byFolder.keys()];
    const showAll = folders.length > 1;

    return folders
      .filter(folder => showAll || (byFolder.get(folder)?.length ?? 0) > 1)
      .map(folder => {
        const nodes = byFolder.get(folder)!;
        const minX = Math.min(...nodes.map(n => n.x)) - PAD_X;
        const minY = Math.min(...nodes.map(n => n.y)) - PAD_TOP;
        const maxX = Math.max(...nodes.map(n => n.x + n.width)) + PAD_X;
        const maxY = Math.max(...nodes.map(n => n.y + n.height)) + PAD_BOTTOM;
        return {
          folder,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          palette: getFolderPalette(folder),
        };
      });
  }, [viewMode, activeNodes]);

  const handleSectionChange = (i: number) => {
    setSectionIndex(i);
    setSelectedNode(null);
    setHoveredNode(null);
    setScale(1);
    const z = { x: 0, y: 0 };
    setPosition(z);
    positionRef.current = z;
  };

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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
  };

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

  const handleMainReset = useCallback(() => {
    setScale(1);
    const z = { x: 0, y: 0 };
    setPosition(z);
    positionRef.current = z;
  }, []);

  const startStory = async () => {
    if (!graph || !repoId) return;
    setStoryLoading(true);
    setStoryStep(0);
    try {
      const data = await api.ai.generateStory(repoId, graph.file_nodes.map(n => n.id), graph.file_edges);
      setStory(data);
      setInStoryMode(true);
      setSelectedNode(null);
      setHoveredNode(null);
    } catch (e) {
      console.error('Story generation failed', e);
    } finally {
      setStoryLoading(false);
    }
  };

  const exitStory = () => { setInStoryMode(false); setStory(null); setStoryStep(0); setHoveredStoryNode(null); };

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, borderRadius: 6, border: `1px solid ${T.btnBorder}`,
    background: T.btnBg, color: T.btnColor, cursor: 'pointer', transition: 'all 0.15s',
  };

  const selectedNodeData = selectedNode ? activeNodes.find(n => n.id === selectedNode) : null;
  const selectedConnections = selectedNode ? activeEdges.filter(e => e.source === selectedNode || e.target === selectedNode) : [];
  const folderFiles = selectedNodeData && viewMode === 'folder' && graph
    ? graph.file_nodes.filter(n => {
        const parts = n.id.split('/');
        const parentFolder = parts.length === 1 ? '__root__' : parts.slice(0, -1).join('/');
        return parentFolder === selectedNodeData.id;
      })
    : [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${T.headerBorder}`, background: T.headerBg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.iconBg, border: `1px solid ${T.iconBorder}` }}>
            <Network style={{ width: 16, height: 16, color: '#60a5fa' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.title, letterSpacing: '-0.02em' }}>
              {inStoryMode && story ? `Tour · ${story.steps[storyStep].title}` : 'Architecture Graph'}
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>
              {inStoryMode && story
                ? `Step ${storyStep + 1} of ${story.steps.length} · ${story.steps[storyStep].highlight_nodes.length} files highlighted`
                : graph
                  ? isPaginated && currentSection
                    ? `${currentSection.depthLabel} · section ${sectionIndex + 1} of ${sections.length}`
                    : `${graph.file_nodes.length} files · ${graph.file_edges.length} dependencies`
                  : 'dependency visualization'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {graph && !inStoryMode && (
            <button onClick={startStory} disabled={storyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: storyLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
              <Sparkles style={{ width: 13, height: 13 }} />
              {storyLoading ? 'Generating…' : 'Guided Tour'}
            </button>
          )}
          {inStoryMode && (
            <button onClick={exitStory}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <X style={{ width: 13, height: 13 }} /> Exit Tour
            </button>
          )}
          {!inStoryMode && (
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.toggleBorder}`, background: T.toggleBg }}>
              {(['folder', 'file'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: viewMode === mode ? T.activeTabBg : 'transparent', color: viewMode === mode ? T.activeTabColor : T.inactiveTabColor }}>
                  {mode === 'folder' ? <Layers style={{ width: 13, height: 13 }} /> : <File style={{ width: 13, height: 13 }} />}
                  {mode === 'folder' ? 'Folders' : 'Files'}
                </button>
              ))}
            </div>
          )}
          {!inStoryMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setScale(s => Math.max(0.15, s / 1.25))} style={btnStyle}><ZoomOut style={{ width: 14, height: 14 }} /></button>
              <span style={{ fontSize: 11, color: T.sub, width: 40, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s * 1.25))} style={btnStyle}><ZoomIn style={{ width: 14, height: 14 }} /></button>
              <button onClick={handleMainReset} style={btnStyle}><Maximize2 style={{ width: 14, height: 14 }} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {storyLoading && <CinematicLoader isDark={isDark} />}

        {inStoryMode && story && graph && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <StoryGraph
              key={storyStep}
              step={story.steps[storyStep]}
              allFileNodes={graph.file_nodes}
              allFileEdges={graph.file_edges}
              isDark={isDark}
              hoveredStoryNode={hoveredStoryNode}
              onHoverNode={setHoveredStoryNode}
            />
            <StoryCard
              story={story}
              step={storyStep}
              total={story.steps.length}
              onPrev={() => { setStoryStep(s => Math.max(0, s - 1)); setHoveredStoryNode(null); }}
              onNext={() => { setStoryStep(s => Math.min(story.steps.length - 1, s + 1)); setHoveredStoryNode(null); }}
              onExit={exitStory}
              isDark={isDark}
            />
          </div>
        )}

        {!inStoryMode && (
          <>
            <div ref={containerRef} onMouseDown={handleCanvasMouseDown}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none' }}>

              {/* Dot grid background */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${T.dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }} />

              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, border: '2px solid rgba(59,130,246,0.25)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'arch-spin 0.8s linear infinite' }} />
                    <div style={{ fontSize: 12, color: T.sub }}>Building dependency graph…</div>
                  </div>
                </div>
              )}
              {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span></div>}
              {!loading && !error && !repoId && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: T.empty }}>Select a repository to visualize its architecture</span></div>}

              {!loading && !error && graph && currentSection && (
                <div style={{ position: 'absolute', inset: 0, transform: `translate(${position.x}px,${position.y}px) scale(${scale})`, transformOrigin: 'center center' }}>

                  {/* ── Folder boundaries (file view, behind everything) ── */}
                  {viewMode === 'file' && (
                    <FolderBoundaryLayer boundaries={folderBoundaries} isDark={isDark} />
                  )}

                  {/* ── Edges ── */}
                  <svg style={{ position: 'absolute', inset: 0, width: 5000, height: 4000, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
                    <defs>
                      {NODE_PALETTES.map((p, i) => (
                        <marker key={i} id={`a${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                          <path d="M0,1 L0,6 L6,3.5 z" fill={p.dot} opacity="0.85" />
                        </marker>
                      ))}
                    </defs>
                    {activeEdges.map((edge, i) => {
                      const src = activeNodes.find(n => n.id === edge.source);
                      const tgt = activeNodes.find(n => n.id === edge.target);
                      if (!src || !tgt) return null;
                      const sc = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
                      const tc = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
                      const sa = getEdgeAnchor(src, tc.x, tc.y, 6);
                      const ta = getEdgeAnchor(tgt, sc.x, sc.y, 16);
                      const p = getPalette(src.id);
                      const pi = NODE_PALETTES.indexOf(p);
                      const hi = !!focusId && (edge.source === focusId || edge.target === focusId);
                      const dim = !!focusId && !hi;
                      return (
                        <g key={i}>
                          {hi && <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={9} opacity={0.13} />}
                          <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={hi ? p.dot : T.edgeIdle} strokeWidth={hi ? 2 : 1} opacity={dim ? 0.04 : hi ? 1 : 0.7} markerEnd={hi ? `url(#a${pi})` : undefined} style={{ transition: 'opacity 0.2s, stroke 0.2s' }} />
                        </g>
                      );
                    })}
                  </svg>

                  {/* ── File / folder nodes ── */}
                  {activeNodes.map(node => {
                    const p = getPalette(node.id);
                    const isHov = hoveredNode === node.id;
                    const isSel = selectedNode === node.id;
                    const isConn = focusConnected.has(node.id);
                    const isFoc = focusId === node.id;
                    const isDim = !!focusId && !isFoc && !isConn;
                    const label = viewMode === 'file' ? node.id.split('/').pop()! : node.id;
                    return (
                      <div key={node.id}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={e => { e.stopPropagation(); setSelectedNode(selectedNode === node.id ? null : node.id); }}
                        style={{
                          position: 'absolute', zIndex: 2,
                          left: node.x, top: node.y, width: node.width, height: node.height,
                          borderRadius: 10,
                          background: isFoc || isSel ? (isDark ? p.bg : p.bgLight) : isConn ? (isDark ? p.bg : p.bgLight) : T.nodeBg,
                          border: `1px solid ${isFoc || isSel ? (isDark ? p.border : p.borderLight) : isConn ? (isDark ? p.border + '88' : p.borderLight + '88') : T.nodeBorder}`,
                          boxShadow: isFoc || isSel ? `0 0 0 1px ${isDark ? p.border : p.borderLight}, 0 0 24px ${p.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` : isConn ? `0 0 14px ${p.glow}55` : isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.07)',
                          opacity: isDim ? 0.15 : 1, cursor: 'pointer',
                          transform: isHov || isSel ? 'scale(1.06)' : 'scale(1)',
                          transition: 'all 0.17s cubic-bezier(0.4,0,0.2,1)',
                          display: 'flex', flexDirection: 'column', justifyContent: 'center',
                          padding: '0 14px', userSelect: 'none', backdropFilter: 'blur(8px)',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: isFoc || isSel || isConn ? `0 0 7px ${p.dot}` : 'none' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.17s', color: isFoc || isSel || isConn ? (isDark ? p.text : p.textLight) : T.nodeText }}>
                            {label}
                          </span>
                        </div>
                        {viewMode === 'folder' && node.file_count > 0 && (
                          <div style={{ fontSize: 10, color: T.nodeSub, marginTop: 3, paddingLeft: 15 }}>{node.file_count} files</div>
                        )}
                        {viewMode === 'file' && node.id !== label && (
                          <div style={{ fontSize: 10, color: T.nodeSub, marginTop: 2, paddingLeft: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.id}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              {graph && (
                <div style={{ position: 'absolute', bottom: isPaginated ? 120 : 20, left: 20, zIndex: 10, background: T.legendBg, border: `1px solid ${T.legendBorder}`, borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(16px)', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 10, color: T.legendLabel, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {viewMode === 'file' ? 'File view' : 'Hover to highlight'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {viewMode === 'file' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{
                          width: 14, height: 10, borderRadius: 3,
                          border: '1px dashed rgba(59,130,246,0.5)',
                          background: 'rgba(59,130,246,0.06)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, color: T.sub }}>Folder group</span>
                      </div>
                    )}
                    {[{ label: 'Focused', color: '#3b82f6' }, { label: 'Connected', color: '#a855f7' }, { label: 'Active edge', color: '#10b981' }].map(it => (
                      <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, boxShadow: `0 0 4px ${it.color}` }} />
                        <span style={{ fontSize: 11, color: T.sub }}>{it.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {graph && isPaginated && (
                <SectionNavigator
                  sections={sections}
                  currentIndex={Math.min(sectionIndex, Math.max(sections.length - 1, 0))}
                  onGoTo={handleSectionChange}
                  isDark={isDark}
                />
              )}
            </div>

            {/* Details panel */}
            {selectedNodeData && (
              <div style={{ width: 284, flexShrink: 0, borderLeft: `1px solid ${T.panelBorder}`, background: T.panelBg, display: 'flex', flexDirection: 'column', animation: 'arch-slide 0.18s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.panelBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.panelTitle }}>Details</span>
                  <button onClick={() => setSelectedNode(null)} style={btnStyle}><X style={{ width: 14, height: 14 }} /></button>
                </div>
                <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    const p = getPalette(selectedNodeData.id);
                    // Show parent folder badge in file view
                    const parentFolder = viewMode === 'file' ? getParentFolder(selectedNodeData.id) : null;
                    const folderPal = parentFolder && parentFolder !== '__root__' ? getFolderPalette(parentFolder) : null;
                    return (
                      <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 8, background: isDark ? p.bg : p.bgLight, border: `1px solid ${isDark ? p.border : p.borderLight}44` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, boxShadow: `0 0 6px ${p.dot}`, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? p.text : p.textLight, wordBreak: 'break-all' }}>{selectedNodeData.id}</span>
                        </div>
                        {viewMode === 'folder' && <div style={{ fontSize: 11, color: T.sub, paddingLeft: 16 }}>{selectedNodeData.file_count} files</div>}
                        {folderPal && parentFolder && (
                          <div style={{ marginTop: 8, paddingLeft: 16 }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: folderPal.labelBg, color: folderPal.label,
                              border: `1px solid ${folderPal.labelBorder}`,
                            }}>
                              <Layers style={{ width: 9, height: 9 }} />
                              {parentFolder}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {selectedConnections.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 10, color: T.legendLabel, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        Connections ({selectedConnections.length})
                        {isPaginated && <span style={{ color: T.sub, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}> · this section</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedConnections.map((edge, i) => {
                          const isSrc = edge.source === selectedNode;
                          const otherId = isSrc ? edge.target : edge.source;
                          const p = getPalette(otherId);
                          return (
                            <button key={i} onClick={() => setSelectedNode(otherId)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, border: `1px solid ${T.connBorder}`, background: T.connBg, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = T.connHover)}
                              onMouseLeave={e => (e.currentTarget.style.background = T.connBg)}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 11, color: T.connText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherId.split('/').pop()}</div>
                                {otherId.includes('/') && <div style={{ fontSize: 10, color: T.connSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherId}</div>}
                              </div>
                              <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, flexShrink: 0, background: isSrc ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: isSrc ? '#10b981' : '#ef4444', border: `1px solid ${isSrc ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                {isSrc ? 'imports' : 'used by'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    folderFiles.length === 0 && <div style={{ fontSize: 12, color: T.empty, textAlign: 'center', marginTop: 20 }}>No dependencies found</div>
                  )}
                  {viewMode === 'folder' && folderFiles.length > 0 && (
                    <div style={{ marginTop: selectedConnections.length > 0 ? 20 : 0 }}>
                      <div style={{ fontSize: 10, color: T.legendLabel, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Files ({folderFiles.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {folderFiles.map((file, i) => {
                          const filename = file.id.split('/').pop()!;
                          const ext = filename.includes('.') ? filename.split('.').pop()! : '';
                          const extColors: Record<string, string> = { ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#61dafb', py: '#3776ab', css: '#264de4', scss: '#c6538c', json: '#f59e0b', md: '#64748b', html: '#e34c26', sh: '#4eaa25' };
                          const extColor = extColors[ext] || '#64748b';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.connBorder}`, background: T.connBg }}>
                              <div style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, flexShrink: 0, minWidth: 26, textAlign: 'center', background: `${extColor}18`, color: extColor, border: `1px solid ${extColor}33` }}>
                                {ext ? ext.toUpperCase() : '?'}
                              </div>
                              <span style={{ fontSize: 11, color: T.connText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes arch-spin { to { transform: rotate(360deg); } }
        @keyframes arch-slide { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes story-slide-up { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes story-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes story-progress { from { width: 0%; } to { width: 100%; } }
        @keyframes story-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes story-node-in { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}