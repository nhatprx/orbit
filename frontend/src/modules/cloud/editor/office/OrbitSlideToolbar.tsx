import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy,
  LayoutTemplate, ListPlus, Palette, Play, Plus, Trash2,
} from 'lucide-react';

export type SlideLayoutPreset = 'title-bullets' | 'centered-title' | 'two-column' | 'section-header';
export type SlideTextAlign = 'left' | 'center' | 'right';
export type SlideThemePreset = 'orbit-dark' | 'emerald' | 'slate' | 'terminal';

export interface SlideMeta {
  cleanNotes: string;
  layout: SlideLayoutPreset;
  align: SlideTextAlign;
  theme: SlideThemePreset;
}

export interface SlideThemeTokens {
  label: string; cardCls: string; thumbCls: string; accentBg: string; accentBorder: string;
  titleCls: string; subtitleCls: string; bodyCls: string; mutedCls: string; colFrameCls: string;
}

export const SLIDE_THEMES: Record<SlideThemePreset, SlideThemeTokens> = {
  'orbit-dark': {
    label: 'Orbit Dark', cardCls: 'border-[#30363D] bg-[#161B22]', thumbCls: 'bg-[#0D1117]',
    accentBg: 'bg-[#22C55E]', accentBorder: 'border-[#22C55E]', titleCls: 'font-sans text-[#E6EDF3]',
    subtitleCls: 'font-sans text-[#22C55E]', bodyCls: 'font-sans text-[#E6EDF3]', mutedCls: 'text-[#8B949E]',
    colFrameCls: 'border-[#30363D] bg-[#0D1117]/70',
  },
  emerald: {
    label: 'Emerald Matrix', cardCls: 'border-[#22C55E]/80 bg-[#052E16]/75', thumbCls: 'bg-[#052E16]/60',
    accentBg: 'bg-[#4ADE80]', accentBorder: 'border-[#4ADE80]', titleCls: 'font-sans text-[#ECFDF5]',
    subtitleCls: 'font-sans text-[#4ADE80]', bodyCls: 'font-sans text-[#D1FAE5]', mutedCls: 'text-[#86EFAC]/80',
    colFrameCls: 'border-[#22C55E]/50 bg-[#022C22]/80',
  },
  slate: {
    label: 'Slate Contrast', cardCls: 'border-[#484F58] bg-[#21262D]', thumbCls: 'bg-[#161B22]',
    accentBg: 'bg-[#22C55E]', accentBorder: 'border-[#22C55E]', titleCls: 'font-sans tracking-tight text-white',
    subtitleCls: 'font-sans text-[#4ADE80]', bodyCls: 'font-sans text-[#E6EDF3]', mutedCls: 'text-[#8B949E]',
    colFrameCls: 'border-[#484F58] bg-[#0D1117]/80',
  },
  terminal: {
    label: 'Terminal Green', cardCls: 'border-[#22C55E] bg-[#050806]', thumbCls: 'bg-[#050806]',
    accentBg: 'bg-[#22C55E]', accentBorder: 'border-[#22C55E]', titleCls: 'font-mono text-[#22C55E]',
    subtitleCls: 'font-mono text-[#4ADE80]', bodyCls: 'font-mono text-[#86EFAC]', mutedCls: 'text-[#22C55E]/70',
    colFrameCls: 'border-[#22C55E]/50 bg-[#052E16]/35',
  },
};

const META_TAG_RE = /\n?<!--orbit:([^>]*)-->\s*$/;

export function normalizeSlideTheme(raw?: string): SlideThemePreset {
  const v = (raw ?? '').trim().toLowerCase();
  if (v.startsWith('emerald')) return 'emerald';
  if (v.startsWith('slate')) return 'slate';
  if (v.startsWith('terminal')) return 'terminal';
  return 'orbit-dark';
}

export function parseSlideNotes(notes = ''): SlideMeta {
  const match = notes.match(META_TAG_RE);
  const cleanNotes = notes.replace(META_TAG_RE, '');
  let layout: SlideLayoutPreset = 'title-bullets';
  let align: SlideTextAlign = 'left';
  let theme: SlideThemePreset = 'orbit-dark';
  if (match?.[1]) {
    for (const part of match[1].split(';')) {
      const [k, v] = part.split('=').map((s) => s?.trim());
      if (k === 'layout' && (v === 'title-bullets' || v === 'centered-title' || v === 'two-column' || v === 'section-header')) layout = v;
      else if (k === 'align' && (v === 'left' || v === 'center' || v === 'right')) align = v;
      else if (k === 'theme' && v) theme = normalizeSlideTheme(v);
    }
  }
  return { cleanNotes, layout, align, theme };
}

export function formatSlideNotes(cleanNotes: string, meta: Pick<SlideMeta, 'layout' | 'align' | 'theme'>): string {
  const base = cleanNotes.replace(META_TAG_RE, '');
  const tag = `<!--orbit:layout=${meta.layout};align=${meta.align};theme=${meta.theme}-->`;
  return base ? `${base}\n${tag}` : tag;
}

export interface OrbitSlideToolbarProps {
  readOnly: boolean; activeIdx: number; slideCount: number;
  layout: SlideLayoutPreset; align: SlideTextAlign; theme?: SlideThemePreset;
  onAddSlide: () => void; onDuplicateSlide: () => void; onDeleteSlide: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onChangeLayout: (layout: SlideLayoutPreset) => void;
  onChangeAlign: (align: SlideTextAlign) => void;
  onChangeTheme?: (theme: SlideThemePreset) => void;
  onAddBullet: () => void; onPresent: () => void;
}

const BTN_BASE =
  'inline-flex items-center gap-1 rounded-none border border-[#30363D] bg-[#21262D] px-2 py-1 text-xs text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E] disabled:pointer-events-none disabled:opacity-40';
const ICON_BTN =
  'inline-flex items-center justify-center rounded-none border border-[#30363D] bg-[#21262D] p-1.5 text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3] disabled:pointer-events-none disabled:opacity-40';

export function OrbitSlideToolbar({
  readOnly, activeIdx, slideCount, layout, align, theme = 'orbit-dark',
  onAddSlide, onDuplicateSlide, onDeleteSlide, onMoveUp, onMoveDown,
  onChangeLayout, onChangeAlign, onChangeTheme, onAddBullet, onPresent,
}: OrbitSlideToolbarProps) {
  return (
    <div role="toolbar" aria-label="Slide toolbar" className="flex flex-wrap items-center gap-1.5 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
      {!readOnly && (
        <>
          <button type="button" onClick={onAddSlide} className={BTN_BASE} title="New Slide">
            <Plus className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} /><span>New Slide</span>
          </button>
          <button type="button" aria-label="Duplicate slide" title="Duplicate Slide" onClick={onDuplicateSlide} className={ICON_BTN}>
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label="Delete slide" title="Delete Slide" disabled={slideCount <= 1} onClick={onDeleteSlide} className={`${ICON_BTN} hover:border-[#EF4444] hover:text-[#EF4444]`}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label="Move slide up" title="Move Slide Up" disabled={activeIdx <= 0} onClick={onMoveUp} className={ICON_BTN}>
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label="Move slide down" title="Move Slide Down" disabled={activeIdx >= slideCount - 1} onClick={onMoveDown} className={ICON_BTN}>
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <div className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
          <div className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-1">
            <LayoutTemplate className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
            <select aria-label="Slide layout" value={layout} onChange={(e) => onChangeLayout(e.target.value as SlideLayoutPreset)} className="rounded-none bg-[#0D1117] font-mono text-xs text-[#E6EDF3] focus:outline-none">
              <option value="title-bullets">Title &amp; Bullets</option>
              <option value="centered-title">Centered Title</option>
              <option value="two-column">Two Column</option>
              <option value="section-header">Section Header</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-1">
            <Palette className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
            <select aria-label="Slide theme" value={theme} onChange={(e) => onChangeTheme?.(normalizeSlideTheme(e.target.value))} className="rounded-none bg-[#0D1117] font-mono text-xs text-[#E6EDF3] focus:outline-none">
              <option value="orbit-dark">Orbit Dark</option>
              <option value="emerald">Emerald Matrix</option>
              <option value="slate">Slate Contrast</option>
              <option value="terminal">Terminal Green</option>
            </select>
          </div>
          <div className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
          <div className="inline-flex items-center gap-0.5">
            {(['left', 'center', 'right'] as const).map((dir) => {
              const Icon = dir === 'left' ? AlignLeft : dir === 'center' ? AlignCenter : AlignRight;
              return (
                <button key={dir} type="button" aria-label={`Align ${dir}`} title={`Align ${dir}`} onClick={() => onChangeAlign(dir)} className={`inline-flex items-center justify-center rounded-none border p-1.5 transition-colors ${align === dir ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : 'border-[#30363D] bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3]'}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={onAddBullet} className={BTN_BASE} title="Add Bullet Point">
            <ListPlus className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} /><span>Add Bullet Point</span>
          </button>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="font-mono text-[11px] text-[#8B949E]">SLIDE {activeIdx + 1} / {slideCount}</span>
        <button type="button" onClick={onPresent} className="inline-flex items-center gap-1.5 rounded-none border border-[#22C55E] bg-[#052E16] px-3 py-1 text-xs font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E] hover:text-[#0D1117]">
          <Play className="h-3.5 w-3.5" strokeWidth={1.5} /><span>Present</span>
        </button>
      </div>
    </div>
  );
}
