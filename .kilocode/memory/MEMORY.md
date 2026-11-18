# Project Memory

## Command Palette Wiring (done)
- `src/components/commandShortcuts.ts` (new): `CommandEntry`, `COMMANDS`, `CHORD_MAP`, `useCommandShortcuts(onNavigate, onTogglePalette)`.
- `src/components/CommandPalette.tsx` (new): `CommandPalette` component only (uses `cmdk` `CommandDialog`). No other exports (keeps react-refresh happy).
- `src/App.tsx`: renders `<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={handleNavigate} />`; `useCommandShortcuts(handleNavigate, () => setPaletteOpen(o => !o))` attached to `window` keydown.
- `src/components/layout/TopBar.tsx`: search box is now a button calling `onOpenSearch` (prop) which opens the palette.
- Shortcuts: ⌘K/Ctrl+K toggles palette; `g` then a key jumps (i=inbox, a=architecture, s=storybook, m=meetings, r=review, d=docs, g=agents, t=team, ,=settings).
- `CommandShortcut`/`CommandEmpty` ARE exported from `src/components/ui/command.tsx`.

## Pre-existing lint errors (NOT ours)
- `src/App.tsx` lines ~80, 477, 484: `@typescript-eslint/no-explicit-any`.
- `src/lib/api.ts` lines ~27, 250: same `any` rule.
- These are legacy; leave unless asked to fix.
