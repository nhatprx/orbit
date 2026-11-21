import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser,
  Italic, List, ListOrdered, Minus, Plus, Redo2, Strikethrough, Table, Trash2, Underline, Undo2,
} from 'lucide-react';
import type { DocAlign, DocBlockType } from './officeTypes';

export interface DocActiveFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: DocAlign | 'justify';
  insideTable: boolean;
}

const BLOCK_BY_TAG: Record<string, Exclude<DocBlockType, 'ul' | 'ol'>> = {
  P: 'p', H1: 'h1', H2: 'h2', H3: 'h3', BLOCKQUOTE: 'quote', PRE: 'code',
};

export function inspectDocCursor(
  root: HTMLElement,
  startNode: Node | null
): { formats: DocActiveFormatState; blockType?: Exclude<DocBlockType, 'ul' | 'ol'>; table: HTMLTableElement | null } {
  let node = startNode, bold = false, italic = false, underline = false, strike = false;
  let align: DocAlign | 'justify' = 'left', table: HTMLTableElement | null = null;
  let blockType: Exclude<DocBlockType, 'ul' | 'ol'> | undefined;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement, tag = el.tagName.toUpperCase();
      if (tag === 'B' || tag === 'STRONG') bold = true;
      if (tag === 'I' || tag === 'EM') italic = true;
      if (tag === 'U') underline = true;
      if (tag === 'S' || tag === 'STRIKE') strike = true;
      if (tag === 'TABLE') table = el as HTMLTableElement;
      if (el.parentElement === root) {
        if (BLOCK_BY_TAG[tag]) blockType = BLOCK_BY_TAG[tag];
        const raw = (el.getAttribute('data-align') || el.style.textAlign || 'left').toLowerCase();
        if (raw === 'center' || raw === 'right' || raw === 'justify') align = raw;
      }
    }
    node = node.parentNode;
  }
  const q = (cmd: string) => { try { return typeof document.queryCommandState === 'function' && document.queryCommandState(cmd); } catch { return false; } };
  return {
    formats: { bold: bold || q('bold'), italic: italic || q('italic'), underline: underline || q('underline'), strike: strike || q('strikeThrough'), align, insideTable: Boolean(table) },
    blockType,
    table,
  };
}

export interface OrbitDocToolbarProps {
  blockType: Exclude<DocBlockType, 'ul' | 'ol'>;
  fontFamily: string;
  fontSize: string;
  zoom: number;
  activeFormats?: DocActiveFormatState;
  onUndo: () => void;
  onRedo: () => void;
  onBlockTypeChange: (type: Exclude<DocBlockType, 'ul' | 'ol'>) => void;
  onFontFamilyChange: (family: string) => void;
  onFontSizeChange: (size: string) => void;
  onInlineCommand: (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => void;
  onAlignChange: (align: DocAlign | 'justify') => void;
  onToggleList: (type: 'ul' | 'ol') => void;
  onInsertTable: () => void;
  onAddTableRow?: () => void;
  onAddTableCol?: () => void;
  onDeleteTable?: () => void;
  onInsertHorizontalRule: () => void;
  onClearFormatting: () => void;
  onZoomChange: (zoom: number) => void;
}

const BLOCK_OPTIONS: Array<{ value: Exclude<DocBlockType, 'ul' | 'ol'>; label: string }> = [
  { value: 'p', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code block' },
];

const FONT_FAMILIES = ['Outfit', 'JetBrains Mono', 'Georgia', 'Arial'];
const FONT_SIZES = ['10pt', '11pt', '12pt', '14pt', '18pt', '24pt'];
const ZOOM_LEVELS = [75, 100, 125];

const BTN_BASE = 'inline-flex h-7 w-7 items-center justify-center rounded-none border transition-colors focus:outline-none';
const BTN_IDLE = 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';
const BTN_ACTIVE = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';
const btnClass = (active = false) => `${BTN_BASE} ${active ? BTN_ACTIVE : BTN_IDLE}`;
const SELECT_CLASS = 'h-7 rounded-none border border-[#30363D] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';
const TABLE_ACT_BTN = 'inline-flex h-7 items-center gap-1 rounded-none border border-[#22C55E]/50 bg-[#052E16] px-2 font-mono text-[11px] text-[#22C55E] transition-colors hover:border-[#22C55E] hover:bg-[#22C55E]/20 focus:outline-none';
const DIVIDER = <span className="mx-1 h-4 w-px shrink-0 bg-[#30363D]" aria-hidden="true" />;

export function OrbitDocToolbar({
  blockType, fontFamily, fontSize, zoom, activeFormats,
  onUndo, onRedo, onBlockTypeChange, onFontFamilyChange, onFontSizeChange,
  onInlineCommand, onAlignChange, onToggleList, onInsertTable,
  onAddTableRow, onAddTableCol, onDeleteTable,
  onInsertHorizontalRule, onClearFormatting, onZoomChange,
}: OrbitDocToolbarProps) {
  const fmt: DocActiveFormatState = activeFormats ?? {
    bold: false, italic: false, underline: false, strike: false, align: 'left', insideTable: false,
  };

  return (
    <div role="toolbar" aria-label="Document formatting toolbar" className="flex flex-wrap items-center gap-1 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
      <button type="button" aria-label="Undo" title="Undo" onClick={onUndo} className={btnClass()}><Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Redo" title="Redo" onClick={onRedo} className={btnClass()}><Redo2 className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}
      <select aria-label="Block style" value={blockType} onChange={(e) => onBlockTypeChange(e.target.value as Exclude<DocBlockType, 'ul' | 'ol'>)} className={`${SELECT_CLASS} w-32`}>
        {BLOCK_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {DIVIDER}
      <select aria-label="Font family" value={fontFamily} onChange={(e) => onFontFamilyChange(e.target.value)} className={`${SELECT_CLASS} w-32`}>
        {FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
      </select>
      <select aria-label="Font size" value={fontSize} onChange={(e) => onFontSizeChange(e.target.value)} className={`${SELECT_CLASS} w-20 font-mono`}>
        {FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
      {DIVIDER}
      <button type="button" aria-label="Bold" aria-pressed={fmt.bold} title="Bold" onClick={() => onInlineCommand('bold')} className={btnClass(fmt.bold)}><Bold className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Italic" aria-pressed={fmt.italic} title="Italic" onClick={() => onInlineCommand('italic')} className={btnClass(fmt.italic)}><Italic className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Underline" aria-pressed={fmt.underline} title="Underline" onClick={() => onInlineCommand('underline')} className={btnClass(fmt.underline)}><Underline className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Strikethrough" aria-pressed={fmt.strike} title="Strikethrough" onClick={() => onInlineCommand('strikeThrough')} className={btnClass(fmt.strike)}><Strikethrough className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}
      <button type="button" aria-label="Align left" aria-pressed={fmt.align === 'left'} title="Align left" onClick={() => onAlignChange('left')} className={btnClass(fmt.align === 'left')}><AlignLeft className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Align center" aria-pressed={fmt.align === 'center'} title="Align center" onClick={() => onAlignChange('center')} className={btnClass(fmt.align === 'center')}><AlignCenter className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Align right" aria-pressed={fmt.align === 'right'} title="Align right" onClick={() => onAlignChange('right')} className={btnClass(fmt.align === 'right')}><AlignRight className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Align justify" aria-pressed={fmt.align === 'justify'} title="Justify" onClick={() => onAlignChange('justify')} className={btnClass(fmt.align === 'justify')}><AlignJustify className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}
      <button type="button" aria-label="Bulleted list" title="Bulleted list" onClick={() => onToggleList('ul')} className={btnClass()}><List className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Numbered list" title="Numbered list" onClick={() => onToggleList('ol')} className={btnClass()}><ListOrdered className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}
      <button type="button" aria-label="Insert table" title="Insert 3x3 table" onClick={onInsertTable} className={btnClass(fmt.insideTable)}>
        <Table className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
      </button>
      {fmt.insideTable && (
        <>
          <button type="button" aria-label="+ Table Row" onClick={onAddTableRow} className={TABLE_ACT_BTN}><Plus className="h-3 w-3" strokeWidth={1.5} />+ Table Row</button>
          <button type="button" aria-label="+ Table Col" onClick={onAddTableCol} className={TABLE_ACT_BTN}><Plus className="h-3 w-3" strokeWidth={1.5} />+ Table Col</button>
          <button type="button" aria-label="Delete Table" onClick={onDeleteTable} className="inline-flex h-7 items-center gap-1 rounded-none border border-[#F85149]/50 bg-[#0D1117] px-2 font-mono text-[11px] text-[#F85149] hover:border-[#F85149] focus:outline-none">
            <Trash2 className="h-3 w-3" strokeWidth={1.5} />Delete Table
          </button>
        </>
      )}
      <button type="button" aria-label="Horizontal rule" title="Insert horizontal line" onClick={onInsertHorizontalRule} className={btnClass()}><Minus className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Clear formatting" title="Clear formatting" onClick={onClearFormatting} className={btnClass()}><Eraser className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}
      <select aria-label="Zoom" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className={`${SELECT_CLASS} w-20 font-mono`}>
        {ZOOM_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}%</option>)}
      </select>
    </div>
  );
}
