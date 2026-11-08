import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Copy,
  Database,
  FileCode2,
  GitBranch,
  Layers,
  Lock,
  Maximize,
  Minimize,
  Network,
  Package,
  RefreshCw,
  Scan,
  Search,
  Server,
  Sparkles,
  Workflow,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type {
  StorybookLearn,
  StorybookNodeKind,
  StorybookFlow,
  StorybookApiGroup,
  StorybookCodebase,
  StorybookOverview,
} from "@/types"

// ─── Shared building blocks ────────────────────────────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** Same selectable-card look as the run options in SetupStep. */
const CARD_TRIGGER = cn(
  "group h-auto h-full flex-col items-start justify-start gap-2 whitespace-normal rounded-lg border-2 border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-none transition-colors",
  "hover:border-primary/50 hover:bg-accent/50",
  "data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm",
  "dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/20"
)

const ASIDE_SHELL =
  "overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy"}
      className="shrink-0 text-zinc-100 hover:bg-zinc-800 hover:text-white"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  if (!code) return null
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
      {label && (
        <div className="border-b border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400">{label}</div>
      )}
      <div className="flex items-start justify-between gap-2 py-0.5 pl-3 pr-1">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap py-2 font-mono text-xs leading-relaxed text-zinc-50">
          <code>{code}</code>
        </pre>
        <CopyButton text={code} />
      </div>
    </div>
  )
}

function AsidePanel({
  icon: Icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: LucideIcon
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={ASIDE_SHELL}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left outline-none focus-visible:bg-accent/40">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <CardTitle className="text-base">{title}</CardTitle>
        {count != null && (
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border">{children}</CollapsibleContent>
    </Collapsible>
  )
}

function SectionHeading({ icon: Icon, title, count }: { icon: LucideIcon; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <h3 className="text-base font-semibold">{title}</h3>
      {count != null && <Badge variant="secondary">{count}</Badge>}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  )
}

function TabCard({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <span className="flex w-full items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug">{title}</span>
        <span className="block text-xs font-normal text-muted-foreground group-data-[state=active]:text-foreground/80">
          {hint}
        </span>
      </span>
    </span>
  )
}

const METHOD_STYLES: Record<string, string> = {
  GET: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POST: "border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PUT: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PATCH: "border-violet-500/30 bg-violet-500/15 text-violet-600 dark:text-violet-400",
  DELETE: "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400",
}

// ─── Flow graph ────────────────────────────────────────────────────────────────

type FlowNode = StorybookFlow["graph"]["nodes"][number]
type FlowEdge = StorybookFlow["graph"]["edges"][number]

// Static class strings so Tailwind can see them. No hard-coded hex, so light and dark both work.
const KIND_META: Record<
  StorybookNodeKind,
  { label: string; icon: LucideIcon; chip: string; accent: string; ring: string; dot: string; stroke: string; fill: string }
> = {
  feature: {
    label: "Feature",
    icon: Sparkles,
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    accent: "border-l-violet-500",
    ring: "ring-violet-500/50",
    dot: "bg-violet-500",
    stroke: "stroke-violet-500",
    fill: "fill-violet-500",
  },
  component: {
    label: "Component",
    icon: Boxes,
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    accent: "border-l-sky-500",
    ring: "ring-sky-500/50",
    dot: "bg-sky-500",
    stroke: "stroke-sky-500",
    fill: "fill-sky-500",
  },
  function: {
    label: "Function",
    icon: Workflow,
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    accent: "border-l-emerald-500",
    ring: "ring-emerald-500/50",
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    fill: "fill-emerald-500",
  },
  service: {
    label: "Service",
    icon: Server,
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    accent: "border-l-amber-500",
    ring: "ring-amber-500/50",
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
    fill: "fill-amber-500",
  },
  database: {
    label: "Database",
    icon: Database,
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    accent: "border-l-rose-500",
    ring: "ring-rose-500/50",
    dot: "bg-rose-500",
    stroke: "stroke-rose-500",
    fill: "fill-rose-500",
  },
  external: {
    label: "External",
    icon: Network,
    chip: "border-zinc-400/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    accent: "border-l-zinc-400",
    ring: "ring-zinc-400/50",
    dot: "bg-zinc-400",
    stroke: "stroke-zinc-400",
    fill: "fill-zinc-400",
  },
}

const KIND_ORDER: StorybookNodeKind[] = ["feature", "component", "function", "service", "database", "external"]
const metaOf = (k: string) => KIND_META[k as StorybookNodeKind] ?? KIND_META.external
const kindRank = (k: string) => {
  const i = KIND_ORDER.indexOf(k as StorybookNodeKind)
  return i === -1 ? KIND_ORDER.length : i
}

const NODE_W = 208
const NODE_H = 60
const COL_GAP = 96
const ROW_GAP = 24
const PAD = 48
const MIN_K = 0.25
const MAX_K = 2.5

type Point = { x: number; y: number }
type Layout = { pos: Record<string, Point>; width: number; height: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Left-to-right layered layout. Columns come from the edge direction (callers on the left,
 * what they call on the right), cycles are broken safely, and rows are ordered to cut crossings.
 */
function computeLayout(nodes: FlowNode[], edges: FlowEdge[]): Layout {
  const ids = new Set(nodes.map((n) => n.id))
  const links: Array<[string, string]> = []
  for (const e of edges) if (ids.has(e.from) && ids.has(e.to) && e.from !== e.to) links.push([e.from, e.to])
  // A parent sits left of its children, even when no edge says so.
  for (const n of nodes) if (n.parent && ids.has(n.parent) && n.parent !== n.id) links.push([n.parent, n.id])

  const out = new Map<string, Array<[string, number]>>()
  const incoming = new Map<string, number>()
  for (const n of nodes) out.set(n.id, [])
  links.forEach(([a, b], i) => {
    out.get(a)!.push([b, i])
    incoming.set(b, (incoming.get(b) ?? 0) + 1)
  })

  // Find back edges so cycles cannot stretch the layout.
  const state = new Map<string, 1 | 2>()
  const back = new Set<number>()
  const visit = (u: string) => {
    state.set(u, 1)
    for (const [v, i] of out.get(u)!) {
      const s = state.get(v)
      if (s === 1) back.add(i)
      else if (!s) visit(v)
    }
    state.set(u, 2)
  }
  for (const n of nodes) if (!incoming.get(n.id) && !state.has(n.id)) visit(n.id)
  for (const n of nodes) if (!state.has(n.id)) visit(n.id)

  const forward = links.filter((_, i) => !back.has(i))
  const layer = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  if (links.length === 0) {
    nodes.forEach((n) => layer.set(n.id, kindRank(n.kind)))
  } else {
    for (let pass = 0; pass < nodes.length; pass++) {
      let changed = false
      for (const [a, b] of forward) {
        const next = layer.get(a)! + 1
        if (next > layer.get(b)!) {
          layer.set(b, next)
          changed = true
        }
      }
      if (!changed) break
    }
  }

  const used = Array.from(new Set(layer.values())).sort((a, b) => a - b)
  const colOf = new Map(used.map((v, i) => [v, i]))
  const cols: FlowNode[][] = used.map(() => [])
  const byKindThenLabel = (a: FlowNode, b: FlowNode) =>
    kindRank(a.kind) - kindRank(b.kind) || a.label.localeCompare(b.label)
  for (const n of [...nodes].sort(byKindThenLabel)) cols[colOf.get(layer.get(n.id)!)!].push(n)

  const preds = new Map<string, string[]>()
  for (const [a, b] of forward) preds.set(b, [...(preds.get(b) ?? []), a])
  const row = new Map<string, number>()
  cols.forEach((col, c) => {
    if (c > 0) {
      const score = (n: FlowNode) => {
        const rs = (preds.get(n.id) ?? []).map((p) => row.get(p)).filter((r): r is number => r !== undefined)
        return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : Infinity
      }
      col.sort((a, b) => {
        const sa = score(a)
        const sb = score(b)
        if (sa !== sb) return sa < sb ? -1 : 1
        return byKindThenLabel(a, b)
      })
    }
    col.forEach((n, i) => row.set(n.id, i))
  })

  const maxRows = Math.max(1, ...cols.map((c) => c.length))
  const colHeight = maxRows * NODE_H + (maxRows - 1) * ROW_GAP
  const pos: Record<string, Point> = {}
  cols.forEach((col, c) => {
    const h = col.length * NODE_H + (col.length - 1) * ROW_GAP
    const offset = (colHeight - h) / 2
    col.forEach((n, i) => {
      pos[n.id] = { x: PAD + c * (NODE_W + COL_GAP), y: PAD + offset + i * (NODE_H + ROW_GAP) }
    })
  })

  return {
    pos,
    width: PAD * 2 + cols.length * NODE_W + Math.max(0, cols.length - 1) * COL_GAP,
    height: PAD * 2 + colHeight,
  }
}

function edgePath(a: Point, b: Point) {
  if (b.x > a.x + NODE_W / 2) {
    const sx = a.x + NODE_W
    const sy = a.y + NODE_H / 2
    const tx = b.x - 2
    const ty = b.y + NODE_H / 2
    const dx = Math.max(24, (tx - sx) * 0.5)
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`
  }
  // Same column or pointing backwards: leave from the bottom or top edge.
  const cx = a.x + NODE_W / 2
  const tx = b.x + NODE_W / 2
  if (b.y === a.y) {
    const y = a.y + NODE_H
    return `M ${cx} ${y} C ${cx} ${y + 48}, ${tx} ${y + 48}, ${tx} ${y + 2}`
  }
  const down = b.y > a.y
  const sy = down ? a.y + NODE_H : a.y
  const ty = down ? b.y - 2 : b.y + NODE_H + 2
  const dy = (ty - sy) * 0.5
  return `M ${cx} ${sy} C ${cx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`
}

type View = { x: number; y: number; k: number }

function FlowGraph({ flow, showTitle }: { flow: StorybookFlow; showTitle: boolean }) {
  const nodes = flow.graph.nodes
  const edges = flow.graph.edges
  const steps = flow.steps ?? []
  const risks = flow.risks ?? []

  const layout = React.useMemo(() => computeLayout(nodes, edges), [nodes, edges])
  const byId = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const uid = React.useId().replace(/:/g, "")

  const containerRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 })
  const [view, setView] = React.useState<View>({ x: 0, y: 0, k: 1 })
  const [panning, setPanning] = React.useState(false)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState<string | null>(null)
  const [nativeFull, setNativeFull] = React.useState(false)
  const [fakeFull, setFakeFull] = React.useState(false)
  const isFull = nativeFull || fakeFull

  const fit = React.useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    const k = clamp(Math.min(cw / layout.width, ch / layout.height), MIN_K, 1)
    setView({ k, x: (cw - layout.width * k) / 2, y: (ch - layout.height * k) / 2 })
  }, [layout])

  React.useLayoutEffect(() => {
    fit()
  }, [fit])

  // Real fullscreen where the browser allows it, otherwise a fixed overlay (e.g. iPhone Safari).
  const toggleFull = React.useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (fakeFull) {
      setFakeFull(false)
      return
    }
    if (typeof el.requestFullscreen === "function") {
      try {
        await el.requestFullscreen()
        return
      } catch {
        /* fall through to the overlay */
      }
    }
    setFakeFull(true)
  }, [fakeFull])

  React.useEffect(() => {
    const onChange = () => setNativeFull(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  React.useEffect(() => {
    if (!fakeFull) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFakeFull(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [fakeFull])

  // Re-centre once the canvas has its new size.
  React.useEffect(() => {
    const t = setTimeout(fit, 60)
    return () => clearTimeout(t)
  }, [isFull, fit])

  const zoomAt = React.useCallback((factor: number, cx?: number, cy?: number) => {
    const el = containerRef.current
    if (!el) return
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K)
      const r = k / v.k
      return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }
    })
  }, [])

  // Zoom only with Ctrl/Cmd + scroll (or a trackpad pinch), so the page still scrolls normally.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d.active) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      if (!d.moved) {
        if (Math.hypot(dx, dy) < 4) return
        d.moved = true
        setPanning(true)
      }
      setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }))
    }
    const up = () => {
      if (!drag.current.active) return
      drag.current.active = false
      setPanning(false)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [])

  const focus = hovered ?? selected
  const linked = React.useMemo(() => {
    const s = new Set<string>()
    if (!focus) return s
    for (const e of edges) {
      if (e.from === focus) s.add(e.to)
      if (e.to === focus) s.add(e.from)
    }
    return s
  }, [focus, edges])

  const selectedNode = selected ? byId.get(selected) ?? null : null
  const isNode = (n: FlowNode | undefined): n is FlowNode => !!n
  const outgoing = selected ? edges.filter((e) => e.from === selected).map((e) => byId.get(e.to)).filter(isNode) : []
  const incoming = selected ? edges.filter((e) => e.to === selected).map((e) => byId.get(e.from)).filter(isNode) : []
  const kindsPresent = KIND_ORDER.filter((k) => nodes.some((n) => n.kind === k))

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Canvas */}
      <div className="min-w-0 space-y-3">
        {(showTitle || flow.description) && (
          <div className="space-y-1">
            {showTitle && <h3 className="text-base font-semibold">{flow.name}</h3>}
            {flow.description && <p className="max-w-prose text-sm text-muted-foreground">{flow.description}</p>}
          </div>
        )}

        {nodes.length === 0 ? (
          <EmptyState icon={Workflow} title="This flow has no nodes" hint="Regenerate the guide to try again." />
        ) : (
          <div
            ref={containerRef}
            role="group"
            aria-label={`${flow.name} diagram`}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
            }}
            onClick={() => {
              if (!drag.current.moved) setSelected(null)
            }}
            className={cn(
              "relative touch-pan-y select-none overflow-hidden border-border bg-background",
              isFull
                ? cn("h-screen w-screen rounded-none border-0", fakeFull && "fixed inset-0 z-50")
                : "h-[26rem] rounded-xl border sm:h-[32rem]",
              panning ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-muted/30 text-foreground/10"
              style={{
                backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
                backgroundPosition: `${view.x}px ${view.y}px`,
              }}
            />

            <div
              className="absolute left-0 top-0 will-change-transform"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
                transformOrigin: "0 0",
              }}
            >
              <svg
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                width={layout.width}
                height={layout.height}
                aria-hidden
              >
                <defs>
                  {KIND_ORDER.map((k) => (
                    <marker
                      key={k}
                      id={`${uid}-${k}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M0,0 L8,4 L0,8 z" className={KIND_META[k].fill} />
                    </marker>
                  ))}
                </defs>
                {edges.map((e, i) => {
                  const a = layout.pos[e.from]
                  const b = layout.pos[e.to]
                  if (!a || !b) return null
                  const k = (byId.get(e.from)?.kind ?? "external") as StorybookNodeKind
                  const active = !!focus && (e.from === focus || e.to === focus)
                  const dim = !!focus && !active
                  return (
                    <path
                      key={i}
                      d={edgePath(a, b)}
                      fill="none"
                      strokeWidth={active ? 2.25 : 1.5}
                      opacity={dim ? 0.1 : active ? 1 : 0.5}
                      className={cn(metaOf(k).stroke, "transition-opacity")}
                      markerEnd={`url(#${uid}-${KIND_ORDER.includes(k) ? k : "external"})`}
                    />
                  )
                })}
              </svg>

              {nodes.map((n) => {
                const p = layout.pos[n.id]
                if (!p) return null
                const m = metaOf(n.kind)
                const Icon = m.icon
                const isSel = selected === n.id
                const isLinked = linked.has(n.id)
                const dim = !!focus && focus !== n.id && !isLinked
                return (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={isSel}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (drag.current.moved) return
                      setSelected((s) => (s === n.id ? null : n.id))
                    }}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(n.id)}
                    onBlur={() => setHovered(null)}
                    style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                    className={cn(
                      "absolute z-10 flex items-center gap-2.5 rounded-lg border border-l-4 border-border bg-card px-3 text-left shadow-sm outline-none transition-[opacity,box-shadow]",
                      m.accent,
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      isSel && cn("ring-2 shadow-md", m.ring),
                      isLinked && "shadow-md",
                      dim && "opacity-30"
                    )}
                  >
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border", m.chip)}>
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{n.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{m.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-3 z-20 flex cursor-default items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-sm backdrop-blur"
            >
              <Button variant="ghost" size="icon" className="size-7" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.25)}>
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(view.k * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Zoom in" onClick={() => zoomAt(1.25)}>
                <ZoomIn className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Fit to screen" onClick={fit}>
                <Scan className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={isFull ? "Exit full screen" : "Full screen"}
                onClick={toggleFull}
              >
                {isFull ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
              </Button>
            </div>

            <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
              {isFull ? "Drag to pan. Hold Ctrl and scroll to zoom. Press Esc to exit." : "Drag to pan. Hold Ctrl and scroll to zoom."}
            </p>

            {isFull && (
              <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-sm rounded-lg border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
                <p className="truncate text-sm font-semibold">{flow.name}</p>
                {flow.description && <p className="line-clamp-2 text-xs text-muted-foreground">{flow.description}</p>}
              </div>
            )}

            {isFull && selectedNode && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 right-3 top-16 z-20 w-80 max-w-[calc(100%-1.5rem)] cursor-default overflow-y-auto rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur"
              >
                <NodeDetail node={selectedNode} outgoing={outgoing} incoming={incoming} onSelect={(id) => setSelected(id)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node details and legend */}
      <aside className="min-w-0 space-y-4">
        <AsidePanel icon={Network} title="Details">
          {selectedNode ? (
            <NodeDetail
              node={selectedNode}
              outgoing={outgoing}
              incoming={incoming}
              onSelect={(id) => setSelected(id)}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Select a node to see what it does, where it lives and what it connects to.
            </p>
          )}
        </AsidePanel>
        {kindsPresent.length > 0 && (
          <AsidePanel icon={Layers} title="Legend" count={kindsPresent.length} defaultOpen={false}>
            <ul className="divide-y divide-border">
              {kindsPresent.map((k) => {
                const m = KIND_META[k]
                const Icon = m.icon
                return (
                  <li key={k} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span className={cn("flex size-6 items-center justify-center rounded-md border", m.chip)}>
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {nodes.filter((n) => n.kind === k).length}
                    </span>
                  </li>
                )
              })}
            </ul>
          </AsidePanel>
        )}
      </aside>

      {/* Steps */}
      {steps.length > 0 && (
        <section className="min-w-0 space-y-3">
          <SectionHeading icon={Workflow} title="Step by step" count={steps.length} />
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i}>
                <Card>
                  <CardContent className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{s.name}</h4>
                        {s.type && <Badge variant="secondary">{s.type}</Badge>}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                      {s.file && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileCode2 className="size-3.5 shrink-0" aria-hidden />
                          <code className="break-all font-mono text-foreground/80">
                            {s.file}
                            {s.line != null && `:${s.line}`}
                          </code>
                        </p>
                      )}
                      {s.insight && (
                        <p className="flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                          <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {s.insight}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <aside className="min-w-0">
          <AsidePanel icon={AlertTriangle} title="Risks to watch" count={risks.length}>
            <ul className="divide-y divide-amber-400/20">
              {risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 bg-amber-50/60 px-4 py-3 dark:bg-amber-500/5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span className="text-sm text-amber-900/90 dark:text-amber-100/80">{r}</span>
                </li>
              ))}
            </ul>
          </AsidePanel>
        </aside>
      )}
    </div>
  )
}

function NodeLinks({
  title,
  nodes,
  onSelect,
}: {
  title: string
  nodes: FlowNode[]
  onSelect: (id: string) => void
}) {
  if (nodes.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul>
        {nodes.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn("size-2 shrink-0 rounded-full", metaOf(n.kind).dot)} aria-hidden />
              <span className="truncate">{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NodeDetail({
  node,
  outgoing,
  incoming,
  onSelect,
}: {
  node: FlowNode
  outgoing: FlowNode[]
  incoming: FlowNode[]
  onSelect: (id: string) => void
}) {
  const m = metaOf(node.kind)
  const Icon = m.icon
  const d = node.detail ?? {}
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", m.chip)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="break-words font-medium leading-snug">{node.label}</p>
          <p className="text-xs text-muted-foreground">{m.label}</p>
        </div>
      </div>
      {d.summary && <p className="text-sm text-muted-foreground">{d.summary}</p>}
      {(d.source_file || d.code_ref || d.line != null) && (
        <dl className="space-y-1.5 text-xs">
          {d.source_file && (
            <div>
              <dt className="text-muted-foreground">File</dt>
              <dd>
                <code className="break-all font-mono text-foreground/80">{d.source_file}</code>
              </dd>
            </div>
          )}
          {d.code_ref && (
            <div>
              <dt className="text-muted-foreground">Reference</dt>
              <dd>
                <code className="break-all font-mono text-foreground/80">{d.code_ref}</code>
              </dd>
            </div>
          )}
          {d.line != null && (
            <div>
              <dt className="text-muted-foreground">Line</dt>
              <dd className="text-foreground/80">{d.line}</dd>
            </div>
          )}
        </dl>
      )}
      <NodeLinks title="Calls or uses" nodes={outgoing} onSelect={onSelect} />
      <NodeLinks title="Used by" nodes={incoming} onSelect={onSelect} />
    </div>
  )
}

// ─── Panels ────────────────────────────────────────────────────────────────────

function OverviewPanel({ overview }: { overview: StorybookOverview }) {
  const framework = overview.framework ?? []
  const modules = overview.modules ?? []
  const entryPoints = overview.entry_points ?? []
  const connections = overview.connections ?? []
  const hasAside = framework.length > 0 || entryPoints.length > 0

  if (modules.length === 0 && !hasAside && connections.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No overview yet"
        hint="Regenerate this guide to get a summary of the project's modules."
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className={cn("grid items-start gap-6", hasAside && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <section className="min-w-0 space-y-3">
          <SectionHeading icon={Boxes} title="Modules" count={modules.length} />
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((m) => (
              <Card key={m.name} className="h-full transition-colors hover:border-primary/60">
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Package className="size-4" aria-hidden />
                    </span>
                    <h4 className="min-w-0 break-words font-medium leading-snug">{m.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.responsibility}</p>
                  {(m.connects_to ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Works with</span>
                      {m.connects_to.map((c) => (
                        <Badge key={c} variant="outline" className="text-[11px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(m.key_files ?? []).length > 0 && (
                    <ul className="space-y-1 border-t border-border pt-3">
                      {m.key_files.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileCode2 className="size-3.5 shrink-0" aria-hidden />
                          <code className="break-all font-mono text-foreground/80">{f}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {hasAside && (
          <aside className="min-w-0 space-y-4">
            {framework.length > 0 && (
              <AsidePanel icon={Layers} title="Built with" count={framework.length}>
                <div className="flex flex-wrap gap-1.5 p-4">
                  {framework.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              </AsidePanel>
            )}
            {entryPoints.length > 0 && (
              <AsidePanel icon={GitBranch} title="Entry points" count={entryPoints.length}>
                <ul className="divide-y divide-border">
                  {entryPoints.map((e) => (
                    <li key={e} className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent/40">
                      <GitBranch className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <code className="break-all font-mono text-xs text-foreground/80">{e}</code>
                    </li>
                  ))}
                </ul>
              </AsidePanel>
            )}
          </aside>
        )}
      </div>

      {connections.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={Network} title="How the pieces connect" count={connections.length} />
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {connections.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{c.from}</code>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{c.to}</code>
                {c.note && <span className="w-full text-muted-foreground sm:ml-2 sm:w-auto">{c.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function FlowsPanel({ flows }: { flows: StorybookFlow[] }) {
  if (flows.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="No flows were identified"
        hint="Flows show how a request or action moves through the code. Regenerate the guide to try again."
      />
    )
  }
  if (flows.length === 1) {
    return <FlowGraph key={flows[0].id} flow={flows[0]} showTitle />
  }
  return (
    <Tabs defaultValue={flows[0].id} className="gap-5">
      <TabsList className="grid h-auto w-full auto-rows-fr grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-3">
        {flows.map((f) => (
          <TabsTrigger key={f.id} value={f.id} className={CARD_TRIGGER}>
            <span className="flex w-full flex-col gap-1">
              <span className="break-words text-sm font-medium leading-snug">{f.name}</span>
              {f.description && (
                <span className="line-clamp-2 text-xs font-normal text-muted-foreground group-data-[state=active]:text-foreground/80">
                  {f.description}
                </span>
              )}
              <span className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-[11px]">
                  {plural(f.graph.nodes.length, "node")}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {plural((f.steps ?? []).length, "step")}
                </Badge>
              </span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {flows.map((f) => (
        <TabsContent key={f.id} value={f.id}>
          <FlowGraph flow={f} showTitle={false} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

type Endpoint = StorybookApiGroup["endpoints"][number]
type ApiItem = { id: string; group: string; ep: Endpoint }

function InlineCopy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

function prettyJson(s: string) {
  const t = (s ?? "").trim()
  if (!t.startsWith("{") && !t.startsWith("[")) return s
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return s
  }
}

function parseError(s: string): { code: string | null; text: string } {
  const m = s.match(/^\s*(\d{3})\s*[:\-–—]?\s*([\s\S]*)$/)
  return m ? { code: m[1], text: m[2] } : { code: null, text: s }
}

function statusStyle(code: string) {
  if (code.startsWith("5")) return "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"
  if (code.startsWith("4")) return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
  return "border-border bg-muted text-muted-foreground"
}

function needsAuth(ep: Endpoint) {
  const hay = [...(ep.headers ?? []), ...(ep.params ?? []).filter((p) => p.in === "header").map((p) => p.name)]
  return hay.some((h) => /authorization|api[-_ ]?key|bearer|x-auth/i.test(h))
}

function DetailSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <h4 className="font-semibold">{title}</h4>
          {count != null && <Badge variant="secondary">{count}</Badge>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

const PARAM_GROUPS: Array<{ key: string; title: string }> = [
  { key: "path", title: "Path parameters" },
  { key: "query", title: "Query parameters" },
  { key: "header", title: "Header parameters" },
  { key: "body", title: "Body fields" },
]

function ParamTable({ title, params }: { title: string; params: Endpoint["params"] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {title} ({params.length})
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((p, i) => (
            <TableRow key={`${p.name}-${i}`}>
              <TableCell className="whitespace-nowrap align-top">
                <code className="font-mono text-xs font-semibold">{p.name}</code>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 text-[10px]",
                    p.required ? "border-amber-400/60 text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                  )}
                >
                  {p.required ? "required" : "optional"}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
                <code className="font-mono text-xs">{p.type}</code>
              </TableCell>
              <TableCell className="whitespace-normal align-top text-xs text-muted-foreground">{p.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EndpointDetail({
  item,
  resolve,
  onGo,
}: {
  item: ApiItem
  resolve: (ref: string) => ApiItem | undefined
  onGo: (it: ApiItem) => void
}) {
  const { ep, group } = item
  const params = ep.params ?? []
  const headers = ep.headers ?? []
  const errors = ep.errors ?? []
  const sources = ep.source_files ?? []
  const related = ep.related ?? []
  const known = new Set(PARAM_GROUPS.map((g) => g.key))
  const otherParams = params.filter((p) => !known.has(p.in))
  const hasRequest = params.length > 0 || headers.length > 0 || !!ep.body_schema

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("font-mono text-xs font-semibold", METHOD_STYLES[ep.method] ?? "")}
            >
              {ep.method}
            </Badge>
            <code className="min-w-0 break-all font-mono text-base font-semibold">{ep.path}</code>
            <InlineCopy text={ep.path} label="Copy path" />
          </div>
          {ep.summary && <p className="text-base">{ep.summary}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{group}</Badge>
            {needsAuth(ep) && (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" aria-hidden /> Needs auth
              </Badge>
            )}
            <Badge variant="outline">{plural(params.length, "parameter")}</Badge>
            <Badge variant="outline">{plural(errors.length, "error")}</Badge>
          </div>
        </CardContent>
      </Card>

      {ep.behavior && (
        <DetailSection icon={Workflow} title="How it behaves">
          <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {ep.behavior}
          </p>
        </DetailSection>
      )}

      <DetailSection icon={ArrowRight} title="Request">
        {!hasRequest && (
          <p className="text-sm text-muted-foreground">This endpoint takes no parameters, headers or body.</p>
        )}
        {PARAM_GROUPS.map((g) => {
          const list = params.filter((p) => p.in === g.key)
          return list.length > 0 ? <ParamTable key={g.key} title={g.title} params={list} /> : null
        })}
        {otherParams.length > 0 && <ParamTable title="Other parameters" params={otherParams} />}
        {headers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Headers ({headers.length})</p>
            <ul className="space-y-1">
              {headers.map((h, i) => (
                <li key={i}>
                  <code className="block break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">{h}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ep.body_schema && <CodeBlock code={prettyJson(ep.body_schema)} label="Request body schema" />}
      </DetailSection>

      {ep.response && (
        <DetailSection icon={Server} title="Response">
          <CodeBlock code={prettyJson(ep.response)} label="Response structure" />
        </DetailSection>
      )}

      {errors.length > 0 && (
        <DetailSection icon={AlertTriangle} title="Possible errors" count={errors.length}>
          <ul className="space-y-2">
            {errors.map((er, i) => {
              const { code, text } = parseError(er)
              return (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                  {code ? (
                    <Badge variant="outline" className={cn("shrink-0 font-mono text-[11px]", statusStyle(code))}>
                      {code}
                    </Badge>
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  )}
                  <span className="min-w-0 break-words text-sm text-muted-foreground">{text || "No description"}</span>
                </li>
              )
            })}
          </ul>
        </DetailSection>
      )}

      {ep.example && (
        <DetailSection icon={Sparkles} title="Usage example">
          <CodeBlock code={ep.example} />
        </DetailSection>
      )}

      {(sources.length > 0 || related.length > 0) && (
        <DetailSection icon={FileCode2} title="In the code">
          {sources.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Implemented in ({sources.length})</p>
              <ul className="space-y-1">
                {sources.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md bg-muted/50 py-0.5 pl-2.5 pr-1">
                    <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <code className="min-w-0 flex-1 break-all font-mono text-xs">{f}</code>
                    <InlineCopy text={f} label="Copy file path" />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {related.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Related endpoints ({related.length})</p>
              <ul className="flex flex-wrap gap-2">
                {related.map((r, i) => {
                  const target = resolve(r)
                  return (
                    <li key={i}>
                      {target ? (
                        <button
                          type="button"
                          onClick={() => onGo(target)}
                          className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-left outline-none transition-colors hover:border-primary/60 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Badge
                            variant="outline"
                            className={cn("font-mono text-[10px] font-semibold", METHOD_STYLES[target.ep.method] ?? "")}
                          >
                            {target.ep.method}
                          </Badge>
                          <code className="break-all font-mono text-xs">{target.ep.path}</code>
                        </button>
                      ) : (
                        <code className="block rounded-md border border-dashed border-border px-2 py-1 font-mono text-xs text-muted-foreground">
                          {r}
                        </code>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </DetailSection>
      )}
    </div>
  )
}

function ApisPanel({ apis }: { apis: StorybookApiGroup[] }) {
  const [query, setQuery] = React.useState("")
  const [methods, setMethods] = React.useState<string[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const detailRef = React.useRef<HTMLDivElement>(null)

  const items = React.useMemo<ApiItem[]>(
    () => apis.flatMap((g, gi) => g.endpoints.map((ep, ei) => ({ id: `${gi}-${ei}`, group: g.group, ep }))),
    [apis]
  )
  const methodList = React.useMemo(() => Array.from(new Set(items.map((i) => i.ep.method))), [items])
  const q = query.trim().toLowerCase()
  const visible = React.useMemo(
    () =>
      items.filter(
        (it) =>
          (methods.length === 0 || methods.includes(it.ep.method)) &&
          (!q || [it.ep.path, it.ep.summary, it.ep.behavior, it.group].some((s) => (s ?? "").toLowerCase().includes(q)))
      ),
    [items, methods, q]
  )
  const groups = React.useMemo(() => {
    const map = new Map<string, ApiItem[]>()
    for (const it of visible) map.set(it.group, [...(map.get(it.group) ?? []), it])
    return Array.from(map.entries())
  }, [visible])
  const active = visible.find((i) => i.id === selectedId) ?? visible[0] ?? null
  const filtering = q !== "" || methods.length > 0

  const select = React.useCallback((id: string) => {
    setSelectedId(id)
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }, [])

  const resolve = React.useCallback(
    (ref: string) => {
      const m = ref.trim().match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i)
      const path = m ? m[2] : ref.trim()
      const method = m?.[1].toUpperCase()
      return (
        items.find((i) => i.ep.path === path && (!method || i.ep.method === method)) ??
        items.find((i) => i.ep.path === path)
      )
    },
    [items]
  )

  const goTo = (it: ApiItem) => {
    setQuery("")
    setMethods([])
    select(it.id)
  }

  if (apis.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No APIs were identified"
        hint="This project may not expose HTTP endpoints. Regenerate the guide if you expected some."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search endpoints" />
        <div className="flex flex-wrap items-center gap-1.5">
          {methodList.map((m) => {
            const on = methods.includes(m)
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on ? METHOD_STYLES[m] ?? "border-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {m}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground sm:ml-auto">
          {filtering ? `${visible.length} of ${plural(items.length, "endpoint")}` : plural(items.length, "endpoint")}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No endpoints match"
          hint="Try a different search or clear the method filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("")
                setMethods([])
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <nav
            aria-label="Endpoints"
            className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
          >
            {groups.map(([group, list]) => (
              <div key={group} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <Layers className="size-4 text-muted-foreground" aria-hidden />
                  <p className="min-w-0 truncate text-sm font-semibold">{group}</p>
                  <Badge variant="secondary">{list.length}</Badge>
                </div>
                <ul className="space-y-1">
                  {list.map((it) => {
                    const on = active?.id === it.id
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          aria-current={on}
                          onClick={() => select(it.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            on ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent/50"
                          )}
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-0.5 w-14 shrink-0 justify-center font-mono text-[10px] font-semibold",
                              METHOD_STYLES[it.ep.method] ?? ""
                            )}
                          >
                            {it.ep.method}
                          </Badge>
                          <span className="min-w-0 flex-1">
                            <code className="block truncate font-mono text-xs font-medium">{it.ep.path}</code>
                            {it.ep.summary && (
                              <span className="line-clamp-2 text-xs text-muted-foreground">{it.ep.summary}</span>
                            )}
                          </span>
                          {needsAuth(it.ep) && (
                            <Lock className="mt-1 size-3 shrink-0 text-muted-foreground" aria-label="Needs auth" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div ref={detailRef} className="min-w-0 scroll-mt-4">
            {active && <EndpointDetail key={active.id} item={active} resolve={resolve} onGo={goTo} />}
          </div>
        </div>
      )}
    </div>
  )
}

type CodeModule = StorybookCodebase["modules"][number]
type CodeFile = CodeModule["files"][number]

function CodebasePanel({ codebase }: { codebase: StorybookCodebase }) {
  const [query, setQuery] = React.useState("")
  const modules = codebase.modules ?? []
  const dependencies = codebase.dependencies ?? []
  const logic = codebase.business_logic ?? []
  const q = query.trim().toLowerCase()

  const filtered = React.useMemo(() => {
    const out: Array<{ m: CodeModule; files: CodeFile[] }> = []
    for (const m of modules) {
      if (!q) {
        out.push({ m, files: m.files ?? [] })
        continue
      }
      const modHit = m.module.toLowerCase().includes(q) || (m.responsibility ?? "").toLowerCase().includes(q)
      const files: CodeFile[] = []
      for (const f of m.files ?? []) {
        if (modHit || f.path.toLowerCase().includes(q)) {
          files.push(f)
          continue
        }
        const symbols = (f.symbols ?? []).filter((s) => s.name.toLowerCase().includes(q))
        if (symbols.length > 0) files.push({ ...f, symbols })
      }
      if (modHit || files.length > 0) out.push({ m, files })
    }
    return out
  }, [modules, q])

  const hasAside = dependencies.length > 0 || logic.length > 0

  if (modules.length === 0 && !hasAside) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No code map yet"
        hint="Regenerate this guide to get a map of modules, files and symbols."
      />
    )
  }

  return (
    <div className={cn("grid items-start gap-6", hasAside && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search files and symbols" />
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {plural(codebase.symbols_total ?? 0, "symbol")}, {plural(codebase.routes_total ?? 0, "route")}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="Nothing matches" hint="Try a file name, module or symbol." />
        ) : (
          <div className="space-y-3">
            {filtered.map(({ m, files }) => (
              <Collapsible
                key={`${m.module}-${q ? "q" : "all"}`}
                defaultOpen={!!q || modules.length === 1}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <CollapsibleTrigger className="group flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/30 focus-visible:bg-accent/40">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Package className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.module}</span>
                      <Badge variant="secondary" className="text-[11px]">
                        {plural(m.file_count, "file")}
                      </Badge>
                    </span>
                    <span className="block text-sm text-muted-foreground">{m.responsibility}</span>
                  </span>
                  <ChevronDown className="mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 border-t border-border px-4 py-4">
                  {(m.depends_on ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Depends on</span>
                      {m.depends_on.map((d) => (
                        <Badge key={d} variant="outline" className="text-[11px]">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {files.map((f) => (
                    <Collapsible
                      key={`${f.path}-${q ? "q" : "all"}`}
                      defaultOpen={!!q}
                      className="overflow-hidden rounded-lg border border-border bg-muted/30"
                    >
                      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/50">
                        <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <code className="min-w-0 flex-1 break-all font-mono text-xs font-medium">{f.path}</code>
                        <Badge variant="outline" className="shrink-0 text-[11px]">
                          {plural(f.symbol_count, "symbol")}
                        </Badge>
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      {(f.symbols ?? []).length > 0 && (
                        <CollapsibleContent className="border-t border-border">
                          <ul className="divide-y divide-border">
                            {f.symbols.map((s, si) => (
                              <li
                                key={`${s.name}-${si}`}
                                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60"
                              >
                                <span className="font-medium text-foreground/90">{s.name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {s.kind}
                                </Badge>
                                <code className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">
                                  {s.signature}
                                </code>
                                <span className="ml-auto text-[11px] text-muted-foreground">line {s.line}</span>
                              </li>
                            ))}
                          </ul>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </section>

      {hasAside && (
        <aside className="min-w-0 space-y-4">
          {dependencies.length > 0 && (
            <AsidePanel icon={GitBranch} title="Dependencies" count={dependencies.length}>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {dependencies.map((d, i) => (
                  <li key={i} className="space-y-1.5 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <code className="break-all font-mono text-foreground/80">{d.from}</code>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <code className="break-all font-mono text-foreground/80">{d.to}</code>
                    </div>
                    {d.kind && (
                      <Badge variant="outline" className="text-[11px]">
                        {d.kind}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </AsidePanel>
          )}
          {logic.length > 0 && (
            <AsidePanel icon={Sparkles} title="Business logic" count={logic.length}>
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {logic.map((b, i) => (
                  <li key={i} className="space-y-1.5 px-4 py-3">
                    <p className="text-sm font-medium">{b.topic}</p>
                    <ul className="space-y-1">
                      {(b.locations ?? []).map((l, li) => (
                        <li key={li} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <FileCode2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          <code className="break-all font-mono text-foreground/80">{l}</code>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </AsidePanel>
          )}
        </aside>
      )}
    </div>
  )
}

// ─── Top-level LearnStep ──────────────────────────────────────────────────────

type Props = {
  section: StorybookLearn
  onRegenerate?: () => void
  regenerating?: boolean
  errors?: string[]
}

const EMPTY_OVERVIEW = { summary: "", framework: [], modules: [], entry_points: [], connections: [] } as unknown as StorybookOverview
const EMPTY_CODEBASE = {
  modules: [],
  dependencies: [],
  business_logic: [],
  symbols_total: 0,
  routes_total: 0,
} as unknown as StorybookCodebase

export function LearnStep({ section, onRegenerate, regenerating = false, errors = [] }: Props) {
  const overview = section?.overview ?? EMPTY_OVERVIEW
  const flows = section?.flows ?? []
  const apis = section?.apis ?? []
  const codebase = section?.codebase ?? EMPTY_CODEBASE
  const warnings = section?.warnings ?? []

  const endpointCount = apis.reduce((n, g) => n + g.endpoints.length, 0)
  const moduleCount = (overview.modules ?? []).length

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to the codebase</h1>
          <p className="max-w-prose text-muted-foreground">
            {overview.summary || "What is this project, how does it fit together, and where is it implemented?"}
          </p>
        </div>
        {onRegenerate && (
          <Button variant="outline" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={cn(regenerating && "motion-safe:animate-spin")} /> Regenerate
          </Button>
        )}
      </header>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>We hit a problem building this guide</AlertTitle>
          <AlertDescription>
            {errors.map((e, i) => (
              <span key={i} className="block">
                {e}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Collapsible
          defaultOpen={warnings.length <= 3}
          className="overflow-hidden rounded-xl border border-amber-400/60 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5"
        >
          <CollapsibleTrigger className="group flex w-full items-center gap-2 px-5 py-4 text-left outline-none">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">Warnings</span>
            <Badge variant="outline" className="border-amber-400/60 text-amber-700 dark:text-amber-300">
              {warnings.length}
            </Badge>
            <ChevronDown className="ml-auto size-4 shrink-0 text-amber-600 transition-transform duration-200 group-data-[state=open]:rotate-180 dark:text-amber-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-amber-400/25">
            <ul className="divide-y divide-amber-400/20 px-5">
              {warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5 py-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {i + 1}
                  </span>
                  <span className="text-sm text-amber-900/90 dark:text-amber-100/80">{w}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="grid h-auto w-full auto-rows-fr grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview" className={CARD_TRIGGER}>
            <TabCard icon={Boxes} title="What am I looking at?" hint={plural(moduleCount, "module")} />
          </TabsTrigger>
          <TabsTrigger value="flows" className={CARD_TRIGGER}>
            <TabCard icon={Workflow} title="How does it work?" hint={plural(flows.length, "flow")} />
          </TabsTrigger>
          <TabsTrigger value="apis" className={CARD_TRIGGER}>
            <TabCard icon={Server} title="How do I interact?" hint={plural(endpointCount, "endpoint")} />
          </TabsTrigger>
          <TabsTrigger value="codebase" className={CARD_TRIGGER}>
            <TabCard
              icon={FileCode2}
              title="Where is it implemented?"
              hint={plural(codebase.symbols_total ?? 0, "symbol")}
            />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel overview={overview} />
        </TabsContent>
        <TabsContent value="flows">
          <FlowsPanel flows={flows} />
        </TabsContent>
        <TabsContent value="apis">
          <ApisPanel apis={apis} />
        </TabsContent>
        <TabsContent value="codebase">
          <CodebasePanel codebase={codebase} />
        </TabsContent>
      </Tabs>
    </div>
  )
}