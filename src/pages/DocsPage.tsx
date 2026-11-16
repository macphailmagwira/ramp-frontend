import { useEffect, useState } from 'react';
import type { DocBlock, VersionSummary, VersionDetail } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ArrowLeft, FileText, RectangleVertical, RectangleHorizontal, History, RotateCcw, Check, AlertCircle, X } from 'lucide-react';
import { DocsEditor } from '@/components/docs/DocsEditor';
import { Spinner } from '@/components/ui/spinner';

type Orientation = 'portrait' | 'landscape';

const ORIENTATION_KEY = 'ramp_doc_orientation';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface DocsPageVersions {
  list: () => Promise<VersionSummary[]>;
  get: (version: number) => Promise<VersionDetail>;
  restore: (version: number) => Promise<number>;
}

interface DocsPageProps {
  workspaceIcon: string;
  workspaceLabel: string;
  /** Ancestor folders plus the doc itself, in order. */
  path: { id: string; label: string }[];
  docId: string;
  workspaceId: string;
  title: string;
  blocks: DocBlock[];
  versions?: DocsPageVersions;
  onBack: () => void;
  onRenameTitle: (title: string) => void;
  onUpdateContent: (blocks: DocBlock[]) => void;
  /** Save state for this document: shown as an unsaved/saved indicator. */
  saveStatus?: 'saving' | 'saved' | 'error';
}

export function DocsPage({
  workspaceIcon,
  workspaceLabel,
  path,
  title,
  blocks,
  versions,
  onBack,
  onRenameTitle,
  onUpdateContent,
  saveStatus,
}: DocsPageProps) {
  const [titleDraft, setTitleDraft] = useState(title);
  const [orientation, setOrientation] = useState<Orientation>(() => {
    try {
      const saved = localStorage.getItem(ORIENTATION_KEY);
      if (saved === 'portrait' || saved === 'landscape') return saved;
    } catch {
      /* ignore */
    }
    return 'portrait';
  });

  useEffect(() => {
    try {
      localStorage.setItem(ORIENTATION_KEY, orientation);
    } catch {
      /* ignore */
    }
  }, [orientation]);

  // ── Version history ──
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versionList, setVersionList] = useState<VersionSummary[] | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [preview, setPreview] = useState<{ version: number; detail: VersionDetail } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const openHistory = async () => {
    setHistoryOpen(true);
    if (!versions) return;
    setVersionLoading(true);
    try {
      setVersionList(await versions.list());
    } catch {
      setVersionList([]);
    } finally {
      setVersionLoading(false);
    }
  };

  const previewVersion = async (version: number) => {
    if (!versions) return;
    try {
      setPreview({ version, detail: await versions.get(version) });
    } catch {
      /* ignore */
    }
  };

  const restoreVersion = async (version: number) => {
    if (!versions) return;
    setRestoring(true);
    try {
      await versions.restore(version);
      setHistoryOpen(false);
      setPreview(null);
    } catch {
      /* ignore */
    } finally {
      setRestoring(false);
    }
  };

  const commitTitle = (value: string) => {
    setTitleDraft(value);
    onRenameTitle(value);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Breadcrumb bar */}
      <header className="flex shrink-0 items-center gap-2 bg-card/30 px-4 py-2.5 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-[12px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="text-sm leading-none">{workspaceIcon}</span>
            {workspaceLabel}
          </span>
          {path.map((p, i) => (
            <span key={p.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span
                className={cn(
                  'truncate',
                  i === path.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {p.label}
              </span>
            </span>
          ))}
        </nav>

        {/* Layout toggle */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5">
          <button
            onClick={() => setOrientation('portrait')}
            aria-label="Portrait layout"
            aria-pressed={orientation === 'portrait'}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              orientation === 'portrait'
                ? 'bg-foreground/[0.08] text-foreground'
                : 'text-muted-foreground/60 hover:text-foreground',
            )}
          >
            <RectangleVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOrientation('landscape')}
            aria-label="Landscape layout"
            aria-pressed={orientation === 'landscape'}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              orientation === 'landscape'
                ? 'bg-foreground/[0.08] text-foreground'
                : 'text-muted-foreground/60 hover:text-foreground',
            )}
          >
            <RectangleHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {versions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openHistory}
            className="h-7 gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>
        )}

        {saveStatus && (
          <span
            className={cn(
              'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium',
              saveStatus === 'saving' && 'text-muted-foreground',
              saveStatus === 'saved' && 'text-emerald-500',
              saveStatus === 'error' && 'text-destructive',
            )}
            aria-live="polite"
          >
            {saveStatus === 'saving' && <Spinner className="h-3 w-3" />}
            {saveStatus === 'saved' && <Check className="h-3 w-3" />}
            {saveStatus === 'error' && <AlertCircle className="h-3 w-3" />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Not saved'}
          </span>
        )}
      </header>

      {/* Body: document + optional in-page history panel */}
      <div className="flex min-h-0 flex-1">
        {/* Document */}
        <ScrollArea className="min-h-0 flex-1">
          <div
            className={cn(
              'mx-auto w-full transition-[max-width,margin] duration-300 ease-in-out',
              orientation === 'portrait' ? 'my-8 max-w-[760px]' : 'my-0 max-w-[4000px]',
            )}
          >
            <div className="px-6 py-10 sm:px-12">
              <div className="mb-1 flex items-center gap-2 text-foreground/40">
                <FileText className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-[0.08em]">Document</span>
              </div>

              <input
                value={titleDraft}
                onChange={e => commitTitle(e.target.value)}
                placeholder="Untitled"
                className={cn(
                  'mb-2 w-full border-0 bg-transparent text-[34px] font-bold leading-tight tracking-tight text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                  'placeholder:text-foreground/25',
                )}
              />

              <Separator className="mb-4" />

              <DocsEditor blocks={blocks} onChange={onUpdateContent} />
            </div>
          </div>
        </ScrollArea>

        {/* Version history panel — lives inside the doc layout and pushes the content */}
        <aside
          className={cn(
            'relative h-full shrink-0 overflow-hidden border-l border-border/60 bg-card/40 transition-[width] duration-300 ease-in-out',
            historyOpen ? 'w-[340px]' : 'w-0',
          )}
        >
          <div className="flex h-full w-[340px] flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-semibold">Version history</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-0.5 p-3">
                {versionLoading && (
                  <p className="py-4 text-sm text-muted-foreground">Loading…</p>
                )}
                {!versionLoading && versionList && versionList.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">No versions yet.</p>
                )}
                {versionList?.map((v) => (
                  <div
                    key={v.version}
                    className="group rounded-md transition-colors hover:bg-foreground/[0.04]"
                  >
                    <div className="flex items-center gap-2 px-2 py-2">
                      <span className="w-7 shrink-0 text-[12px] font-medium tabular-nums text-foreground">
                        v{v.version}
                      </span>
                      <button
                        type="button"
                        onClick={() => previewVersion(v.version)}
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                      >
                        <span className="w-full truncate text-[12.5px] text-foreground/90">
                          {v.label || 'Untitled'}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground/70">
                          {v.edited_by} · {relativeTime(v.created_at)}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => restoreVersion(v.version)}
                        disabled={restoring}
                        aria-label={`Restore version ${v.version}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {preview?.version === v.version && (
                      <pre className="mx-2 mb-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-foreground/80">
                        {preview.detail.blocks
                          .map((b) => (b.type === 'divider' ? '—' : b.text))
                          .join('\n')}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>
      </div>
    </div>
  );
}
