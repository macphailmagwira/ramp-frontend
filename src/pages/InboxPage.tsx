import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Inbox as InboxIcon,
  AtSign,
  GitPullRequest,
  FileText,
  Video,
  CheckCheck,
  SlidersHorizontal,
  Settings2,
  Maximize2,
  BellOff,
  Mail,
  History,
  MoreHorizontal,
  Check,
  ExternalLink,
  Flag,
  Bot,
  Circle,
  Tag,
  UserPlus,
  MessageSquare,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type InboxCategory = 'mention' | 'review' | 'doc' | 'meeting';

interface ActivityLine {
  icon: React.ElementType;
  text: string;
  time: string; // ISO
}

interface InboxItem {
  id: string;
  category: InboxCategory;
  title: string;
  context: string[]; // breadcrumb segments
  actor: string;
  actorIsAi?: boolean;
  action: string; // the highlighted notification phrase, e.g. "requested your review"
  timestamp: string; // ISO
  unread: boolean;
  cleared: boolean;
  priority?: number; // 1-5, shown as a flag
  replies?: number;
  preview: string;
  activity: ActivityLine[];
  actionLabel: string;
  url: string;
}

// ── Category metadata ───────────────────────────────────────────────────

const CATEGORY_META: Record<
  InboxCategory,
  { label: string; icon: React.ElementType; className: string }
> = {
  mention: { label: 'Mentions', icon: AtSign, className: 'text-sky-400' },
  review: { label: 'Reviews', icon: GitPullRequest, className: 'text-emerald-400' },
  doc: { label: 'Docs', icon: FileText, className: 'text-violet-400' },
  meeting: { label: 'Meetings and Chats', icon: Video, className: 'text-amber-400' },
};

// ── Time helpers ─────────────────────────────────────────────────────────

function dateBucket(dateString: string): 'Today' | 'Yesterday' | 'Last 7 days' | 'Older' {
  const date = new Date(dateString);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 days';
  return 'Older';
}

function relativeOrClock(dateString: string): string {
  const date = new Date(dateString);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `${minutes < 1 ? 'just now' : `${minutes} min${minutes === 1 ? '' : 's'} ago`}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 6) return `${hours}h ago`;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function absoluteShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function rowTimestamp(item: InboxItem, bucket: string): string {
  return bucket === 'Today' ? relativeOrClock(item.timestamp) : absoluteShort(item.timestamp);
}

function isoAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

// ── Mock data ────────────────────────────────────────────────────────────
// Swap for a real fetch (e.g. api.inbox.getItems()) when wiring this up.

const MOCK_ITEMS: InboxItem[] = [
  {
    id: 'i1',
    category: 'review',
    title: '[Planning] Wire up production start/end date to plan summary table',
    context: ['Product-Eng', 'WIP Tickets', 'PR #482'],
    actor: 'Claude',
    actorIsAi: true,
    action: 'requested your review',
    timestamp: isoAgo(0.7),
    unread: true,
    cleared: false,
    priority: 1,
    replies: 3,
    preview:
      'Wires the production start/end date fields into the plan summary table and backfills existing rows. Diff touches PlanSummary.tsx, usePlanDates.ts, and one migration — no schema changes. Flagging the date-range edge cases for a second look before merge.',
    activity: [
      { icon: Tag, text: 'Claude set Frontend Priority to P0', time: isoAgo(0.72) },
      { icon: Tag, text: 'Claude set Backend Priority to P0', time: isoAgo(0.73) },
      { icon: UserPlus, text: 'Claude requested review from you', time: isoAgo(0.75) },
    ],
    actionLabel: 'Review PR',
    url: '#',
  },
  {
    id: 'i2',
    category: 'mention',
    title: 'Backend priority discussion',
    context: ['WIP Tickets', '[Planning] Wire Up Production Dates'],
    actor: 'Dario Kolic',
    action: 'mentioned you',
    timestamp: isoAgo(1.2),
    unread: true,
    cleared: false,
    replies: 5,
    preview:
      'Can you confirm P0 is right for the backend half too, or should we split it so frontend ships first? Victor flagged that the migration might block the sprint if we treat both as equally urgent.',
    activity: [
      { icon: MessageSquare, text: 'Dario Kolic commented on the ticket', time: isoAgo(1.25) },
      { icon: Circle, text: 'Victor Aderibgibe replied', time: isoAgo(1.4) },
    ],
    actionLabel: 'View thread',
    url: '#',
  },
  {
    id: 'i3',
    category: 'doc',
    title: 'Q3 Onboarding Runbook',
    context: ['Docs', 'Engineering', 'Onboarding'],
    actor: 'Claude',
    actorIsAi: true,
    action: 'updated a doc you follow',
    timestamp: isoAgo(3),
    unread: true,
    cleared: false,
    preview:
      'Rewrote the local-setup section to match the current CLI flags, added the missing env var table, and linked it from the README — the old --init flag was removed last week.',
    activity: [
      { icon: FileText, text: 'Claude rewrote "Local setup"', time: isoAgo(3.05) },
      { icon: FileText, text: 'Claude added "Environment variables" table', time: isoAgo(3.02) },
    ],
    actionLabel: 'Open document',
    url: '#',
  },
  {
    id: 'i4',
    category: 'meeting',
    title: 'Sprint planning — Sept 1',
    context: ['Meetings and Chats', 'Product-Eng Standup'],
    actor: 'Claude',
    actorIsAi: true,
    action: 'summarized this meeting',
    timestamp: isoAgo(5.4),
    unread: false,
    cleared: false,
    replies: 34,
    preview:
      'Decisions: dates ship this sprint as P0 for both frontend and backend; tablet foundations slip to next sprint. Open question for Alexis: does the upload-function fix need a design review before it ships?',
    activity: [
      { icon: CheckCheck, text: '4 decisions logged', time: isoAgo(5.4) },
      { icon: UserPlus, text: '6 action items assigned', time: isoAgo(5.4) },
    ],
    actionLabel: 'Watch recording',
    url: '#',
  },
  {
    id: 'i5',
    category: 'review',
    title: '[Uploads] Order-style duplicate check only compares within batch',
    context: ['Product-Eng', 'Uploads', 'PR #479'],
    actor: 'Victor Aderibgibe',
    action: 'requested changes',
    timestamp: isoAgo(9),
    unread: false,
    cleared: false,
    priority: 2,
    replies: 2,
    preview:
      'The duplicate check only compares order-style pairs within the same batch — if two batches merge later it\'ll miss cross-batch dupes. Suggest keying off the order ID instead.',
    activity: [{ icon: MessageSquare, text: 'Victor Aderibgibe left 2 comments', time: isoAgo(9) }],
    actionLabel: 'Review PR',
    url: '#',
  },
  {
    id: 'i6',
    category: 'mention',
    title: 'Resources documents upload function',
    context: ['Slack', '#eng-frontend'],
    actor: 'Alexis CD',
    action: 'mentioned you',
    timestamp: isoAgo(23),
    unread: true,
    cleared: false,
    preview:
      'The resources documents upload function fix is ready whenever you can look — small change, mostly a null check on the file list before we hit the API.',
    activity: [{ icon: MessageSquare, text: 'Alexis CD sent a message', time: isoAgo(23) }],
    actionLabel: 'View thread',
    url: '#',
  },
  {
    id: 'i7',
    category: 'doc',
    title: 'Tablet foundations — spec v2',
    context: ['Docs', 'Product', 'Tablets'],
    actor: 'Mishal',
    action: 'shared a doc with you',
    timestamp: isoAgo(28),
    unread: false,
    cleared: false,
    preview:
      'Added a section on offline sync behavior for the tablet app — covers conflict resolution when two tablets edit the same order offline and reconnect at different times.',
    activity: [{ icon: FileText, text: 'Mishal added "Offline sync"', time: isoAgo(28) }],
    actionLabel: 'Open document',
    url: '#',
  },
  {
    id: 'i8',
    category: 'meeting',
    title: 'Order destination bug — sync call',
    context: ['Meetings and Chats', 'Ad hoc'],
    actor: 'Claude',
    actorIsAi: true,
    action: 'summarized this meeting',
    timestamp: isoAgo(30),
    unread: false,
    cleared: false,
    replies: 12,
    preview:
      'Root cause: destination ID renders blank when an order is created from the mobile app because the payload omits the field entirely rather than sending null. Fix scoped to OrderForm.tsx.',
    activity: [{ icon: CheckCheck, text: 'Root cause identified', time: isoAgo(30) }],
    actionLabel: 'Watch recording',
    url: '#',
  },
  {
    id: 'i9',
    category: 'review',
    title: '[Orders] Rename quantity column and add quote totals',
    context: ['Product-Eng', 'Orders', 'PR #471'],
    actor: 'Claude',
    actorIsAi: true,
    action: 'requested your review',
    timestamp: isoAgo(70),
    unread: false,
    cleared: false,
    priority: 3,
    preview:
      'Renamed qty to quantity across the Orders table and its 14 references, and added a running total row to the quote view. Flagging since it touches the CSV export format too.',
    activity: [{ icon: Tag, text: 'Claude renamed 1 column, updated 14 references', time: isoAgo(70) }],
    actionLabel: 'Review PR',
    url: '#',
  },
  {
    id: 'i10',
    category: 'mention',
    title: 'Loosen "Inquiry" > "Quote Issued" order flow',
    context: ['WIP Tickets', 'Orders'],
    actor: 'Mishal',
    action: 'mentioned you',
    timestamp: isoAgo(72),
    unread: false,
    cleared: false,
    priority: 4,
    preview:
      'Thoughts on skipping the approval step for repeat customers with a clean payment history? Could cut the quote-to-order time in half but want your read on the risk.',
    activity: [{ icon: MessageSquare, text: 'Mishal commented on the ticket', time: isoAgo(72) }],
    actionLabel: 'View thread',
    url: '#',
  },
];

// ── Notification sentence ──────────────────────────────────────────────

function NotificationSentence({ item }: { item: InboxItem }) {
  return (
    <span className="truncate text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground/75">
        {item.actorIsAi && <Bot className="h-3 w-3 text-primary" strokeWidth={2} />}
        {item.actor}
      </span>{' '}
      <span className="text-indigo-400">{item.action}</span>
    </span>
  );
}

// ── Collapsed row ──────────────────────────────────────────────────────

function InboxRow({
  item,
  bucket,
  index,
  onOpen,
}: {
  item: InboxItem;
  bucket: string;
  index: number;
  onOpen: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.045] sm:px-6 lg:px-10',
        index % 2 === 1 && 'bg-white/[0.015]'
      )}
    >
      <span className="flex w-3.5 shrink-0 justify-center">
        {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
      </span>

      <meta.icon className={cn('h-[15px] w-[15px] shrink-0', meta.className)} strokeWidth={1.9} />

      <span
        className={cn(
          'min-w-0 flex-[3] truncate text-sm',
          item.unread ? 'font-medium text-foreground' : 'text-foreground/70'
        )}
      >
        {item.title}
      </span>

      <span className="min-w-0 flex-[4]">
        <NotificationSentence item={item} />
      </span>

      {item.priority && (
        <span className="hidden shrink-0 items-center gap-1 text-rose-400 sm:flex">
          <Flag className="h-3 w-3 fill-rose-400" />
          <span className="w-3 text-xs tabular-nums">{item.priority}</span>
        </span>
      )}

      {item.replies && (
        <span className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs tabular-nums text-muted-foreground sm:flex">
          {item.replies}
        </span>
      )}

      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
        {rowTimestamp(item, bucket)}
      </span>
    </button>
  );
}

// ── Expanded ticket panel ──────────────────────────────────────────────

function ToolbarIconButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title={label}>
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function ExpandedPanel({
  item,
  onClose,
  onClear,
  onOpen,
}: {
  item: InboxItem;
  onClose: () => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  return (
    <div className="mx-2 my-1.5 overflow-hidden rounded-lg border border-border bg-card sm:mx-4 lg:mx-8">
      {/* Breadcrumb + title + toolbar */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4">
        <div className="min-w-0">
          <p className="mb-1.5 truncate text-xs text-muted-foreground">
            {item.context.join(' / ')}
          </p>
          <div className="flex items-center gap-2">
            <meta.icon className={cn('h-4 w-4 shrink-0', meta.className)} strokeWidth={2} />
            <h2 className="truncate text-base font-semibold leading-snug text-foreground">{item.title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <ToolbarIconButton icon={Maximize2} label="Expand" />
          <ToolbarIconButton icon={BellOff} label="Mute" />
          <ToolbarIconButton icon={Mail} label="Mark as unread" />
          <ToolbarIconButton icon={History} label="History" />
          <ToolbarIconButton icon={MoreHorizontal} label="More" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-medium" onClick={onClose}>
            Details
          </Button>
          <Button size="sm" className="h-7 gap-1.5 bg-foreground text-xs font-semibold text-background hover:bg-foreground/90" onClick={onClear}>
            <Check className="h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>

      <p className="px-5 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">{item.preview}</p>

      <Separator />

      {/* Activity feed */}
      <ul className="divide-y divide-border/60">
        {item.activity.map((line, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-2.5">
            <line.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.9} />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{line.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground/70">{relativeOrClock(line.time)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2 px-5 py-3">
        <Button size="sm" className="h-7 gap-1.5 text-xs font-semibold" onClick={onOpen}>
          {item.actionLabel}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Date group ───────────────────────────────────────────────────────────

function DateGroup({
  label,
  items,
  expandedId,
  onToggle,
  onClear,
  onOpen,
}: {
  label: string;
  items: InboxItem[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onClear: (id: string) => void;
  onOpen: (item: InboxItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-4 pb-2 pt-5 text-sm font-semibold text-foreground sm:px-6 lg:px-10">{label}</p>
      <div>
        {items.map((item, index) =>
          expandedId === item.id ? (
            <ExpandedPanel
              key={item.id}
              item={item}
              onClose={() => onToggle(item.id)}
              onClear={() => onClear(item.id)}
              onOpen={() => onOpen(item)}
            />
          ) : (
            <InboxRow key={item.id} item={item} bucket={label} index={index} onOpen={() => onToggle(item.id)} />
          )
        )}
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="mx-4 mt-8 flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-border py-16 text-center sm:mx-6 lg:mx-10">
      <InboxIcon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-sm font-medium text-foreground">You're all caught up</p>
      <p className="max-w-[26ch] text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

type TabValue = 'all' | InboxCategory | 'cleared';

const TABS: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: InboxIcon },
  { value: 'mention', label: 'Mentions', icon: AtSign },
  { value: 'review', label: 'Reviews', icon: GitPullRequest },
  { value: 'doc', label: 'Docs', icon: FileText },
  { value: 'meeting', label: 'Meetings and Chats', icon: Video },
  { value: 'cleared', label: 'Cleared', icon: CheckCheck },
];

export function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>(MOCK_ITEMS);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<InboxCategory>>(new Set());

  const unreadCounts = useMemo(() => {
    const counts: Record<TabValue, number> = { all: 0, mention: 0, review: 0, doc: 0, meeting: 0, cleared: 0 };
    for (const item of items) {
      if (item.cleared || !item.unread) continue;
      counts.all += 1;
      counts[item.category] += 1;
    }
    return counts;
  }, [items]);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => (activeTab === 'cleared' ? item.cleared : !item.cleared))
      .filter((item) => activeTab === 'all' || activeTab === 'cleared' || item.category === activeTab)
      .filter((item) => !hiddenCategories.has(item.category))
      .filter((item) => !unreadOnly || item.unread)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [items, activeTab, hiddenCategories, unreadOnly]);

  const grouped = useMemo(() => {
    const buckets: Record<string, InboxItem[]> = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] };
    for (const item of visibleItems) buckets[dateBucket(item.timestamp)].push(item);
    return buckets;
  }, [visibleItems]);

  const handleToggle = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, unread: false } : it)));
  };

  const handleClear = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cleared: true, unread: false } : it)));
    setExpandedId((current) => (current === id ? null : current));
  };

  const handleOpen = (item: InboxItem) => {
    // Wire this up to real navigation — e.g. router.push(item.url)
    window.open(item.url, '_blank', 'noreferrer');
  };

  const handleClearAll = () => {
    setItems((prev) =>
      prev.map((it) =>
        !it.cleared && (activeTab === 'all' || it.category === activeTab) ? { ...it, cleared: true, unread: false } : it
      )
    );
    setExpandedId(null);
  };

  const toggleCategoryFilter = (category: InboxCategory) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full bg-background font-sans">
      <div className="mx-auto w-full max-w-[1800px]">
        {/* ── Tabs ── */}
        <div className="flex items-end gap-7 overflow-x-auto border-b border-border px-4 pt-3 sm:px-6 lg:px-10">
          {TABS.map((tab) => {
            const count = tab.value === 'cleared' ? 0 : unreadCounts[tab.value];
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setExpandedId(null); }}
                className={cn(
                  'flex flex-col gap-1.5 border-b-2 pb-3 pt-1 text-left transition-colors',
                  isActive ? 'border-foreground' : 'border-transparent'
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-semibold',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {tab.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {count > 0 ? `${count} unread` : '\u00A0'}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-2.5 px-4 py-3 sm:px-6 lg:px-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full text-xs font-medium">
                <SlidersHorizontal className="h-3 w-3" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Show
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={unreadOnly} onCheckedChange={setUnreadOnly}>
                Unread only
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </DropdownMenuLabel>
              {(Object.keys(CATEGORY_META) as InboxCategory[]).map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={!hiddenCategories.has(category)}
                  onCheckedChange={() => toggleCategoryFilter(category)}
                >
                  {CATEGORY_META[category].label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Inbox settings">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={handleClearAll}
              disabled={activeTab === 'cleared'}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        </div>

        {/* ── List ── */}
        {visibleItems.length === 0 ? (
          <EmptyState
            label={
              activeTab === 'cleared'
                ? 'Cleared items will show up here.'
                : 'New mentions, review requests, doc updates, and meeting summaries will show up here.'
            }
          />
        ) : (
          <>
            <DateGroup label="Today" items={grouped.Today} expandedId={expandedId} onToggle={handleToggle} onClear={handleClear} onOpen={handleOpen} />
            <DateGroup label="Yesterday" items={grouped.Yesterday} expandedId={expandedId} onToggle={handleToggle} onClear={handleClear} onOpen={handleOpen} />
            <DateGroup label="Last 7 days" items={grouped['Last 7 days']} expandedId={expandedId} onToggle={handleToggle} onClear={handleClear} onOpen={handleOpen} />
            <DateGroup label="Older" items={grouped.Older} expandedId={expandedId} onToggle={handleToggle} onClear={handleClear} onOpen={handleOpen} />
          </>
        )}
      </div>
    </div>
  );
}