import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut } from '@/components/ui/command';
import { COMMANDS, type CommandEntry } from '@/components/commandShortcuts';
import type { ViewState } from '@/types';

// Smooth eased fade + slide-down-from-top (no zoom) when the palette opens.
const PALETTE_ANIM =
  "!top-[12%] !translate-y-0 !duration-300 ease-out " +
  "data-[state=open]:![--tw-enter-scale:1] data-[state=closed]:![--tw-exit-scale:1] " +
  "data-[state=open]:slide-in-from-top-6 data-[state=closed]:slide-out-to-top-2";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewState) => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const run = (id: CommandEntry['id']) => {
    onNavigate(id);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className={PALETTE_ANIM}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {COMMANDS.map((c) => {
            const Icon = c.icon;
            return (
              <CommandItem
                key={c.id}
                value={`${c.label} ${c.id}`}
                onSelect={() => run(c.id)}
              >
                <Icon />
                <span>{c.label}</span>
                {c.shortcut && (
                  <CommandShortcut>
                    <span>⌘{c.shortcut.toUpperCase()}</span>
                    <span className="opacity-40">/</span>
                    <span>Ctrl {c.shortcut.toUpperCase()}</span>
                  </CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
