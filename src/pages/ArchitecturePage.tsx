import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Network, ZoomIn, ZoomOut, Maximize2, Layers, File, X, BookOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_PALETTES = [
  { bg: 'rgba(59,130,246,0.12)', bgLight: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.6)', borderLight: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.35)', text: '#93c5fd', textLight: '#1d4ed8', dot: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.12)', bgLight: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.6)', borderLight: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.35)', text: '#6ee7b7', textLight: '#065f46', dot: '#10b981' },
  { bg: 'rgba(245,158,11,0.12)', bgLight: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.6)', borderLight: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.35)', text: '#fcd34d', textLight: '#92400e', dot: '#f59e0b' },
  { bg: 'rgba(239,68,68,0.12)',  bgLight: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.6)',  borderLight: 'rgba(239,68,68,0.35)',  glow: 'rgba(239,68,68,0.35)',  text: '#fca5a5', textLight: '#991b1b', dot: '#ef4444' },
  { bg: 'rgba(168,85,247,0.12)', bgLight: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.6)', borderLight: 'rgba(168,85,247,0.35)', glow: 'rgba(168,85,247,0.35)', text: '#d8b4fe', textLight: '#6b21a8', dot: '#a855f7' },
  { bg: 'rgba(236,72,153,0.12)', bgLight: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.6)', borderLight: 'rgba(236,72,153,0.35)', glow: 'rgba(236,72,153,0.35)', text: '#f9a8d4', textLight: '#9d174d', dot: '#ec4899' },
  { bg: 'rgba(20,184,166,0.12)', bgLight: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.6)', borderLight: 'rgba(20,184,166,0.35)', glow: 'rgba(20,184,166,0.35)', text: '#99f6e4', textLight: '#134e4a', dot: '#14b8a6' },
];

const CINEMATIC_PHRASES = [
  'Mapping the codebase...',
  'Tracing dependencies...',
  'Identifying entry points...',
  'Analysing import chains...',
  'Finding the core modules...',
  'Building your guided tour...',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPalette(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return NODE_PALETTES[hash % NODE_PALETTES.length];
}

function layoutFolder(nodes: ArchNode[]): NodeWithPos[] {
  const W = 160, H = 72;
  const cx = 600, cy = 380, r = Math.max(200, nodes.length * 45);
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return { ...node, x: cx + r * Math.cos(angle) - W / 2, y: cy + r * Math.sin(angle) - H / 2, width: W, height: H };
  });
}

function layoutFiles(nodes: ArchNode[], edges: ArchEdge[]): NodeWithPos[] {
  const W = 180, H = 56, COL_W = 230, ROW_H = 82;
  const inDegree: Record<string, number> = {};
  nodes.forEach(n => { inDegree[n.id] = 0; });
  edges.forEach(e => { if (inDegree[e.target] !== undefined) inDegree[e.target]++; });
  const layers: string[][] = [];
  const assigned = new Set<string>();
  let current = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  if (current.length === 0) current = [nodes[0]?.id].filter(Boolean);
  while (current.length > 0) {
    layers.push(current);
    current.forEach(id => assigned.add(id));
    const next: string[] = [];
    edges.forEach(e => { if (current.includes(e.source) && !assigned.has(e.target)) next.push(e.target); });
    current = [...new Set(next)];
  }
  nodes.forEach(n => { if (!assigned.has(n.id)) layers.push([n.id]); });
  const posMap: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, col) => {
    const totalH = layer.length * ROW_H;
    const startY = 380 - totalH / 2;
    layer.forEach((id, row) => { posMap[id] = { x: 80 + col * COL_W, y: startY + row * ROW_H }; });
  });
  return nodes.map(n => ({ ...n, x: posMap[n.id]?.x ?? 80, y: posMap[n.id]?.y ?? 80, width: W, height: H }));
}

function layoutStoryNodes(nodes: ArchNode[]): NodeWithPos[] {
  const W = 200, H = 64;
  const COLS = Math.min(nodes.length, Math.ceil(Math.sqrt(nodes.length * 1.5)));
  const GAP_X = 260, GAP_Y = 110;
  const totalCols = COLS || 1;
  const totalRows = Math.ceil(nodes.length / totalCols);
  return nodes.map((node, i) => {
    const col = i % totalCols;
    const row = Math.floor(i / totalCols);
    const totalW = totalCols * GAP_X - (GAP_X - W);
    const totalH = totalRows * GAP_Y;
    return { ...node, x: 600 - totalW / 2 + col * GAP_X, y: 300 - totalH / 2 + row * GAP_Y, width: W, height: H };
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onExit]);

  return (
    <div style={{
      position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, width: 480, maxWidth: 'calc(100vw - 48px)',
      background: isDark ? 'rgba(10,13,20,0.97)' : 'rgba(255,255,255,0.98)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: 16, backdropFilter: 'blur(20px)',
      boxShadow: isDark ? '0 0 0 1px rgba(59,130,246,0.15),0 24px 48px rgba(0,0,0,0.7)' : '0 0 0 1px rgba(59,130,246,0.1),0 24px 48px rgba(0,0,0,0.15)',
      animation: 'story-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen style={{ width: 11, height: 11, color: '#60a5fa' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            Guided Tour · {step + 1} / {total}
          </span>
        </div>
        <button onClick={onExit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#475569' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
          <X style={{ width: 12, height: 12 }} /> Exit
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', maxHeight: 240, overflowY: 'auto' }}>
        {current.insight && (
          <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 8, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
            {current.insight}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.35, marginBottom: 8 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.65 }}>
          {current.description}
        </div>
        {current.highlight_nodes.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
            {current.highlight_nodes.map((n, i) => {
              const p = getPalette(n);
              return (
                <div key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: isDark ? p.bg : p.bgLight, border: `1px solid ${isDark ? p.border + '55' : p.borderLight}`, color: isDark ? p.text : p.textLight, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {n.split('/').pop()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', maxWidth: 200 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === step ? 14 : 5, height: 5, borderRadius: 3, background: i === step ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', flexShrink: 0 }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onPrev} disabled={step === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', color: step === 0 ? (isDark ? '#1e293b' : '#e2e8f0') : (isDark ? '#94a3b8' : '#475569'), cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
          </button>
          <button onClick={step === total - 1 ? onExit : onNext}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: 'none', background: step === total - 1 ? 'rgba(16,185,129,0.9)' : '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {step === total - 1 ? 'Done ✓' : <><span>Next</span><ChevronRight style={{ width: 14, height: 14 }} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Isolated Story Graph ─────────────────────────────────────────────────────

function StoryGraph({ step, allFileNodes, allFileEdges, isDark, T }: {
  step: StoryStep;
  allFileNodes: ArchNode[];
  allFileEdges: ArchEdge[];
  isDark: boolean;
  T: Record<string, string>;
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
  const t2 = setTimeout(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  }, 0);
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

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newPos = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
      positionRef.current = newPos;
      setPosition({ ...newPos });
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

  const handleReset = useCallback(() => {
    setScale(1);
    const z = { x: 0, y: 0 };
    setPosition(z);
    positionRef.current = z;
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={e => {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
      }}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease', background: T.bg }}
    >
      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${T.dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }} />

      {stepNodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: T.empty }}>No specific files highlighted for this step</span>
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
            return (
              <g key={i}>
                <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={8} opacity={0.12} />
                <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={2} opacity={0.9} markerEnd={`url(#sa${pi})`} />
              </g>
            );
          })}
        </svg>

        {layouted.map(node => {
          const p = getPalette(node.id);
          const label = node.id.split('/').pop()!;
          const ext = label.includes('.') ? label.split('.').pop()! : '';
          return (
            <div key={node.id} style={{
              position: 'absolute', zIndex: 1,
              left: node.x, top: node.y, width: node.width, height: node.height,
              borderRadius: 12,
              background: isDark ? p.bg : p.bgLight,
              border: `1px solid ${isDark ? p.border : p.borderLight}`,
              boxShadow: `0 0 0 1px ${isDark ? p.border : p.borderLight}, 0 0 32px ${p.glow}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '0 16px', userSelect: 'none', backdropFilter: 'blur(8px)',
              animation: 'story-node-in 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: `0 0 8px ${p.dot}`, animation: 'story-pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? p.text : p.textLight, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
                {ext && (
                  <div style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${p.dot}22`, color: p.dot, border: `1px solid ${p.dot}44`, flexShrink: 0, marginLeft: 'auto' }}>
                    {ext.toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#334155' : '#94a3b8', marginTop: 3, paddingLeft: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.id}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 10 }}>
        <button onClick={() => setScale(s => Math.max(0.2, s / 1.25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${T.btnBorder}`, background: T.legendBg, color: T.btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <ZoomOut style={{ width: 13, height: 13 }} />
        </button>
        <button onClick={() => setScale(s => Math.min(3, s * 1.25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${T.btnBorder}`, background: T.legendBg, color: T.btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <ZoomIn style={{ width: 13, height: 13 }} />
        </button>
        <button onClick={handleReset} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${T.btnBorder}`, background: T.legendBg, color: T.btnColor, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <Maximize2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
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

  const [storyLoading, setStoryLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [storyStep, setStoryStep] = useState(0);
  const [inStoryMode, setInStoryMode] = useState(false);

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
    dotGrid: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)',
    nodeBg: isDark ? 'rgba(15,20,30,0.9)' : 'rgba(255,255,255,0.95)',
    nodeBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    nodeText: isDark ? '#94a3b8' : '#475569',
    nodeSub: isDark ? '#334155' : '#94a3b8',
    edgeIdle: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.18)',
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

  const activeNodes: NodeWithPos[] = (() => {
    if (!graph) return [];
    const raw = viewMode === 'folder' ? graph.nodes : graph.file_nodes;
    const rawEdges = viewMode === 'folder' ? graph.edges : graph.file_edges;
    return viewMode === 'folder' ? layoutFolder(raw) : layoutFiles(raw, rawEdges);
  })();
  const activeEdges = graph ? (viewMode === 'folder' ? graph.edges : graph.file_edges) : [];

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
      positionRef.current = newPos;
      setPosition({ ...newPos });
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

  const exitStory = () => { setInStoryMode(false); setStory(null); setStoryStep(0); };

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace" }}>

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
                ? `Step ${storyStep + 1} of ${story.steps.length} · ${story.steps[storyStep].highlight_nodes.length} files`
                : graph ? `${graph.file_nodes.length} files · ${graph.file_edges.length} dependencies` : 'dependency visualization'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {graph && !inStoryMode && (
            <button onClick={startStory} disabled={storyLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: storyLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
              <Sparkles style={{ width: 13, height: 13 }} />
              {storyLoading ? 'Generating...' : 'Guided Tour'}
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
                <button key={mode} onClick={() => { setViewMode(mode); setSelectedNode(null); setHoveredNode(null); }}
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

        {/* Cinematic loader */}
        {storyLoading && <CinematicLoader isDark={isDark} />}

        {/* Story mode */}
        {inStoryMode && story && graph && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <StoryGraph
              key={storyStep}
              step={story.steps[storyStep]}
              allFileNodes={graph.file_nodes}
              allFileEdges={graph.file_edges}
              isDark={isDark}
              T={T}
            />
            <StoryCard
              story={story}
              step={storyStep}
              total={story.steps.length}
              onPrev={() => setStoryStep(s => Math.max(0, s - 1))}
              onNext={() => setStoryStep(s => Math.min(story.steps.length - 1, s + 1))}
              onExit={exitStory}
              isDark={isDark}
            />
          </div>
        )}

        {/* Normal graph mode */}
        {!inStoryMode && (
          <>
            <div ref={containerRef} onMouseDown={handleCanvasMouseDown}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none' }}>

              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${T.dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', backgroundPosition: `${position.x % 28}px ${position.y % 28}px` }} />

              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, border: '2px solid rgba(59,130,246,0.25)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'arch-spin 0.8s linear infinite' }} />
                    <div style={{ fontSize: 12, color: T.sub }}>Building dependency graph...</div>
                  </div>
                </div>
              )}
              {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span></div>}
              {!loading && !error && !repoId && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: T.empty }}>Select a repository to visualize its architecture</span></div>}

              {!loading && !error && graph && (
                <div style={{ position: 'absolute', inset: 0, transform: `translate(${position.x}px,${position.y}px) scale(${scale})`, transformOrigin: 'center center' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: 5000, height: 4000, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}>
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
                          {hi && <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={p.dot} strokeWidth={9} opacity={0.12} />}
                          <path d={getCurvedPath(sa.x, sa.y, ta.x, ta.y)} fill="none" stroke={hi ? p.dot : T.edgeIdle} strokeWidth={hi ? 2 : 1} opacity={dim ? 0.04 : hi ? 1 : 0.7} markerEnd={hi ? `url(#a${pi})` : undefined} style={{ transition: 'opacity 0.2s, stroke 0.2s' }} />
                        </g>
                      );
                    })}
                  </svg>

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
                          position: 'absolute', zIndex: 1,
                          left: node.x, top: node.y, width: node.width, height: node.height,
                          borderRadius: 10,
                          background: isFoc || isSel ? (isDark ? p.bg : p.bgLight) : isConn ? (isDark ? p.bg : p.bgLight) : T.nodeBg,
                          border: `1px solid ${isFoc || isSel ? (isDark ? p.border : p.borderLight) : isConn ? (isDark ? p.border + '88' : p.borderLight + '88') : T.nodeBorder}`,
                          boxShadow: isFoc || isSel ? `0 0 0 1px ${isDark ? p.border : p.borderLight}, 0 0 24px ${p.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` : isConn ? `0 0 14px ${p.glow}55` : isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.07)',
                          opacity: isDim ? 0.15 : 1,
                          cursor: 'pointer',
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

              {graph && (
                <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, background: T.legendBg, border: `1px solid ${T.legendBorder}`, borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(16px)', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 10, color: T.legendLabel, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hover to highlight</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[{ label: 'Focused', color: '#3b82f6' }, { label: 'Connected', color: '#a855f7' }, { label: 'Active edge', color: '#10b981' }].map(it => (
                      <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, boxShadow: `0 0 4px ${it.color}` }} />
                        <span style={{ fontSize: 11, color: T.sub }}>{it.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedNodeData && (
              <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${T.panelBorder}`, background: T.panelBg, display: 'flex', flexDirection: 'column', animation: 'arch-slide 0.18s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.panelBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.panelTitle }}>Details</span>
                  <button onClick={() => setSelectedNode(null)} style={btnStyle}><X style={{ width: 14, height: 14 }} /></button>
                </div>
                <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    const p = getPalette(selectedNodeData.id);
                    return (
                      <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 8, background: isDark ? p.bg : p.bgLight, border: `1px solid ${isDark ? p.border : p.borderLight}44` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, boxShadow: `0 0 6px ${p.dot}`, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? p.text : p.textLight, wordBreak: 'break-all' }}>{selectedNodeData.id}</span>
                        </div>
                        {viewMode === 'folder' && <div style={{ fontSize: 11, color: T.sub, paddingLeft: 16 }}>{selectedNodeData.file_count} files</div>}
                      </div>
                    );
                  })()}
                  {selectedConnections.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 10, color: T.legendLabel, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Connections ({selectedConnections.length})</div>
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
        @keyframes story-slide-up { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes story-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes story-progress { from { width: 0%; } to { width: 100%; } }
        @keyframes story-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes story-node-in { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}