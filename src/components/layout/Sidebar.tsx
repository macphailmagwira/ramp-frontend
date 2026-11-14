import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { gradientFor, initialsOf } from '@/lib/avatar';
import type { ViewState, Repository, User, DocBlock } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  BookOpen,
  Video,
  GitPullRequest,
  GitCommit,
  Folder,
  File,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  ChevronsUpDown,
  ChevronRight,
  Check,
  Plus,
  MoreHorizontal,
  Search,
  SquarePen,
  Star,
  GitFork,
  Info,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Shared focus-reset — every interactive control in this file uses this
// instead of relying on browser/Radix defaults, which can still show a ring
// on plain `focus` (not just `focus-visible`) or via ring-offset. ──────────
const noFocusRing =
  'outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0';

// Shared portal-menu item styling for Knowledge add/options menus.
const menuItemCls =
  'flex w-full items-center rounded px-2 py-1.5 text-[12px] text-foreground/80 transition-colors hover:bg-foreground/[0.06] hover:text-foreground';

// ─── Workspace + node data shapes ─────────────────────────────────────────────
// A workspace owns a free-form tree of folders & files. The tree node:
// { id, type: 'folder' | 'file', label, children?: [...] }

export type KnowledgeNodeType = 'folder' | 'file';

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  children?: KnowledgeNode[];
  /** Document body, present only on `file` nodes that have been opened/edited. */
  content?: DocBlock[];
}

export interface Workspace {
  id: string;
  label: string;
  icon: string; // emoji
  nodes: KnowledgeNode[];
}

const WORKSPACE_ICONS = [
  '📘', '📗', '📙', '📒', '📓', '🗂️', '📁', '📚', '🧠', '💡',
  '🚀', '⚙️', '🔧', '🧪', '📊', '🎯', '🌱', '🔥', '⭐', '🧩',
];

export interface AgentItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
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
  workspaces?: Workspace[];
  activeDocId?: string;
  onSelectDoc?: (docId: string) => void;
  onCreateWorkspace?: (label: string, icon: string) => void;
  onRenameWorkspace?: (id: string, label: string, icon: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onCreateNode?: (workspaceId: string, parentId: string | null, type: KnowledgeNodeType, label: string) => void;
  onRenameNode?: (workspaceId: string, id: string, label: string) => void;
  onDeleteNode?: (workspaceId: string, id: string) => void;
  onMoveNode?: (workspaceId: string, id: string, newParentId: string | null) => void;
  agents?: AgentItem[];
  activeAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
  onAddAgent?: () => void;
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
  { id: 'storybook', label: 'Storybooks', icon: BookOpen },
];

const syncItems: NavItem[] = [
  { id: 'meetings', label: 'Meetings', icon: Video },
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
  depth = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  isOpen: boolean;
  onClick?: () => void;
  badge?: string;
  indent?: boolean;
  depth?: number;
}) {
  const row = (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      style={isOpen ? { paddingLeft: depth > 0 ? 8 + depth * 14 : indent ? 28 : 8 } : undefined}
      className={cn(
        'group flex h-[30px] w-full items-center gap-2 rounded-md text-sm transition-colors',
        noFocusRing,
        isOpen ? 'px-2' : 'justify-center px-0',
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
  depth = 0,
  initialValue,
  className,
  onSubmit,
  onCancel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  indent?: boolean;
  depth?: number;
  initialValue?: string;
  className?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  return (
    <div
      style={depth > 0 ? { paddingLeft: 8 + depth * 22 } : indent ? { paddingLeft: 28 } : undefined}
      className={cn(
        'flex h-[26px] items-center gap-1.5 rounded-md px-2',
        className
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

// ─── Knowledge section — a free-form tree of folders & files ──────────────────

// Hover-reveal add control: a "+" that opens a small text dropdown to pick
// a folder or a file. The menu is portaled to <body> so the sidebar's
// overflow-hidden scroll area can't clip it or hide it behind the main view.
function KnowledgeAddControl({
  onPick,
  revealOn = 'node',
}: {
  onPick: (type: KnowledgeNodeType) => void;
  revealOn?: 'group' | 'node';
}) {
  const reveal = revealOn === 'node' ? 'group-hover/node:opacity-100' : 'group-hover:opacity-100';
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const open = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 4 });
    }
    setHovered(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHovered(false), 120);
  };

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center opacity-0 transition-opacity duration-200',
          reveal
        )}
      >
        <button
          ref={triggerRef}
          aria-label="Add"
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded text-foreground/45 transition-transform duration-200 ease-out hover:bg-foreground/[0.07] hover:text-foreground',
            noFocusRing
          )}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {hovered && pos &&
        createPortal(
          <div
            className="fixed z-[1000] min-w-[150px] rounded-md border border-border/70 bg-popover p-1 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={open}
            onMouseLeave={scheduleClose}
          >
            <button onClick={() => onPick('folder')} className={cn(menuItemCls, noFocusRing)}>
              Create new folder
            </button>
            <button onClick={() => onPick('file')} className={cn(menuItemCls, noFocusRing)}>
              Create new file
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

// Per-node options menu (⋯): Rename / Delete. Click-to-open, portaled so it
// escapes the sidebar's overflow clipping.
function KnowledgeOptionsControl({
  node,
  onRename,
  onDelete,
  reveal = 'group-hover/node:opacity-100',
}: {
  node: KnowledgeNode;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  reveal?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 4 });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="Options"
        onClick={toggle}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground/45 opacity-0 transition-opacity hover:bg-foreground/[0.07] hover:text-foreground',
          reveal,
          noFocusRing
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[1000] min-w-[140px] rounded-md border border-border/70 bg-popover p-1 shadow-lg"
              style={{ top: pos.top, left: pos.left }}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  onRename(node.id);
                }}
                className={cn(menuItemCls, noFocusRing)}
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete(node.id);
                }}
                className={cn(menuItemCls, 'text-destructive hover:text-destructive', noFocusRing)}
              >
                Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

// ─── Workspace nodes: a free-form tree of folders & files inside one workspace ─

function WorkspaceNodes({
  workspaceId,
  nodes,
  isOpen,
  activeDocId,
  onSelectDoc,
  creating,
  onStartCreate,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
}: {
  workspaceId: string;
  nodes: KnowledgeNode[];
  isOpen: boolean;
  activeDocId?: string;
  onSelectDoc?: (docId: string) => void;
  creating: { parentId: string | null; type: KnowledgeNodeType } | null;
  onStartCreate: (parentId: string | null, type: KnowledgeNodeType | null) => void;
  onCreateNode?: (workspaceId: string, parentId: string | null, type: KnowledgeNodeType, label: string) => void;
  onRenameNode?: (workspaceId: string, id: string, label: string) => void;
  onDeleteNode?: (workspaceId: string, id: string) => void;
  onMoveNode?: (workspaceId: string, id: string, newParentId: string | null) => void;
}) {
  const [openNodes, setOpenNodes] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);

  const toggleNode = (id: string) => {
    setOpenNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitCreate = (parentId: string | null, type: KnowledgeNodeType, label: string) => {
    if (label.trim()) onCreateNode?.(workspaceId, parentId, type, label.trim());
    onStartCreate(null, null);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragEnd = () => {
    draggedId.current = null;
    setDragOverId(null);
  };
  const onNodeDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId.current && draggedId.current !== id) setDragOverId(id);
  };
  const onNodeDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = draggedId.current;
    setDragOverId(null);
    if (dragId && dragId !== id) onMoveNode?.(workspaceId, dragId, id);
    draggedId.current = null;
  };
  const onRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragId = draggedId.current;
    setDragOverId(null);
    if (dragId) onMoveNode?.(workspaceId, dragId, null);
    draggedId.current = null;
  };

  if (!isOpen) return null;

  const renderNode = (node: KnowledgeNode, depth: number): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const open = openNodes.has(node.id);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const expandable = isFolder || hasChildren;
    const active = !isFolder && activeDocId === node.id;
    const Icon = isFolder ? Folder : File;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={cn(
            'group/node flex h-[22px] w-full items-center gap-1.5 rounded-md pr-1 hover:bg-foreground/[0.045]',
            dragOverId === node.id && 'bg-foreground/[0.06] ring-1 ring-foreground/30'
          )}
          draggable={!!onMoveNode}
          onDragStart={e => onDragStart(e, node.id)}
          onDragEnd={onDragEnd}
          onDragOver={e => onNodeDragOver(e, node.id)}
          onDrop={e => onNodeDrop(e, node.id)}
        >
          {renamingId === node.id ? (
            <NewItemInput
              icon={Icon}
              initialValue={node.label}
              placeholder="Name"
              depth={depth}
              className="flex-1"
              onSubmit={label => {
                onRenameNode?.(workspaceId, node.id, label);
                setRenamingId(null);
              }}
              onCancel={() => setRenamingId(null)}
            />
          ) : (
            <button
              onClick={isFolder || hasChildren ? () => toggleNode(node.id) : () => onSelectDoc?.(node.id)}
              style={{ paddingLeft: 8 + depth * 22 }}
              className={cn(
                'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md text-sm transition-colors',
                isFolder
                  ? 'text-foreground/60 hover:text-foreground/80'
                  : active
                    ? 'bg-foreground/[0.06] font-medium text-foreground'
                    : 'text-foreground/90 hover:text-foreground',
                noFocusRing
              )}
            >
              {expandable && (
                <ChevronRight
                  className={cn('h-2.5 w-2.5 shrink-0 text-foreground/40 transition-transform', open && 'rotate-90')}
                />
              )}
              <Icon
                className={cn(
                  'h-3 w-3 shrink-0',
                  isFolder ? 'text-foreground/55' : 'text-foreground/35'
                )}
              />
              <span className="flex-1 truncate text-left">{node.label}</span>
            </button>
          )}
          {isFolder && onCreateNode && <KnowledgeAddControl onPick={type => onStartCreate(node.id, type)} />}
          {(onRenameNode || onDeleteNode) && (
            <KnowledgeOptionsControl
              node={node}
              onRename={id => setRenamingId(id)}
              onDelete={id => onDeleteNode?.(workspaceId, id)}
            />
          )}
        </div>
        {expandable && open && (
          <div className="flex flex-col">
            {(node.children ?? []).map(child => renderNode(child, depth + 1))}
            {creating?.parentId === node.id && (
              <NewItemInput
                key="__new"
                icon={creating.type === 'folder' ? Folder : File}
                placeholder={creating.type === 'folder' ? 'New folder' : 'New file'}
                depth={depth + 1}
                onSubmit={label => submitCreate(node.id, creating.type, label)}
                onCancel={() => onStartCreate(null, null)}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex min-h-[8px] flex-col gap-0.5"
      onDragOver={e => {
        if (onMoveNode) e.preventDefault();
      }}
      onDrop={onRootDrop}
    >
      {nodes.map(node => renderNode(node, 0))}
      {isOpen && creating?.parentId === null && (
        <NewItemInput
          key="__new-root"
          icon={creating.type === 'folder' ? Folder : File}
          placeholder={creating.type === 'folder' ? 'New folder' : 'New file'}
          onSubmit={label => submitCreate(null, creating.type, label)}
          onCancel={() => onStartCreate(null, null)}
        />
      )}
    </div>
  );
}

// ─── Workspace section — a list of workspaces, each with its own folder/file tree ─

function WorkspaceSection({
  workspaces,
  isOpen,
  sectionCollapsed,
  onToggleSection,
  activeDocId,
  onSelectDoc,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
}: {
  workspaces: Workspace[];
  isOpen: boolean;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  activeDocId?: string;
  onSelectDoc?: (docId: string) => void;
  onCreateWorkspace?: (label: string, icon: string) => void;
  onRenameWorkspace?: (id: string, label: string, icon: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onCreateNode?: (workspaceId: string, parentId: string | null, type: KnowledgeNodeType, label: string) => void;
  onRenameNode?: (workspaceId: string, id: string, label: string) => void;
  onDeleteNode?: (workspaceId: string, id: string) => void;
  onMoveNode?: (workspaceId: string, id: string, newParentId: string | null) => void;
}) {
  const [openWs, setOpenWs] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState<{ workspaceId: string; parentId: string | null; type: KnowledgeNodeType } | null>(null);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!isOpen) return null;

  const toggleWs = (id: string) => {
    setOpenWs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="group flex h-6 w-full items-center gap-1 rounded">
        <button
          onClick={onToggleSection}
          className={cn(
            'flex h-6 flex-1 items-center gap-1 rounded px-2 text-xs font-medium text-foreground/40 hover:text-foreground/65',
            noFocusRing
          )}
        >
          <span>Workspace</span>
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 opacity-0 transition-transform group-hover:opacity-100',
              !sectionCollapsed && 'rotate-90'
            )}
          />
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              aria-label="New workspace"
              className={cn(
                'group/add mr-1 flex h-5 w-5 items-center justify-center rounded text-foreground/45 transition-all duration-200 ease-out',
                'hover:bg-foreground/[0.07] hover:text-foreground hover:shadow-sm active:scale-90',
                noFocusRing
              )}
            >
              <Plus className="h-3 w-3 transition-transform duration-200 ease-out group-hover/add:rotate-90 group-hover/add:scale-110" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New workspace</TooltipContent>
        </Tooltip>
      </div>

      {(!sectionCollapsed || !isOpen) && (
        <div className="flex flex-col gap-0.5">
          {workspaces.map(ws => {
            const open = openWs.has(ws.id);
            return (
              <div key={ws.id} className="flex flex-col">
                <div className="group flex h-[26px] w-full items-center gap-1.5 rounded-md pr-1 hover:bg-foreground/[0.045]">
                  <button
                    onClick={() => toggleWs(ws.id)}
                    style={{ paddingLeft: 8 }}
                    className={cn(
                'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md text-[13px] transition-colors',
                      open ? 'text-foreground/80' : 'text-foreground/70 hover:text-foreground/90',
                      noFocusRing
                    )}
                  >
                    <ChevronRight
                      className={cn('h-3 w-3 shrink-0 text-foreground/40 transition-transform', open && 'rotate-90')}
                    />
                    <span className="text-sm leading-none">{ws.icon}</span>
                    <span className="flex-1 truncate text-left">{ws.label}</span>
                  </button>
                  <KnowledgeOptionsControl
                    node={{ id: ws.id, type: 'folder', label: ws.label }}
                    reveal="group-hover:opacity-100"
                    onRename={id => {
                      const w = workspaces.find(x => x.id === id);
                      setEditing(w ?? null);
                      setModalOpen(true);
                    }}
                    onDelete={id => onDeleteWorkspace?.(id)}
                  />
                  <KnowledgeAddControl
                    revealOn="group"
                    onPick={type => {
                      setOpenWs(prev => new Set(prev).add(ws.id));
                      setCreating({ workspaceId: ws.id, parentId: null, type });
                    }}
                  />
                </div>
                {open && (
                  <WorkspaceNodes
                    workspaceId={ws.id}
                    nodes={ws.nodes}
                    isOpen={isOpen}
                    activeDocId={activeDocId}
                    onSelectDoc={onSelectDoc}
                    creating={creating?.workspaceId === ws.id ? { parentId: creating.parentId, type: creating.type } : null}
                    onStartCreate={(parentId, type) =>
                      setCreating(parentId === null || type === null ? null : { workspaceId: ws.id, parentId, type })
                    }
                    onCreateNode={onCreateNode}
                    onRenameNode={onRenameNode}
                    onDeleteNode={onDeleteNode}
                    onMoveNode={onMoveNode}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <WorkspaceModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(label, icon) => {
          if (editing) onRenameWorkspace?.(editing.id, label, icon);
          else onCreateWorkspace?.(label, icon);
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

// ─── Workspace create/rename modal — centered, Notion-style icon + name ────────

function WorkspaceModal({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing?: Workspace | null;
  onClose: () => void;
  onSubmit: (label: string, icon: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState(WORKSPACE_ICONS[0]);

  useEffect(() => {
    if (open) {
      setLabel(editing?.label ?? '');
      setIcon(editing?.icon ?? WORKSPACE_ICONS[0]);
    }
  }, [open, editing]);

  if (!open) return null;

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSubmit(trimmed, icon);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="w-[360px] rounded-xl border border-border/70 bg-popover p-4 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-medium text-foreground/90">
          {editing ? 'Rename workspace' : 'New workspace'}
        </h2>

        <div className="mb-3">
          <div className="mb-1.5 text-xs text-foreground/40">Icon</div>
          <div className="grid grid-cols-10 gap-1">
            {WORKSPACE_ICONS.map(em => (
              <button
                key={em}
                type="button"
                onClick={() => setIcon(em)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded text-base',
                  noFocusRing,
                  icon === em ? 'bg-foreground/[0.08] ring-1 ring-foreground/20' : 'hover:bg-foreground/[0.05]'
                )}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <input
          autoFocus
          value={label}
          placeholder="Workspace name"
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit();
            else if (e.key === 'Escape') onClose();
          }}
          className={cn(
            'mb-4 w-full rounded-md border border-border/70 bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-foreground/35',
            noFocusRing
          )}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className={noFocusRing}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!label.trim()} className={noFocusRing}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Agents section — add new agent + example agents ───────────────────────

function AgentsSection({
  agents,
  isOpen,
  sectionCollapsed,
  onToggleSection,
  activeAgentId,
  onSelectAgent,
  onAddAgent,
}: {
  agents: AgentItem[];
  isOpen: boolean;
  sectionCollapsed: boolean;
  onToggleSection: () => void;
  activeAgentId?: string;
  onSelectAgent?: (id: string) => void;
  onAddAgent?: () => void;
}) {
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
            <span>Agents</span>
            <ChevronRight
              className={cn(
                'h-3 w-3 shrink-0 opacity-0 transition-transform group-hover:opacity-100',
                !sectionCollapsed && 'rotate-90'
              )}
            />
          </button>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onAddAgent?.()}
                aria-label="Add agent"
                className={cn(
                  'group/add mr-1 flex h-5 w-5 items-center justify-center rounded text-foreground/45 transition-all duration-200 ease-out',
                  'hover:bg-foreground/[0.07] hover:text-foreground hover:shadow-sm active:scale-90',
                  noFocusRing
                )}
              >
                <Plus className="h-3 w-3 transition-transform duration-200 ease-out group-hover/add:rotate-90 group-hover/add:scale-110" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Add agent</TooltipContent>
          </Tooltip>
        </div>
      )}

      {isOpen && !sectionCollapsed && (
        <>
          {/* Active agents — outer list */}
          {agents.map(agent => {
            const Icon = agent.icon ?? (agent.id === 'pr' ? GitPullRequest : GitCommit);
            return (
              <Row
                key={agent.id}
                icon={Icon}
                label={agent.label}
                isActive={activeAgentId === agent.id}
                isOpen={isOpen}
                onClick={() => onSelectAgent?.(agent.id)}
              />
            );
          })}

          {agents.length === 0 && (
            <div className="flex h-[30px] items-center px-2 text-sm text-foreground/45">
              No agents enabled yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Repo switcher ────────────────────────────────────────────────────────────

function formatRepoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function RepoStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

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
  const [detailsRepo, setDetailsRepo] = useState<Repository | null>(null);

  const openDetails = (repo: Repository) => {
    setOpen(false);
    setDetailsRepo(repo);
  };

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
    <>
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
                    className={cn('gap-2 pr-1', noFocusRing)}
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
                    <button
                      type="button"
                      aria-label={`Details for ${repo.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDetails(repo);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                        'hover:bg-foreground/10 hover:text-foreground',
                        noFocusRing,
                      )}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
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

    <Dialog open={!!detailsRepo} onOpenChange={(o) => { if (!o) setDetailsRepo(null); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {detailsRepo && (
          <>
            <div className="flex items-start gap-3 border-b p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GitBranch className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">{detailsRepo.name}</DialogTitle>
                <DialogDescription className="truncate">{detailsRepo.fullName}</DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {detailsRepo.language !== 'Unknown' && (
                    <Badge variant="secondary">{detailsRepo.language}</Badge>
                  )}
                  <Badge variant={detailsRepo.isConnected ? 'default' : 'outline'}>
                    {detailsRepo.isConnected ? 'Connected' : 'Not connected'}
                  </Badge>
                  {detailsRepo.isAnalyzing && <Badge variant="secondary">Analyzing…</Badge>}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {detailsRepo.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {detailsRepo.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <RepoStat icon={Star} label="Stars" value={detailsRepo.stars.toLocaleString()} />
                <RepoStat icon={GitFork} label="Forks" value={detailsRepo.forks.toLocaleString()} />
              </div>

              <Separator />

              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="font-medium">{formatRepoDate(detailsRepo.updatedAt)}</dd>
                </div>
                {detailsRepo.isAnalyzing && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Analysis progress</dt>
                    <dd className="font-medium">{detailsRepo.analysisProgress}%</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Repository ID</dt>
                  <dd className="truncate font-mono text-xs text-muted-foreground">{detailsRepo.id}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
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

  const initials = initialsOf(user.name);

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
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: user.avatar ? undefined : gradientFor(user.id || user.email || user.name) }}
      >
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
        className={cn('w-56 p-1', noFocusRing)}
      >
        <DropdownMenuItem
          onClick={() => onNavigate('settings')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNavigate('team')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Team</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNavigate('settings')}
          className={cn('focus:bg-foreground/[0.045] focus:text-foreground', noFocusRing)}
        >
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Settings</span>
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
          <span className="text-sm">Log out</span>
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
  workspaces = [],
  activeDocId,
  onSelectDoc,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
  agents = [],
  activeAgentId,
  onSelectAgent,
  onAddAgent,
}: SidebarProps) {
  const [exploreCollapsed, setExploreCollapsed] = useState(false);
  const [syncCollapsed, setSyncCollapsed] = useState(false);
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

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

            {/* Agents */}
            <AgentsSection
              agents={agents}
              isOpen={isOpen}
              sectionCollapsed={agentsCollapsed}
              onToggleSection={() => setAgentsCollapsed(v => !v)}
              activeAgentId={activeAgentId}
              onSelectAgent={onSelectAgent}
              onAddAgent={onAddAgent}
            />

            {/* Workspace */}
            <WorkspaceSection
              workspaces={workspaces}
              isOpen={isOpen}
              sectionCollapsed={workspaceCollapsed}
              onToggleSection={() => setWorkspaceCollapsed(v => !v)}
              activeDocId={activeDocId}
              onSelectDoc={onSelectDoc}
              onCreateWorkspace={onCreateWorkspace}
              onRenameWorkspace={onRenameWorkspace}
              onDeleteWorkspace={onDeleteWorkspace}
              onCreateNode={onCreateNode}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onMoveNode={onMoveNode}
            />
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-0.5 px-2 pb-2.5">
          {isOpen && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className={cn(
                  'h-6 w-6 shrink-0 text-foreground/40 hover:text-foreground/70',
                  noFocusRing
                )}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {!isOpen && (
            <div className="flex shrink-0 justify-center">
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

          <UserFooter
            user={user}
            sidebarOpen={isOpen}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}