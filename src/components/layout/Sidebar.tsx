import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ViewState, Repository } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Network,
  Workflow,
  BookOpen,
  MessageSquare,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  Circle,
  ChevronsUpDown,
  Check,
  Plus,
  Star,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen: boolean;
  onToggle: () => void;
  repository: Repository | null;
  repositories?: Repository[];
  onSelectRepository?: (repo: Repository) => void;
  onAddRepository?: () => void;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'flows',        label: 'Flows',        icon: Workflow },
  { id: 'storybook',    label: 'Storybook',    icon: BookOpen },
];

const secondaryNavItems: NavItem[] = [
  { id: 'team',     label: 'Team',     icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Dark mode hook ───────────────────────────────────────────────────────────

function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Nav button ───────────────────────────────────────────────────────────────

function NavButton({
  item, isActive, isOpen, onClick,
}: {
  item: NavItem; isActive: boolean; isOpen: boolean; onClick: () => void;
}) {
  const Icon = item.icon;
  const btn = (
    <button
      onClick={onClick}
      className={cn('snb', isActive && 'snb-active', !isOpen && 'snb-collapsed')}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="snb-stripe" aria-hidden />
      <Icon className="snb-icon" />
      {isOpen && (
        <>
          <span className="snb-label">{item.label}</span>
          {item.badge && <span className="snb-badge">{item.badge}</span>}
        </>
      )}
    </button>
  );

  if (!isOpen) {
    return (
      <Tooltip key={item.id} delayDuration={0}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="s-tip">
          {item.label}
          {item.badge && <span className="s-tip-badge">{item.badge}</span>}
        </TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}

// ─── Repo switcher ────────────────────────────────────────────────────────────

function RepoSwitcher({
  repository, repositories = [], sidebarOpen, onSelect, onAdd,
}: {
  repository: Repository | null;
  repositories: Repository[];
  sidebarOpen: boolean;
  onSelect?: (repo: Repository) => void;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = repositories.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const trigger = (
    <button
      onClick={() => setOpen(v => !v)}
      className={cn('repo-trigger', !sidebarOpen && 'repo-trigger-icon')}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label="Switch repository"
    >
      <span className="repo-trigger-dot-wrap">
        <GitBranch className="h-3 w-3" />
      </span>
      {sidebarOpen && (
        <>
          <span className="repo-trigger-info">
            <span className="repo-trigger-name">
              {repository ? repository.name : 'Select a repository'}
            </span>
            {repository && (
              <span className="repo-trigger-meta">
                {repository.fullName}
              </span>
            )}
          </span>
          <ChevronsUpDown className="repo-trigger-chevron" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </>
      )}
    </button>
  );

  return (
    <div ref={ref} className="repo-wrap">
      {!sidebarOpen ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="s-tip">
            {repository ? repository.fullName : 'Select repository'}
          </TooltipContent>
        </Tooltip>
      ) : trigger}

      {open && sidebarOpen && (
        <div className="repo-dd" role="listbox">
          <div className="repo-dd-search-row">
            <input
              className="repo-dd-search"
              placeholder="Search repos…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="repo-dd-list">
            {filtered.length === 0 ? (
              <div className="repo-dd-empty">No repositories found</div>
            ) : filtered.map(repo => {
              const sel = repository?.id === repo.id;
              return (
                <button
                  key={repo.id}
                  className={cn('repo-dd-opt', sel && 'repo-dd-opt-sel')}
                  role="option"
                  aria-selected={sel}
                  onClick={() => { onSelect?.(repo); setOpen(false); setSearch(''); }}
                >
                  <span className="repo-dd-name">{repo.name}</span>
                  <span className="repo-dd-meta">
                    {repo.language !== 'Unknown' && (
                      <span className="repo-dd-lang">{repo.language}</span>
                    )}
                    {repo.stars > 0 && (
                      <>
                        <Star className="h-2.5 w-2.5 repo-dd-star" />
                        <span>{repo.stars.toLocaleString()}</span>
                      </>
                    )}
                  </span>
                  {sel && <Check className="repo-dd-check" />}
                </button>
              );
            })}
          </div>

          <div className="repo-dd-footer">
            <button className="repo-dd-add" onClick={() => { onAdd?.(); setOpen(false); setSearch(''); }}>
              <Plus className="h-3 w-3" />
              Connect new repository
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({
  currentView, onNavigate, isOpen, onToggle,
  repository, repositories = [], onSelectRepository, onAddRepository,
}: SidebarProps) {
  const isDark = useIsDark();

  return (
    <TooltipProvider>
      <aside className={cn('s-root', isOpen ? 's-open' : 's-closed', isDark ? 's-dark' : 's-light')}>

        {/* Logo */}
        <div className="s-logo-row">
          <div className="s-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          {isOpen && <span className="s-wordmark">Ramp</span>}
          <button
            className="s-toggle"
            onClick={onToggle}
            style={{ marginLeft: isOpen ? 'auto' : undefined }}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Repo switcher */}
        <div className="s-repo-row">
          <RepoSwitcher
            repository={repository}
            repositories={repositories}
            sidebarOpen={isOpen}
            onSelect={onSelectRepository}
            onAdd={onAddRepository}
          />
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="s-nav">
            {isOpen && <span className="s-sec-label">Explore</span>}
            {mainNavItems.map(item => (
              <NavButton key={item.id} item={item} isActive={currentView === item.id} isOpen={isOpen} onClick={() => onNavigate(item.id)} />
            ))}
            <div className="s-divider" />
            {isOpen && <span className="s-sec-label">Manage</span>}
            {secondaryNavItems.map(item => (
              <NavButton key={item.id} item={item} isActive={currentView === item.id} isOpen={isOpen} onClick={() => onNavigate(item.id)} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="s-footer">
          {isOpen ? (
            <div className="s-status">
              <Circle className="s-dot" />
              <span>All systems operational</span>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="s-status s-status-c">
                  <Circle className="s-dot" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="s-tip">All systems operational</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      <style>{`
        /* ══ Tokens ═══════════════════════════════════════════════════ */
        .s-light {
          --bg:            #fafbfc;
          --border:        rgba(15,23,42,0.07);
          --text-hi:       #0f172a;
          --text-mid:      #475569;
          --text-lo:       #94a3b8;
          --hover-bg:      rgba(15,23,42,0.045);
          --active-bg:     rgba(79,109,255,0.09);
          --active-text:   #3a52cc;
          --stripe:        #4f6dff;
          --stripe-glow:   rgba(79,109,255,0.4);
          --mark-bg:       linear-gradient(135deg, #4f6dff, #7b8fff);
          --mark-border:   transparent;
          --mark-color:    #ffffff;
          --toggle-border: rgba(15,23,42,0.09);
          --toggle-color:  #94a3b8;
          --toggle-hbg:    rgba(15,23,42,0.05);
          --toggle-hcolor: #475569;
          --chip-bg:       rgba(15,23,42,0.03);
          --chip-border:   rgba(15,23,42,0.08);
          --chip-hborder:  rgba(79,109,255,0.3);
          --chip-hbg:      rgba(79,109,255,0.06);
          --badge-bg:      rgba(79,109,255,0.1);
          --badge-color:   #3a52cc;
          --badge-border:  rgba(79,109,255,0.22);
          --status-color:  #94a3b8;
          --dd-bg:         #ffffff;
          --dd-border:     rgba(15,23,42,0.09);
          --dd-shadow:     0 12px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06);
          --input-bg:      #f8fafc;
          --input-border:  rgba(15,23,42,0.09);
          --opt-hover:     rgba(15,23,42,0.04);
          --opt-sel-bg:    rgba(79,109,255,0.08);
          --opt-sel-color: #3a52cc;
          --add-bg:        rgba(15,23,42,0.02);
          --add-border:    rgba(15,23,42,0.08);
          --add-hbg:       rgba(15,23,42,0.05);
          --add-color:     #64748b;
        }
        .s-dark {
          --bg:            #0a0c10;
          --border:        rgba(255,255,255,0.07);
          --text-hi:       #f1f5f9;
          --text-mid:      #94a3b8;
          --text-lo:       #475569;
          --hover-bg:      rgba(255,255,255,0.045);
          --active-bg:     rgba(99,140,255,0.14);
          --active-text:   #a5b4fc;
          --stripe:        #7b8fff;
          --stripe-glow:   rgba(123,143,255,0.6);
          --mark-bg:       linear-gradient(135deg, #4f6dff, #7b8fff);
          --mark-border:   transparent;
          --mark-color:    #ffffff;
          --toggle-border: rgba(255,255,255,0.08);
          --toggle-color:  rgba(255,255,255,0.3);
          --toggle-hbg:    rgba(255,255,255,0.05);
          --toggle-hcolor: rgba(255,255,255,0.7);
          --chip-bg:       rgba(255,255,255,0.03);
          --chip-border:   rgba(255,255,255,0.07);
          --chip-hborder:  rgba(99,140,255,0.35);
          --chip-hbg:      rgba(99,140,255,0.1);
          --badge-bg:      rgba(99,140,255,0.18);
          --badge-color:   #a5b4fc;
          --badge-border:  rgba(99,140,255,0.3);
          --status-color:  rgba(255,255,255,0.25);
          --dd-bg:         #12141a;
          --dd-border:     rgba(255,255,255,0.09);
          --dd-shadow:     0 12px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4);
          --input-bg:      rgba(255,255,255,0.04);
          --input-border:  rgba(255,255,255,0.09);
          --opt-hover:     rgba(255,255,255,0.04);
          --opt-sel-bg:    rgba(99,140,255,0.14);
          --opt-sel-color: #a5b4fc;
          --add-bg:        rgba(255,255,255,0.02);
          --add-border:    rgba(255,255,255,0.08);
          --add-hbg:       rgba(255,255,255,0.05);
          --add-color:     rgba(255,255,255,0.35);
        }

        /* ══ Root ════════════════════════════════════════════════════ */
        .s-root {
          display: flex; flex-direction: column; height: 100%;
          background: var(--bg);
          border-right: 1px solid var(--border);
          transition: width 280ms cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          font-family: 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        }
        .s-open  { width: 232px; }
        .s-closed { width: 60px; }

        /* ══ Logo row ════════════════════════════════════════════════ */
        .s-logo-row {
          display: flex; align-items: center; gap: 10px;
          height: 56px; padding: 0 14px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .s-mark {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--mark-bg); border: 1px solid var(--mark-border);
          color: var(--mark-color); flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(79,109,255,0.35);
          transition: transform .2s, box-shadow .2s;
        }
        .s-mark:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79,109,255,0.45);
        }
        .s-wordmark {
          font-family: 'Space Grotesk','Inter',sans-serif;
          font-size: 15px; font-weight: 700; letter-spacing: -0.03em;
          color: var(--text-hi); white-space: nowrap;
        }
        .s-toggle {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 5px;
          border: 1px solid var(--toggle-border);
          background: transparent; color: var(--toggle-color);
          cursor: pointer; flex-shrink: 0; transition: all .15s;
        }
        .s-toggle:hover {
          background: var(--toggle-hbg);
          color: var(--toggle-hcolor);
        }

        /* ══ Repo section ════════════════════════════════════════════ */
        .s-repo-row {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .repo-wrap { position: relative; }

        .repo-trigger {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 7px 9px; border-radius: 8px;
          border: 1px solid var(--chip-border);
          background: var(--chip-bg); cursor: pointer; text-align: left;
          transition: border-color .15s, background .15s;
        }
        .repo-trigger:hover {
          border-color: var(--chip-hborder); background: var(--chip-hbg);
        }
        .repo-trigger-icon {
          justify-content: center; padding: 7px;
          width: 32px; margin: 0 auto;
        }
        .repo-trigger-dot-wrap {
          display: flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; flex-shrink: 0; color: var(--text-lo);
        }
        .repo-trigger-info {
          display: flex; flex-direction: column; gap: 1px;
          flex: 1; min-width: 0;
        }
        .repo-trigger-name {
          font-size: 12.5px; font-weight: 600; letter-spacing: -0.02em;
          color: var(--text-hi);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .repo-trigger-meta {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text-lo);
          font-family: 'JetBrains Mono','Fira Code','SF Mono',monospace;
        }
        .repo-meta-sep {
          width: 2px; height: 2px; border-radius: 50%;
          background: var(--text-lo); flex-shrink: 0;
        }
        .repo-trigger-chevron {
          width: 12px; height: 12px; flex-shrink: 0;
          color: var(--text-lo); transition: transform .2s ease;
        }

        /* Dropdown */
        .repo-dd {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: var(--dd-bg);
          border: 1px solid var(--dd-border);
          border-radius: 10px; box-shadow: var(--dd-shadow);
          z-index: 100; overflow: hidden;
          animation: repopop .15s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes repopop {
          from { opacity:0; transform: translateY(-6px) scale(.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        .repo-dd-search-row { padding: 8px 8px 5px; }
        .repo-dd-search {
          width: 100%; padding: 6px 10px; border-radius: 6px;
          border: 1px solid var(--input-border); background: var(--input-bg);
          color: var(--text-hi);
          font-size: 11.5px; font-family: inherit; outline: none;
          transition: border-color .15s;
        }
        .repo-dd-search::placeholder { color: var(--text-lo); }
        .repo-dd-search:focus { border-color: var(--stripe); }

        .repo-dd-list { max-height: 220px; overflow-y: auto; padding: 3px 6px; }
        .repo-dd-empty {
          padding: 16px 10px; text-align: center;
          font-size: 11.5px; color: var(--text-lo);
        }
        .repo-dd-opt {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 10px; border-radius: 7px;
          border: none; background: transparent; cursor: pointer;
          text-align: left; transition: background .12s;
        }
        .repo-dd-opt:hover { background: var(--opt-hover); }
        .repo-dd-opt-sel { background: var(--opt-sel-bg) !important; }
        .repo-dd-name {
          flex: 1; font-size: 12.5px; font-weight: 500; letter-spacing: -0.02em;
          color: var(--text-hi);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .repo-dd-opt-sel .repo-dd-name { color: var(--opt-sel-color); font-weight: 600; }
        .repo-dd-meta {
          display: flex; align-items: center; gap: 3px;
          font-size: 10.5px; color: var(--text-lo); flex-shrink: 0;
        }
        .repo-dd-lang {
          padding: 2px 6px; border-radius: 4px;
          background: var(--hover-bg); color: var(--text-lo);
          font-size: 10px; font-weight: 600;
        }
        .repo-dd-star { color: var(--text-lo); }
        .repo-dd-check { width: 12px; height: 12px; color: var(--stripe); flex-shrink: 0; }
        .repo-dd-footer {
          padding: 5px 8px 8px;
          border-top: 1px solid var(--border);
        }
        .repo-dd-add {
          display: flex; align-items: center; gap: 7px;
          width: 100%; padding: 6px 9px; border-radius: 6px;
          border: 1px dashed var(--add-border);
          background: var(--add-bg); color: var(--add-color);
          font-family: inherit; font-size: 11px; font-weight: 500;
          cursor: pointer; transition: all .15s;
        }
        .repo-dd-add:hover {
          background: var(--add-hbg); color: var(--text-mid);
          border-style: solid;
        }

        /* ══ Nav ═════════════════════════════════════════════════════ */
        .s-nav { display: flex; flex-direction: column; gap: 2px; padding: 12px 10px; }
        .s-sec-label {
          display: block; font-size: 10px; font-weight: 600;
          letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-lo); padding: 0 10px; margin-bottom: 6px; margin-top: 4px;
        }
        .s-divider { height: 1px; background: var(--border); margin: 10px 6px 12px; }

        .snb {
          position: relative; display: flex; align-items: center; gap: 10px;
          width: 100%; height: 36px; padding: 0 10px;
          border-radius: 8px; border: none; background: transparent;
          cursor: pointer; text-align: left; overflow: hidden;
          color: var(--text-lo); transition: background .15s, color .15s;
        }
        .snb-collapsed { justify-content: center; padding: 0; width: 40px; margin: 0 auto; }
        .snb:hover { background: var(--hover-bg); color: var(--text-mid); }
        .snb-active { background: var(--active-bg) !important; color: var(--active-text) !important; }

        .snb-stripe {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%) scaleY(0);
          width: 3px; height: 18px; border-radius: 0 3px 3px 0;
          background: var(--stripe); box-shadow: 0 0 10px var(--stripe-glow);
          transition: transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .snb-active .snb-stripe { transform: translateY(-50%) scaleY(1); }
        .snb-collapsed .snb-stripe { display: none; }

        .snb-icon { width: 16px; height: 16px; flex-shrink: 0; opacity: .65; transition: opacity .15s; }
        .snb:hover .snb-icon, .snb-active .snb-icon { opacity: 1; }

        .snb-label {
          font-size: 13px; font-weight: 500; letter-spacing: -0.01em;
          white-space: nowrap; flex: 1; color: inherit;
        }
        .snb-active .snb-label { font-weight: 600; }

        .snb-badge {
          font-size: 9.5px; font-weight: 700; letter-spacing: .05em;
          padding: 2px 6px; border-radius: 5px;
          background: var(--badge-bg); color: var(--badge-color);
          border: 1px solid var(--badge-border); flex-shrink: 0;
        }

        /* ══ Tooltip ═════════════════════════════════════════════════ */
        .s-tip { display: flex; align-items: center; gap: 6px; font-size: 12px; font-family: 'Inter',sans-serif; }
        .s-tip-badge {
          font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;
          background: rgba(79,109,255,.2); color: #a5b4fc;
        }

        /* ══ Footer ══════════════════════════════════════════════════ */
        .s-footer { padding: 12px 14px; border-top: 1px solid var(--border); flex-shrink: 0; }
        .s-status {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; color: var(--status-color);
          letter-spacing: -0.01em; padding: 0 2px;
        }
        .s-status-c { justify-content: center; cursor: default; }
        .s-dot {
          width: 6px !important; height: 6px !important;
          color: #22c55e; fill: #22c55e; flex-shrink: 0;
          filter: drop-shadow(0 0 3px rgba(34,197,94,.6));
          animation: sdot 2.5s ease-in-out infinite;
        }
        @keyframes sdot {
          0%,100% { opacity:1; filter: drop-shadow(0 0 3px rgba(34,197,94,.6)); }
          50%      { opacity:.5; filter: drop-shadow(0 0 1px rgba(34,197,94,.2)); }
        }
      `}</style>
    </TooltipProvider>
  );
}