import { useEffect, useState } from 'react';
import type { DocBlock } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ArrowLeft, FileText, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { DocsEditor } from '@/components/docs/DocsEditor';

type Orientation = 'portrait' | 'landscape';

const ORIENTATION_KEY = 'ramp_doc_orientation';

interface DocsPageProps {
  workspaceIcon: string;
  workspaceLabel: string;
  /** Ancestor folders plus the doc itself, in order. */
  path: { id: string; label: string }[];
  docId: string;
  title: string;
  blocks: DocBlock[];
  onBack: () => void;
  onRename: (label: string) => void;
  onUpdateContent: (blocks: DocBlock[]) => void;
}

export function DocsPage({
  workspaceIcon,
  workspaceLabel,
  path,
  title,
  blocks,
  onBack,
  onRename,
  onUpdateContent,
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

  const commitTitle = (value: string) => {
    setTitleDraft(value);
    onRename(value);
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
      </header>

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
    </div>
  );
}
