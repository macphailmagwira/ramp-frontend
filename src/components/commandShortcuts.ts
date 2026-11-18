import {
  Inbox as InboxIcon,
  Network,
  BookOpen,
  Video,
  GitPullRequest,
  FileText,
  Users,
  Settings,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import type { ViewState } from '@/types';

export interface CommandEntry {
  id: ViewState;
  label: string;
  icon: LucideIcon;
  /** Ctrl/Cmd + this key jumps to the destination. */
  shortcut?: string;
}

export const COMMANDS: CommandEntry[] = [
  { id: 'inbox', label: 'Go to Inbox', icon: InboxIcon, shortcut: 'i' },
  { id: 'architecture', label: 'Go to Architecture', icon: Network, shortcut: 'a' },
  { id: 'storybook', label: 'Go to Storybooks', icon: BookOpen, shortcut: 's' },
  { id: 'meetings', label: 'Go to Meetings', icon: Video, shortcut: 'm' },
  { id: 'review', label: 'Go to Review', icon: GitPullRequest, shortcut: 'r' },
  { id: 'docs', label: 'Go to Docs', icon: FileText, shortcut: 'd' },
  { id: 'agents', label: 'Go to Agents', icon: Bot, shortcut: 'g' },
  { id: 'team', label: 'Go to Team', icon: Users, shortcut: 't' },
  { id: 'settings', label: 'Go to Settings', icon: Settings, shortcut: ',' },
];

export const SHORTCUT_MAP: Record<string, ViewState> = Object.fromEntries(
  COMMANDS.filter((c) => c.shortcut).map((c) => [c.shortcut as string, c.id])
);

/** Global shortcuts: ⌘K / Ctrl+K toggles the palette; Ctrl+letter jumps. */
export function useCommandShortcuts(
  onNavigate: (view: ViewState) => void,
  onTogglePalette: () => void
) {
  const isTyping = () => {
    const el = document.activeElement as HTMLElement | null;
    return (
      !!el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        el.getAttribute('role') === 'textbox')
    );
  };

  return (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    // ⌘K / Ctrl+K toggles the palette.
    if ((e.metaKey || e.ctrlKey) && key === 'k') {
      e.preventDefault();
      onTogglePalette();
      return;
    }

    // ⌘/Ctrl + letter jumps straight to a destination (ignored while typing).
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !isTyping()) {
      const target = SHORTCUT_MAP[key];
      if (target) {
        e.preventDefault();
        onNavigate(target);
      }
    }
  };
}
