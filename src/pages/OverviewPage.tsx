import { useState, useEffect, useCallback } from 'react';
import type { Repository } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ApiOverviewResponse, ApiOverviewCommit } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  GitBranch,
  Star,
  FileCode,
  Boxes,
  Clock,
  CheckCircle,
  Network,
  BookOpen,
  Workflow,
  GitCommit,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Folder,
  Zap,
  Calendar,
  Scan,
} from 'lucide-react';

interface OverviewPageProps {
  repository: Repository;
  repoId?: string | null;
  onRescan?: () => void;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3776ab',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#ed8b00',
  Ruby: '#cc342d',
  Swift: '#fa7343',
};

const COMMIT_TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  feat:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: 'feat'  },
  fix:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: 'fix'   },
  docs:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'docs'  },
  refactor:{ color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'refactor' },
  chore:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'chore' },
  test:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'test'  },
  perf:    { color: '#f472b6', bg: 'rgba(244,114,182,0.1)', label: 'perf'  },
};

// ── Card section header (bordered, compact) ───────────────────────────────────
function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <CardTitle className="text-[13px] font-semibold tracking-tight text-foreground">
        {title}
      </CardTitle>
      {children}
    </div>
  );
}

// ── Repo metadata cell ────────────────────────────────────────────────────────
function MetaItem({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('px-5 py-3', className)}>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function CommitTypePill({ type }: { type: string }) {
  const meta = COMMIT_TYPE_META[type] ?? {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.1)',
    label: type,
  };
  return (
    <Badge
      variant="outline"
      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: meta.bg,
        color: meta.color,
        borderColor: `${meta.color}22`,
      }}
    >
      {meta.label}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <Card
      className="animate-fade-in-up gap-0 p-0 shadow-xs transition-all hover:-translate-y-px hover:border-border hover:shadow-md"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <CardContent className="px-5 py-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-ramp-blue/15 bg-ramp-blue/10 text-ramp-blue">
          <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-heading text-2xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function OverviewPage({ repository, repoId, onRescan }: OverviewPageProps) {
  const [overview, setOverview] = useState<ApiOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'all' | '7d' | '14d' | '30d' | '3m' | 'custom'>('all');
  const [customSince, setCustomSince] = useState('');
  const [customUntil, setCustomUntil] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isBehind, setIsBehind] = useState(false);
  const [behindBy, setBehindBy] = useState(0);

  const effectiveRepoId = repoId ?? localStorage.getItem('ramp_connected_repo_id');

  const getDateParams = useCallback(() => {
    const now = new Date();
    switch (timeRange) {
      case '7d': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return { since: d.toISOString().split('T')[0] };
      }
      case '14d': {
        const d = new Date(now);
        d.setDate(d.getDate() - 14);
        return { since: d.toISOString().split('T')[0] };
      }
      case '30d': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return { since: d.toISOString().split('T')[0] };
      }
      case '3m': {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        return { since: d.toISOString().split('T')[0] };
      }
      case 'custom':
        return {
          since: customSince || undefined,
          until: customUntil || undefined,
        };
      default:
        return {};
    }
  }, [timeRange, customSince, customUntil]);

  const initOverview = useCallback(async (isRefresh = false) => {
    if (!effectiveRepoId) return;
    setError(null);
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const { since, until } = getDateParams();
      const data = await api.overview.getOverview(effectiveRepoId, since, until);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [effectiveRepoId, getDateParams]);

  useEffect(() => {
    if (effectiveRepoId) initOverview();
  }, [effectiveRepoId, initOverview]);

  useEffect(() => {
    const checkSyncStatus = async () => {
      if (!effectiveRepoId) return;
      try {
        const status = await api.scan.getSyncStatus(effectiveRepoId);
        setIsBehind(status.is_behind);
        setBehindBy(status.behind_by);
      } catch {
        setIsBehind(false);
        setBehindBy(0);
      }
    };
    checkSyncStatus();
  }, [effectiveRepoId]);

  const stats = overview?.stats;
  const recentCommits = overview?.recent_commits ?? [];
  const langColor = LANGUAGE_COLORS[repository.language ?? ''] ?? '#6b7280';

  const quickStats = [
    { label: 'Files',        value: stats?.files?.toLocaleString()        ?? '—', icon: FileCode },
    { label: 'Folders',      value: stats?.folders?.toLocaleString()      ?? '—', icon: Folder   },
    { label: 'Functions',    value: stats?.functions?.toLocaleString()    ?? '—', icon: Network  },
    { label: 'Dependencies', value: stats?.dependencies?.toLocaleString() ?? '—', icon: Boxes    },
  ];

  const timeRangeLabel = timeRange === 'all'
    ? 'All time'
    : timeRange === 'custom'
    ? `${customSince || '...'} → ${customUntil || '...'}`
    : timeRange === '3m'
    ? 'Last 3 months'
    : `Last ${timeRange.replace('d', '')} days`;

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 bg-background">
        <Spinner className="h-[22px] w-[22px] text-ramp-blue" />
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 lg:px-10">
        <Alert
          variant="destructive"
          className="animate-fade-in border-destructive/20 bg-destructive/10"
        >
          <AlertCircle />
          <AlertTitle className="text-sm font-semibold">Failed to load overview</AlertTitle>
          <AlertDescription className="gap-2.5">
            <p className="text-[13px] text-muted-foreground">{error}</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-1 p-0 text-[13px] font-medium text-ramp-blue hover:opacity-75"
              onClick={() => initOverview()}
            >
              Try again <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] animate-fade-in px-6 pb-12 pt-8 font-sans lg:px-10">
      {/* ── Sync notification ── */}
      {isBehind && (
        <Alert className="mb-[18px] animate-fade-in-up rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle />
          <AlertDescription className="w-full justify-items-stretch text-[13px] text-amber-700 dark:text-amber-300">
            <div className="flex w-full flex-wrap items-center gap-2.5">
              <span>
                Repository is{' '}
                <strong className="font-semibold">
                  {behindBy} commit{behindBy !== 1 ? 's' : ''} behind
                </strong>{' '}
                remote. Rescan to sync the latest changes.
              </span>
              {onRescan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 rounded-lg border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                  onClick={onRescan}
                >
                  Rescan now
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Header ── */}
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" strokeWidth={2} />
            <span>{repository.fullName}</span>
          </div>
          <h1 className="font-heading text-[27px] font-bold leading-tight tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Codebase at a glance — analysis current as of right now.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Live sync pill */}
          <Badge
            variant="outline"
            className={cn(
              'h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
              isBehind
                ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 animate-pulse-glow rounded-full',
                isBehind ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
            {isBehind ? 'Out of Sync' : 'In Sync'}
          </Badge>

          {/* Time range selector */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-[3px] shadow-xs">
            {[
              { label: 'All', value: 'all' as const },
              { label: '7D', value: '7d' as const },
              { label: '14D', value: '14d' as const },
              { label: '30D', value: '30d' as const },
              { label: '3M', value: '3m' as const },
            ].map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-[26px] min-w-8 rounded-md px-2 font-mono text-[11px] font-semibold',
                  timeRange === option.value
                    ? 'bg-ramp-blue text-white shadow-glow-sm hover:bg-ramp-blue-dark hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => { setTimeRange(option.value); setShowCustomPicker(false); }}
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-[26px] min-w-8 rounded-md px-2',
                timeRange === 'custom'
                  ? 'bg-ramp-blue text-white shadow-glow-sm hover:bg-ramp-blue-dark hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => { setTimeRange('custom'); setShowCustomPicker(v => !v); }}
              title="Custom date range"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => initOverview(true)}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>

          {/* Rescan */}
          {onRescan && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
              onClick={onRescan}
              title="Re-scan repository"
            >
              <Scan className="h-3.5 w-3.5" />
              <span>Rescan</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Custom date picker ── */}
      {showCustomPicker && (
        <Card className="mb-5 animate-fade-in-up gap-0 p-0 shadow-xs">
          <CardContent className="flex flex-wrap items-end gap-3 px-[18px] py-3.5">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ov-date-from"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                From
              </Label>
              <Input
                id="ov-date-from"
                type="date"
                value={customSince}
                onChange={(e) => setCustomSince(e.target.value)}
                className="h-8 w-[168px] rounded-lg bg-muted/40 font-mono text-[12.5px] focus-visible:border-ramp-blue focus-visible:ring-ramp-blue/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ov-date-to"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                To
              </Label>
              <Input
                id="ov-date-to"
                type="date"
                value={customUntil}
                onChange={(e) => setCustomUntil(e.target.value)}
                className="h-8 w-[168px] rounded-lg bg-muted/40 font-mono text-[12.5px] focus-visible:border-ramp-blue focus-visible:ring-ramp-blue/30"
              />
            </div>
            <Button
              size="sm"
              className="h-8 rounded-lg bg-ramp-blue px-4 text-xs font-semibold text-white hover:bg-ramp-blue-dark hover:shadow-glow-sm"
              onClick={() => initOverview()}
              disabled={!customSince}
            >
              Apply
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Stat row ── */}
      <div className="mb-7 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {quickStats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 60} />
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-4">

          {/* Repo summary */}
          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            <SectionHeader title="Repository">
              <a
                href={`https://github.com/${repository.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-ramp-blue opacity-80 transition-opacity hover:opacity-100"
              >
                Open on GitHub <ExternalLink className="h-[11px] w-[11px]" />
              </a>
            </SectionHeader>
            <CardContent className="grid grid-cols-2 p-0 py-1">
              <MetaItem label="Name" className="border-b border-border">
                <p className="text-[13.5px] font-medium text-foreground">{repository.name}</p>
              </MetaItem>
              <MetaItem label="Language" className="border-b border-border">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: langColor }}
                  />
                  <span className="text-[13.5px] font-medium text-foreground">
                    {repository.language}
                  </span>
                </div>
              </MetaItem>
              <MetaItem label="Stars" className="border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[13.5px] font-medium tabular-nums text-foreground">
                    {repository.stars?.toLocaleString()}
                  </span>
                </div>
              </MetaItem>
              <MetaItem label="Forks" className="border-b border-border">
                <p className="text-[13.5px] font-medium tabular-nums text-foreground">
                  {repository.forks?.toLocaleString()}
                </p>
              </MetaItem>
              <MetaItem label="Description" className="col-span-2 border-b border-border">
                <p className="text-[13.5px] font-normal leading-relaxed text-muted-foreground">
                  {repository.description ?? 'No description provided.'}
                </p>
              </MetaItem>
              <MetaItem label="Last updated">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[13.5px] font-medium text-foreground">
                    {timeAgo(repository.updatedAt)}
                  </span>
                </div>
              </MetaItem>
              <MetaItem label="Analysis">
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle className="h-[11px] w-[11px]" />
                  Up to date
                </Badge>
              </MetaItem>
            </CardContent>
          </Card>

          {/* Recent changes */}
          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            <SectionHeader title="Recent commits">
              <Badge
                variant="secondary"
                className="h-5 min-w-5 border-transparent bg-ramp-blue/10 px-1.5 font-mono text-[11px] font-semibold tabular-nums text-ramp-blue"
              >
                {recentCommits.length}
              </Badge>
            </SectionHeader>
            <CardContent className="p-0">
              {recentCommits.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-muted-foreground">
                  No recent commits found.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentCommits.map((commit: ApiOverviewCommit, i) => (
                    <li
                      key={commit.sha}
                      className="flex animate-fade-in-up items-start justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {commit.message}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                            <span className="font-medium">{commit.author}</span>
                            <span className="opacity-40">·</span>
                            {timeAgo(commit.date)}
                          </p>
                        </div>
                      </div>
                      <CommitTypePill type={commit.type} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            <SectionHeader title="Quick actions" />
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {[
                {
                  icon: Network,
                  label: 'View Architecture',
                  sub: 'Explore the system diagram',
                  accent: '#60a5fa',
                  accentBg: 'rgba(96,165,250,0.08)',
                },
                {
                  icon: BookOpen,
                  label: 'Read Storybook',
                  sub: 'Learn the codebase structure',
                  accent: '#a78bfa',
                  accentBg: 'rgba(167,139,250,0.08)',
                },
                {
                  icon: Workflow,
                  label: 'Trace Flows',
                  sub: 'Follow feature execution paths',
                  accent: '#34d399',
                  accentBg: 'rgba(52,211,153,0.08)',
                },
                {
                  icon: Zap,
                  label: 'Run Analysis',
                  sub: 'Re-analyze the latest changes',
                  accent: '#fbbf24',
                  accentBg: 'rgba(251,191,36,0.08)',
                },
              ].map((action, i) => (
                <button
                  key={i}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                    style={{ background: action.accentBg, color: action.accent }}
                  >
                    <action.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-1 flex-col gap-px">
                    <span className="text-[13px] font-medium text-foreground">{action.label}</span>
                    <span className="text-[11.5px] text-muted-foreground">{action.sub}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Activity spark */}
          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            <SectionHeader title="Commit activity">
              <span className="text-xs text-muted-foreground">{timeRangeLabel}</span>
            </SectionHeader>
            <CardContent className="p-0">
              <CommitSparkline commits={recentCommits} timeRange={timeRange} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

/** Mini bar chart for recent commit cadence */
function CommitSparkline({ commits, timeRange }: { commits: ApiOverviewCommit[]; timeRange: string }) {
  const now = new Date();
  let periods: number;
  let bucketDays: number;
  let labelFormat: Intl.DateTimeFormatOptions;

  switch (timeRange) {
    case '7d':
      periods = 7;
      bucketDays = 1;
      labelFormat = { weekday: 'short' };
      break;
    case '14d':
      periods = 7;
      bucketDays = 2;
      labelFormat = { weekday: 'short' };
      break;
    case '30d':
      periods = 6;
      bucketDays = 5;
      labelFormat = { month: 'short', day: 'numeric' };
      break;
    case '3m':
      periods = 6;
      bucketDays = 15;
      labelFormat = { month: 'short' };
      break;
    default: {
      if (commits.length === 0) {
        periods = 6;
        bucketDays = 30;
        labelFormat = { month: 'short', year: '2-digit' };
      } else {
        periods = Math.min(12, Math.max(commits.length, 6));
        const oldest = new Date(commits[commits.length - 1].date);
        const newest = new Date(commits[0].date);
        const totalDays = Math.max(Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)), 1);
        bucketDays = Math.ceil(totalDays / periods);
        labelFormat = { month: 'short', year: '2-digit' };
      }
      break;
    }
  }

  const labels: string[] = [];
  const counts: number[] = [];

  for (let i = 0; i < periods; i++) {
    const bucketStart = new Date(now);
    bucketStart.setDate(bucketStart.getDate() - (periods - i) * bucketDays);
    const bucketEnd = new Date(now);
    bucketEnd.setDate(bucketEnd.getDate() - (periods - 1 - i) * bucketDays);

    const count = commits.filter((c) => {
      const cd = new Date(c.date);
      return cd >= bucketStart && cd < bucketEnd;
    }).length;

    const labelDate = new Date(now);
    labelDate.setDate(labelDate.getDate() - (periods - 1 - i) * bucketDays);
    labels.push(labelDate.toLocaleDateString('en-US', labelFormat));
    counts.push(count);
  }

  const max = Math.max(...counts, 1);

  return (
    <div className="flex h-[140px] items-end gap-1.5 px-5 pb-3.5 pt-[18px]">
      {counts.map((count, i) => {
        const pct = count / max;
        const isEmpty = count === 0;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
            <span className="h-3.5 text-[10px] font-semibold leading-[14px] tabular-nums text-muted-foreground">
              {count > 0 ? count : ''}
            </span>
            <div className="flex w-full flex-1 flex-col items-center justify-end">
              <div
                className={cn(
                  'min-h-1 w-[70%] rounded-t transition-[height] duration-300',
                  isEmpty
                    ? 'bg-muted'
                    : 'bg-gradient-to-t from-ramp-blue to-ramp-blue-light'
                )}
                style={{
                  height: `${Math.max(pct * 80, isEmpty ? 6 : 10)}px`,
                }}
                title={`${count} commit${count !== 1 ? 's' : ''}`}
              />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
