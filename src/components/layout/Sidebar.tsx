import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ViewState, Repository, User } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Inbox as InboxIcon,
  Network,
  Workflow,
  BookOpen,
  Video,
  MessageSquare,
  Folder,
  FileText,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  Circle,
  ChevronsUpDown,
  ChevronRight,
  Check,
  Plus,
  Search,
  SquarePen,
  Star,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

// ─── Shared focus-reset — every interactive control in this file uses this
// instead of relying on browser/Radix defaults, which can still show a ring
// on plain `focus` (not just `focus-visible`) or via ring-offset. ──────────
const noFocusRing =
  'outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0';

// ─── Knowledge data shape ─────────────────────────────────────────────────────
// Docs are grouped into categories, e.g. { id: 'getting-started', label: 'Getting started',
// docs: [{ id: 'setup', label: 'Setup guide' }, ...] }

export interface KnowledgeDoc {
  id: string;
  label: string;
}

export interface KnowledgeCategory {
  id: string;
  label: string;
  docs: KnowledgeDoc[];
}

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen: boolean;
  onToggle: () => void;
  repository: Repository | null;
  repositories?: Repository[];
  onSelectRepository?: (repo: Repository) => void;
  onAddRepository?: () => void;
  user: User | null;
  onLogout?: () => void;
  knowledgeCategories?: KnowledgeCategory[];
  activeDocId?: string;
  onSelectDoc?: (docId: string) => void;
  onCreateCategory?: (label: string) => void;
  onCreateDoc?: (categoryId: string, label: string) => void;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const inboxItem: NavItem = { id: 'inbox', label: 'Inbox', icon: InboxIcon };

const exploreItems: NavItem[] = [
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'flows', label: 'Flows', icon: Workflow },
  { id: 'storybook', label: 'Storybook', icon: BookOpen },
];

const syncItems: NavItem[] = [
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

// ─── Row primitive — flat, no borders, subtle hover only ─────────────────────

function Row({
  icon: Icon,
  label,
  isActive,
  isOpen,
  onClick,
  badge,
  indent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  isOpen: boolean;
  onClick?: () => void;
  badge?: string;
  indent?: boolean;
}) {
  const row = (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex h-[30px] w-full items-center gap-2 rounded-md text-sm transition-colors',
        noFocusRing,
        isOpen ? 'px-2' : 'justify-center px-0',
        indent && isOpen && 'pl-7',
        isActive
          ? 'bg-foreground/[0.06] font-medium text-foreground'
          : 'text-foreground/80 hover:bg-foreground/[0.045]'
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0 text-foreground/55 group-hover:text-foreground/70" />
      {isOpen && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {badge && (
            <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] text-foreground/50">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  if (!isOpen) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return row;
}

// ─── Collapsible section header ──────────────────────────────────────────────

function SectionHeader({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group flex h-6 w-full items-center gap-1 rounded px-2 text-xs font-medium text-foreground/40 hover:text-foreground/65',
        noFocusRing
      )}
    >
      <span>{label}</span>
      <ChevronRight
        className={cn(
          'h-3 w-3 shrink-0 opacity-0 transition-transform group-hover:opacity-100',
          !collapsed && 'rotate-90'
        )}
      />
    </button>
  );
}

// ─── Inline create input — commits on Enter/blur, cancels on Escape ──────────

function NewItemInput({
  icon: Icon,
  placeholder,
  indent = false,
  onSubmit,
  onCancel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  indent?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');

  return (
    <div
      className={cn(
        'flex h-[26px] items-center gap-1.5 rounded-md px-2',
        indent && 'pl-7'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onSubmit(value);
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={() => (value.trim() ? onSubmit(value) : onCancel())}
        className={cn(
          'w-full min-w-0 bg-transparent text-[13px] text-foreground/85 placeholder:text-foreground/35',
          noFocusRing
        )}
      />
    </div>
  );
}

// ─── Knowledge section — categories of docs, each independently collapsible ──

function KnowledgeSection({
  categories,
  isOpen,
  sectionCollapsed,
  onToggleSection,
  activeDocId,
  onSelectDoc,
  onCreateCategory,
  onCreateDoc,
}: {
  categories: KnowledgeCategory[];
  isOpen: boolean;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  activeDocId?: string;
  onSelectDoc?: (docId: string) => void;
  onCreateCategory?: (label: string) => void;
  onCreateDoc?: (categoryId: string, label: string) => void;
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(categories.map(c => c.id))
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingDocFor, setCreatingDocFor] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const createCategory = (label: string) => {
    if (label.trim()) onCreateCategory?.(label.trim());
    setCreatingCategory(false);
  };

  const createDoc = (categoryId: string, label: string) => {
    if (label.trim()) onCreateDoc?.(categoryId, label.trim());
    setCreatingDocFor(null);
  };

  // Collapsed sidebar mini-mode: only render something if there are docs to show
  if (!isOpen && categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {isOpen && (
        <div className="group flex h-6 w-full items-center gap-1 rounded">
          <button
            onClick={onToggleSection}
            className={cn(
              'flex h-6 flex-1 items-center gap-1 rounded px-2 text-xs font-medium text-foreground/40 hover:text-foreground/65',
              noFocusRing
            )}
          >
            <span>Knowledge</span>
            <ChevronRight
              className={cn(
                'h-3 w-3 shrink-0 opacity-0 transition-transform group-hover:opacity-100',
                !sectionCollapsed && 'rotate-90'
              )}
            />
          </button>
          {onCreateCategory && (
            <button
              onClick={e => {
                e.stopPropagation();
                setCreatingCategory(true);
              }}
              aria-label="New category"
              className={cn(
                'mr-1 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-foreground/[0.07] group-hover:opacity-100',
                noFocusRing
              )}
            >
              <Plus className="h-3 w-3 text-foreground/45" />
            </button>
          )}
        </div>
      )}

      {(!sectionCollapsed || !isOpen) &&
        categories.map(category => {
          const catOpen = openCategories.has(category.id);
          return (
            <div key={category.id} className="group/cat">
              {isOpen && (
                <div className="group flex h-[26px] w-full items-center gap-1.5 rounded-md pr-1 hover:bg-foreground/[0.045]">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md pl-2 text-[13px] text-foreground/65 hover:text-foreground/85',
                      noFocusRing
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 shrink-0 text-foreground/40 transition-transform',
                        catOpen && 'rotate-90'
                      )}
                    />
                    <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
                    <span className="flex-1 truncate text-left">{category.label}</span>
                  </button>
                  {onCreateDoc && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setCreatingDocFor(category.id);
                        setOpenCategories(prev => new Set(prev).add(category.id));
                      }}
                      aria-label={`New document in ${category.label}`}
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-foreground/[0.07] group-hover:opacity-100',
                        noFocusRing
                      )}
                    >
                      <Plus className="h-3 w-3 text-foreground/45" />
                    </button>
                  )}
                </div>
              )}
              {(catOpen || !isOpen) && (
                <>
                  {category.docs.map(doc => (
                    <Row
                      key={doc.id}
                      icon={FileText}
                      label={doc.label}
                      isActive={activeDocId === doc.id}
                      isOpen={isOpen}
                      indent={isOpen}
                      onClick={() => onSelectDoc?.(doc.id)}
                    />
                  ))}
                  {isOpen && creatingDocFor === category.id && (
                    <NewItemInput
                      icon={FileText}
                      indent
                      placeholder="New document"
                      onSubmit={label => createDoc(category.id, label)}
                      onCancel={() => setCreatingDocFor(null)}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      {isOpen && creatingCategory && (
        <NewItemInput
          icon={Folder}
          placeholder="New category"
          onSubmit={createCategory}
          onCancel={() => setCreatingCategory(false)}
        />
      )}
    </div>
  );
}

// ─── Repo switcher ────────────────────────────────────────────────────────────

function RepoSwitcher({
  repository,
  repositories = [],
  sidebarOpen,
  onSelect,
  onAdd,
}: {
  repository: Repository | null;
  repositories: Repository[];
  sidebarOpen: boolean;
  onSelect?: (repo: Repository) => void;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm hover:bg-foreground/[0.045]',
        noFocusRing,
        !sidebarOpen && 'w-8 justify-center px-0'
      )}
      aria-expanded={open}
      aria-label="Switch repository"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
        <GitBranch className="h-3 w-3" />
      </span>
      {sidebarOpen && (
        <>
          <span className="flex-1 truncate text-left font-semibold">
            {repository ? repository.name : 'Select a repository'}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
        </>
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {!sidebarOpen ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {repository ? repository.fullName : 'Select repository'}
          </TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}

      <PopoverContent align="start" className={cn('w-64 p-0', noFocusRing)}>
        <Command className="rounded-md border-none bg-transparent shadow-none">
          <CommandInput
            placeholder="Search repos…"
            className={cn('h-9 rounded-t-md border-none', noFocusRing)}
          />
          <CommandList>
            <CommandEmpty>No repositories found</CommandEmpty>
            <CommandGroup>
              {repositories.map(repo => {
                const sel = repository?.id === repo.id;
                return (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={() => {
                      onSelect?.(repo);
                      setOpen(false);
                    }}
                    className={cn('gap-2', noFocusRing)}
                  >
                    <span className="flex-1 truncate text-sm">{repo.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {repo.language !== 'Unknown' && <span>{repo.language}</span>}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          {repo.stars.toLocaleString()}
                        </span>
                      )}
                    </span>
                    <Check className={cn('h-3.5 w-3.5', sel ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full justify-start gap-2 text-muted-foreground', noFocusRing)}
              onClick={() => {
                onAdd?.();
                setOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Connect new repository
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── User menu — sits at the bottom of the sidebar ────────────────────────────

function UserFooter({
  user,
  sidebarOpen,
  onNavigate,
  onLogout,
}: {
  user: User | null;
  sidebarOpen: boolean;
  onNavigate: (view: ViewState) => void;
  onLogout?: () => void;
}) {
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const trigger = (
    <button
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md px-2',
        noFocusRing,
        'hover:bg-foreground/[0.045]',
        !sidebarOpen && 'w-9 justify-center px-0'
      )}
      aria-label="Account menu"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full" />
        ) : (
          initials
        )}
      </span>
      {sidebarOpen && (
        <>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-[1.15]">
            <span className="max-w-full truncate text-[13px] font-medium">{user.name}</span>
            <span className="max-w-full truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      {!sidebarOpen ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {user.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={sidebarOpen ? 'start' : 'center'}
        side="top"
        className={cn('w-44', noFocusRing)}
      >
        <DropdownMenuItem
          onClick={() => onNavigate('settings')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-[13px]">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNavigate('team')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-[13px]">Team</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNavigate('settings')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-[13px]">Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className={cn(
            'focus:bg-foreground/[0.045] focus:text-destructive text-destructive',
            noFocusRing
          )}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-[13px]">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({
  currentView,
  onNavigate,
  isOpen,
  onToggle,
  repository,
  repositories = [],
  onSelectRepository,
  onAddRepository,
  user,
  onLogout,
  knowledgeCategories = [],
  activeDocId,
  onSelectDoc,
  onCreateCategory,
  onCreateDoc,
}: SidebarProps) {
  const [exploreCollapsed, setExploreCollapsed] = useState(false);
  const [syncCollapsed, setSyncCollapsed] = useState(false);
  const [knowledgeCollapsed, setKnowledgeCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'relative flex h-full flex-col bg-muted/40 transition-[width] duration-200 ease-in-out',
          isOpen ? 'w-60' : 'w-14'
        )}
      >
        {/* Top row: repo switcher + actions */}
        <div className="flex shrink-0 items-center gap-1 px-2 pt-2.5">
          <div className="min-w-0 flex-1">
            <RepoSwitcher
              repository={repository}
              repositories={repositories}
              sidebarOpen={isOpen}
              onSelect={onSelectRepository}
              onAdd={onAddRepository}
            />
          </div>
          {isOpen && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 text-foreground/50', noFocusRing)}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 text-foreground/50', noFocusRing)}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="flex flex-col gap-4 px-2 pb-4 pt-3">
            {/* Inbox */}
            <div className="flex flex-col gap-0.5">
              <Row
                icon={inboxItem.icon}
                label={inboxItem.label}
                isActive={currentView === inboxItem.id}
                isOpen={isOpen}
                onClick={() => onNavigate(inboxItem.id)}
              />
            </div>

            {/* Explore */}
            <div className="flex flex-col gap-0.5">
              {isOpen && (
                <SectionHeader
                  label="Explore"
                  collapsed={exploreCollapsed}
                  onToggle={() => setExploreCollapsed(v => !v)}
                />
              )}
              {(!exploreCollapsed || !isOpen) &&
                exploreItems.map(item => (
                  <Row
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentView === item.id}
                    isOpen={isOpen}
                    onClick={() => onNavigate(item.id)}
                    badge={item.badge}
                  />
                ))}
            </div>

            {/* Sync (Meetings + Chat) */}
            <div className="flex flex-col gap-0.5">
              {isOpen && (
                <SectionHeader
                  label="Sync"
                  collapsed={syncCollapsed}
                  onToggle={() => setSyncCollapsed(v => !v)}
                />
              )}
              {(!syncCollapsed || !isOpen) &&
                syncItems.map(item => (
                  <Row
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentView === item.id}
                    isOpen={isOpen}
                    onClick={() => onNavigate(item.id)}
                    badge={item.badge}
                  />
                ))}
            </div>

            {/* Knowledge */}
            <KnowledgeSection
              categories={knowledgeCategories}
              isOpen={isOpen}
              sectionCollapsed={knowledgeCollapsed}
              onToggleSection={() => setKnowledgeCollapsed(v => !v)}
              activeDocId={activeDocId}
              onSelectDoc={onSelectDoc}
              onCreateCategory={onCreateCategory}
              onCreateDoc={onCreateDoc}
            />
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-0.5 px-2 pb-2.5">
          <UserFooter
            user={user}
            sidebarOpen={isOpen}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />

          <div className="flex items-center justify-between">
            {isOpen ? (
              <div className="flex h-8 items-center gap-2 px-1 text-xs text-foreground/40">
                <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                <span>All systems operational</span>
              </div>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex h-8 flex-1 items-center justify-center">
                    <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  All systems operational
                </TooltipContent>
              </Tooltip>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                'h-6 w-6 shrink-0 text-foreground/40 hover:text-foreground/70',
                noFocusRing,
                !isOpen && 'hidden'
              )}
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isOpen && (
          <div className="flex shrink-0 justify-center pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn('h-6 w-6 text-foreground/40 hover:text-foreground/70', noFocusRing)}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}