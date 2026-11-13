import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DocBlock, DocBlockType } from '@/types';
import { cn } from '@/lib/utils';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  GripVertical,
  Plus,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Block metadata ─────────────────────────────────────────────────────────────

interface BlockMeta {
  label: string;
  desc: string;
  icon: LucideIcon;
  keywords: string[];
  placeholder: string;
}

const BLOCK_META: Record<DocBlockType, BlockMeta> = {
  paragraph: { label: 'Text', desc: 'Plain paragraph of text', icon: Type, keywords: ['text', 'paragraph', 'p', 'body'], placeholder: "Type '/' for commands…" },
  heading1: { label: 'Heading 1', desc: 'Big section heading', icon: Heading1, keywords: ['h1', 'title', 'heading', 'big'], placeholder: 'Heading 1' },
  heading2: { label: 'Heading 2', desc: 'Medium section heading', icon: Heading2, keywords: ['h2', 'subtitle', 'heading'], placeholder: 'Heading 2' },
  heading3: { label: 'Heading 3', desc: 'Small section heading', icon: Heading3, keywords: ['h3', 'heading', 'small'], placeholder: 'Heading 3' },
  bulleted: { label: 'Bulleted list', desc: 'A simple bulleted list', icon: List, keywords: ['bullet', 'ul', 'list', 'unordered'], placeholder: 'List item' },
  numbered: { label: 'Numbered list', desc: 'An ordered list', icon: ListOrdered, keywords: ['number', 'ol', 'ordered', 'list'], placeholder: 'List item' },
  todo: { label: 'To-do list', desc: 'A checklist with boxes', icon: CheckSquare, keywords: ['todo', 'task', 'check', 'checkbox'], placeholder: 'To-do' },
  quote: { label: 'Quote', desc: 'Capture a quotation', icon: Quote, keywords: ['quote', 'blockquote', 'cite'], placeholder: 'Quote' },
  code: { label: 'Code', desc: 'A code snippet', icon: Code, keywords: ['code', 'snippet', 'mono'], placeholder: 'Code' },
  divider: { label: 'Divider', desc: 'A visual separator', icon: Minus, keywords: ['divider', 'hr', 'separator', 'line'], placeholder: '' },
};

const SLASH_ORDER: DocBlockType[] = [
  'paragraph', 'heading1', 'heading2', 'heading3',
  'bulleted', 'numbered', 'todo', 'quote', 'code', 'divider',
];

// Markdown-style shortcuts that convert a paragraph on the fly.
const MARKDOWN_SHORTCUTS: { pattern: RegExp; type: DocBlockType }[] = [
  { pattern: /^#\s/, type: 'heading1' },
  { pattern: /^##\s/, type: 'heading2' },
  { pattern: /^###\s/, type: 'heading3' },
  { pattern: /^[-*]\s/, type: 'bulleted' },
  { pattern: /^1[.)]\s/, type: 'numbered' },
  { pattern: /^\[\s?\]\s/, type: 'todo' },
  { pattern: /^>\s/, type: 'quote' },
  { pattern: /^```$/, type: 'code' },
];

function newBlock(type: DocBlockType = 'paragraph', text = ''): DocBlock {
  return { id: crypto.randomUUID(), type, text, ...(type === 'todo' ? { checked: false } : {}) };
}

// ─── Editor ────────────────────────────────────────────────────────────────────

interface DocsEditorProps {
  blocks: DocBlock[];
  onChange: (blocks: DocBlock[]) => void;
}

export function DocsEditor({ blocks, onChange }: DocsEditorProps) {
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [slash, setSlash] = useState<{ id: string; query: string; index: number } | null>(null);
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Keep every textarea sized to its content.
  useLayoutEffect(() => {
    for (const b of blocks) {
      const el = refs.current[b.id];
      if (el) autoGrow(el);
    }
  }, [blocks]);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const focusBlock = useCallback(
    (id: string, caret: 'start' | 'end' | number = 'end') => {
      requestAnimationFrame(() => {
        const el = refs.current[id];
        if (!el) return;
        el.focus();
        const pos = caret === 'start' ? 0 : caret === 'end' ? el.value.length : caret;
        el.setSelectionRange(pos, pos);
      });
    },
    [],
  );

  const commit = (next: DocBlock[]) => onChange(next);

  const setText = (id: string, text: string) =>
    commit(blocks.map(b => (b.id === id ? { ...b, text } : b)));

  const setType = (id: string, type: DocBlockType, text?: string) =>
    commit(
      blocks.map(b =>
        b.id === id
          ? { ...b, type, text: text ?? b.text, ...(type === 'todo' && b.checked === undefined ? { checked: false } : {}) }
          : b,
      ),
    );

  const toggleTodo = (id: string) =>
    commit(blocks.map(b => (b.id === id ? { ...b, checked: !b.checked } : b)));

  // ── Slash menu ──
  const openSlash = (id: string, query: string) =>
    setSlash({ id, query, index: 0 });

  const closeSlash = () => setSlash(null);

  const filteredCommands = slash
    ? SLASH_ORDER.filter(t => {
        const q = slash.query.trim().toLowerCase();
        if (!q) return true;
        const m = BLOCK_META[t];
        return m.label.toLowerCase().includes(q) || m.keywords.some(k => k.includes(q));
      })
    : [];

  const applySlashCommand = (type: DocBlockType) => {
    if (!slash) return;
    const id = slash.id;
    const el = refs.current[id];
    setType(id, type, type === 'divider' ? '' : '');
    if (el) {
      el.value = '';
      autoGrow(el);
    }
    closeSlash();
    focusBlock(id, 'start');
  };

  const handleInput = (id: string, el: HTMLTextAreaElement) => {
    const value = el.value;
    autoGrow(el);

    if (value.startsWith('/')) {
      openSlash(id, value.slice(1));
      return;
    }
    if (slash && slash.id === id) closeSlash();

    // Markdown shortcuts only apply to a plain paragraph.
    const block = blocks.find(b => b.id === id);
    if (block && block.type === 'paragraph') {
      const hit = MARKDOWN_SHORTCUTS.find(s => s.pattern.test(value));
      if (hit) {
        const remainder = value.replace(hit.pattern, '');
        el.value = remainder;
        autoGrow(el);
        setType(id, hit.type, remainder);
        focusBlock(id, 'start');
        return;
      }
    }
    setText(id, value);
  };

  // ── Keyboard handling ──
  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const idx = blocks.findIndex(b => b.id === id);
    const block = blocks[idx];
    if (!block) return;

    // Slash menu navigation takes priority.
    if (slash && slash.id === id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlash(s => (s ? { ...s, index: Math.min(filteredCommands.length - 1, s.index + 1) } : s));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlash(s => (s ? { ...s, index: Math.max(0, s.index - 1) } : s));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[slash.index];
        if (cmd) applySlashCommand(cmd);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSlash();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const caret = el.selectionStart ?? el.value.length;
      const before = el.value.slice(0, caret);
      const after = el.value.slice(caret);

      // Empty list/quote item + Enter → collapse back to a paragraph.
      const isListLike = block.type === 'bulleted' || block.type === 'numbered' || block.type === 'todo' || block.type === 'quote';
      if (isListLike && before.trim() === '') {
        setType(id, 'paragraph', '');
        focusBlock(id, 'start');
        return;
      }

      const nextType: DocBlockType =
        block.type === 'bulleted' || block.type === 'numbered' || block.type === 'todo'
          ? block.type
          : 'paragraph';

      const updated = blocks.map(b => (b.id === id ? { ...b, text: before } : b));
      const insertAt = idx + 1;
      const nb = newBlock(nextType, after);
      updated.splice(insertAt, 0, nb);
      // Sync the current textarea's DOM value (uncontrolled) before re-render.
      el.value = before;
      autoGrow(el);
      commit(updated);
      focusBlock(nb.id, 'start');
      return;
    }

    if (e.key === 'Backspace' && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0) {
      if (block.type !== 'paragraph' && block.type !== 'divider') {
        e.preventDefault();
        setType(id, 'paragraph');
        focusBlock(id, 'start');
        return;
      }
      if (idx > 0) {
        e.preventDefault();
        const prev = blocks[idx - 1];
        const mergePos = prev.text.length;
        const merged = prev.text + block.text;
        // Sync the previous textarea's DOM value (uncontrolled) before re-render.
        const prevEl = refs.current[prev.id];
        if (prevEl) {
          prevEl.value = merged;
          autoGrow(prevEl);
        }
        const updated = blocks
          .map(b => (b.id === prev.id ? { ...b, text: merged } : b))
          .filter(b => b.id !== id);
        commit(updated);
        focusBlock(prev.id, mergePos);
        return;
      }
    }

    if (e.key === 'ArrowUp' && (el.selectionStart ?? 0) === 0) {
      if (idx > 0) {
        e.preventDefault();
        focusBlock(blocks[idx - 1].id, 'end');
      }
    }
    if (e.key === 'ArrowDown' && (el.selectionStart ?? 0) >= el.value.length) {
      if (idx < blocks.length - 1) {
        e.preventDefault();
        focusBlock(blocks[idx + 1].id, 'start');
      }
    }
  };

  // ── Reordering ──
  const moveBlock = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = blocks.find(b => b.id === fromId);
    const toIdx = blocks.findIndex(b => b.id === toId);
    if (!from || toIdx < 0) return;
    const without = blocks.filter(b => b.id !== fromId);
    const insertAt = without.findIndex(b => b.id === toId);
    without.splice(insertAt, 0, from);
    commit(without);
  };

  // Ensure there is always at least one editable block.
  useEffect(() => {
    if (blocks.length === 0) commit([newBlock('paragraph', '')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);

  return (
    <div className="w-full px-6 py-8 sm:px-12">
      {blocks.map((block, i) => {
        // Number for numbered-list items: the count of consecutive numbered blocks ending here.
        let num = 0;
        if (block.type === 'numbered') {
          for (let j = i; j >= 0 && blocks[j].type === 'numbered'; j--) num++;
        }
        return (
        <BlockRow
          key={block.id}
          block={block}
          index={i}
          number={num}
          refEl={el => { refs.current[block.id] = el; }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={(id, el) => {
            if (slash && slash.id === id) closeSlash();
            setText(id, el.value);
          }}
          onToggleTodo={toggleTodo}
          slashOpen={!!slash && slash.id === block.id ? slash : null}
          slashCommands={slash && slash.id === block.id ? filteredCommands : []}
          slashIndex={slash && slash.id === block.id ? slash.index : 0}
          onSlashPick={applySlashCommand}
          onSlashHover={i2 => setSlash(s => (s ? { ...s, index: i2 } : s))}
          onAddAfter={() => {
            const nb = newBlock('paragraph', '');
            const updated = [...blocks];
            updated.splice(i + 1, 0, nb);
            commit(updated);
            focusBlock(nb.id, 'start');
          }}
          dragOver={dragOverId === block.id}
          onDragStart={() => { draggedId.current = block.id; }}
          onDragOver={() => setDragOverId(block.id)}
          onDrop={() => { if (draggedId.current) moveBlock(draggedId.current, block.id); setDragOverId(null); draggedId.current = null; }}
          onDragEnd={() => { setDragOverId(null); draggedId.current = null; }}
        />
        );
      })}
    </div>
  );
}

// ─── Single block row ──────────────────────────────────────────────────────────

interface BlockRowProps {
  block: DocBlock;
  index: number;
  number: number;
  refEl: (el: HTMLTextAreaElement | null) => void;
  onInput: (id: string, el: HTMLTextAreaElement) => void;
  onKeyDown: (id: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur: (id: string, el: HTMLTextAreaElement) => void;
  onToggleTodo: (id: string) => void;
  slashOpen: { id: string; query: string; index: number } | null;
  slashCommands: DocBlockType[];
  slashIndex: number;
  onSlashPick: (type: DocBlockType) => void;
  onSlashHover: (index: number) => void;
  onAddAfter: () => void;
  dragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function BlockRow({
  block,
  number,
  refEl,
  onInput,
  onKeyDown,
  onBlur,
  onToggleTodo,
  slashOpen,
  slashCommands,
  slashIndex,
  onSlashPick,
  onSlashHover,
  onAddAfter,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: BlockRowProps) {
  const meta = BLOCK_META[block.type];
  const empty = block.text.length === 0;

  const textClass = cn(
    'w-full resize-none border-0 bg-transparent outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40',
    'leading-relaxed',
    block.type === 'heading1' && 'text-3xl font-bold tracking-tight',
    block.type === 'heading2' && 'text-2xl font-semibold tracking-tight',
    block.type === 'heading3' && 'text-xl font-semibold tracking-tight',
    block.type === 'paragraph' && 'text-[15px]',
    block.type === 'quote' && 'text-[15px] italic text-foreground/80',
    block.type === 'code' && 'font-mono text-[13px] leading-relaxed',
    (block.type === 'bulleted' || block.type === 'numbered' || block.type === 'todo') && 'text-[15px]',
  );

  if (block.type === 'divider') {
    return (
      <div
        className={cn('group relative flex items-center py-2', dragOver && 'rounded-md ring-1 ring-primary/40 bg-primary/[0.04]')}
        onDragOver={e => { e.preventDefault(); onDragOver(); }}
        onDrop={onDrop}
      >
        <BlockGutter onAddAfter={onAddAfter} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <div className="ml-1 flex-1 border-t border-border/70" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex gap-1 rounded-md py-0.5',
        dragOver && 'ring-1 ring-primary/40 bg-primary/[0.04]',
      )}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
    >
      <BlockGutter onAddAfter={onAddAfter} onDragStart={onDragStart} onDragEnd={onDragEnd} />

      <div className="relative flex min-w-0 flex-1 items-start">
        {block.type === 'bulleted' && (
          <span className="select-none pt-[7px] pr-2 text-lg leading-none text-foreground/60">•</span>
        )}
        {block.type === 'numbered' && (
          <span className="select-none pt-[3px] pr-2 text-[14px] tabular-nums leading-relaxed text-foreground/60">{number}.</span>
        )}
        {block.type === 'todo' && (
          <button
            type="button"
            onClick={() => onToggleTodo(block.id)}
            className={cn(
              'mt-[5px] mr-2 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
              block.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border/80 hover:border-foreground/40',
            )}
          >
            {block.checked && <Check className="h-3 w-3" />}
          </button>
        )}
        {block.type === 'quote' && (
          <span className="absolute left-[-14px] top-0 h-full w-[3px] rounded-full bg-foreground/20" />
        )}

        <div className={cn('min-w-0 flex-1', block.type === 'code' && 'rounded-md bg-muted/50 px-3 py-2')}>
          <textarea
            ref={refEl}
            defaultValue={block.text}
            placeholder={empty ? meta.placeholder : ''}
            onChange={e => onInput(block.id, e.currentTarget)}
            onKeyDown={e => onKeyDown(block.id, e)}
            onBlur={e => onBlur(block.id, e.currentTarget)}
            rows={1}
            spellCheck
            className={cn(textClass, block.type === 'todo' && block.checked && 'text-muted-foreground line-through')}
          />

          {slashOpen && (
            <SlashMenu
              commands={slashCommands}
              activeIndex={slashIndex}
              onPick={onSlashPick}
              onHover={onSlashHover}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Left gutter: drag handle + add button ──────────────────────────────────────

function BlockGutter({
  onAddAfter,
  onDragStart,
  onDragEnd,
}: {
  onAddAfter: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        aria-label="Add block below"
        onClick={onAddAfter}
        className="flex h-5 w-5 items-center justify-center rounded text-foreground/35 hover:bg-foreground/[0.06] hover:text-foreground/70"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Drag to reorder"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-foreground/35 hover:bg-foreground/[0.06] hover:text-foreground/70 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Slash command menu ────────────────────────────────────────────────────────

function SlashMenu({
  commands,
  activeIndex,
  onPick,
  onHover,
}: {
  commands: DocBlockType[];
  activeIndex: number;
  onPick: (type: DocBlockType) => void;
  onHover: (index: number) => void;
}) {
  if (commands.length === 0) {
    return (
      <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border/70 bg-popover p-2 shadow-xl">
        <div className="px-2 py-1.5 text-[12px] text-muted-foreground">No matching blocks</div>
      </div>
    );
  }
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border/70 bg-popover p-1 shadow-xl">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        Basic blocks
      </div>
      {commands.map((t, i) => {
        const m = BLOCK_META[t];
        const Icon = m.icon;
        return (
          <button
            key={t}
            type="button"
            onMouseEnter={() => onHover(i)}
            onMouseDown={e => {
              e.preventDefault();
              onPick(t);
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
              i === activeIndex ? 'bg-foreground/[0.07]' : 'hover:bg-foreground/[0.04]',
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 text-foreground/70">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium text-foreground">{m.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{m.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
