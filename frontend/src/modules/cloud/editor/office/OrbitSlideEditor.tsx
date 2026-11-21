import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { OrbitSlidePresenter } from './OrbitSlidePresenter';
import { OrbitSlideToolbar, SLIDE_THEMES, formatSlideNotes, parseSlideNotes, type SlideMeta } from './OrbitSlideToolbar';
import type { OfficeSlideContentDto, SlideItemDto } from './officeTypes';

export interface OrbitSlideEditorProps {
  value: OfficeSlideContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSlideContentDto) => void;
}

const DEFAULT_SLIDE: SlideItemDto = {
  title: 'Slide Title', subtitle: 'Subtitle or key takeaway', bullets: ['Key point one'], notes: '',
};

export function OrbitSlideEditor({ value, readOnly = false, onChange }: OrbitSlideEditorProps) {
  const [localSlides, setLocalSlides] = useState<SlideItemDto[]>(() => (value.slides.length > 0 ? value.slides : [DEFAULT_SLIDE]));
  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const bulletRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIdx = useRef<number | null>(null);

  useEffect(() => { if (value.slides.length > 0) setLocalSlides(value.slides); }, [value.slides]);
  useEffect(() => {
    if (pendingFocusIdx.current !== null) {
      const target = bulletRefs.current[pendingFocusIdx.current];
      pendingFocusIdx.current = null;
      target?.focus();
    }
  });

  const slides = localSlides.length > 0 ? localSlides : [DEFAULT_SLIDE];
  const safeIdx = Math.min(activeIdx, slides.length - 1);
  const current = slides[safeIdx] ?? DEFAULT_SLIDE;
  const meta = parseSlideNotes(current.notes);
  const themeTokens = SLIDE_THEMES[meta.theme];

  const commitSlides = (next: SlideItemDto[]) => { setLocalSlides(next); onChange({ slides: next }); };
  const updateSlide = (patch: Partial<SlideItemDto>) =>
    commitSlides(slides.map((s, idx) => (idx === safeIdx ? { ...s, ...patch } : s)));
  const updateMeta = (patch: Partial<Pick<SlideMeta, 'layout' | 'align' | 'theme'>>, nextClean = meta.cleanNotes) =>
    updateSlide({ notes: formatSlideNotes(nextClean, { layout: patch.layout ?? meta.layout, align: patch.align ?? meta.align, theme: patch.theme ?? meta.theme }) });

  const addSlide = () => {
    const notes = formatSlideNotes('', { layout: 'title-bullets', align: 'left', theme: meta.theme });
    const next = [...slides, { title: `Slide ${slides.length + 1}`, subtitle: '', bullets: ['New point'], notes }];
    commitSlides(next);
    setActiveIdx(next.length - 1);
  };
  const duplicateSlide = () => {
    commitSlides([...slides.slice(0, safeIdx + 1), { ...current, bullets: [...current.bullets] }, ...slides.slice(safeIdx + 1)]);
    setActiveIdx(safeIdx + 1);
  };
  const deleteSlide = () => {
    if (slides.length <= 1) return;
    commitSlides(slides.filter((_, idx) => idx !== safeIdx));
    setActiveIdx(Math.max(0, safeIdx - 1));
  };
  const moveSlide = (delta: number) => {
    const target = safeIdx + delta;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(safeIdx, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    commitSlides(next);
    setActiveIdx(target);
  };

  const handleBulletKeyDown = (e: KeyboardEvent<HTMLInputElement>, bIdx: number, bullet: string) => {
    if (e.key === 'ArrowUp' && bIdx > 0) { e.preventDefault(); bulletRefs.current[bIdx - 1]?.focus(); }
    else if (e.key === 'ArrowDown' && bIdx < current.bullets.length - 1) { e.preventDefault(); bulletRefs.current[bIdx + 1]?.focus(); }
    else if (!readOnly && e.key === 'Enter') {
      e.preventDefault();
      pendingFocusIdx.current = bIdx + 1;
      updateSlide({ bullets: [...current.bullets.slice(0, bIdx + 1), '', ...current.bullets.slice(bIdx + 1)] });
    } else if (!readOnly && e.key === 'Backspace' && bullet === '' && current.bullets.length > 1) {
      e.preventDefault();
      pendingFocusIdx.current = Math.max(0, bIdx - 1);
      updateSlide({ bullets: current.bullets.filter((_, i) => i !== bIdx) });
    }
  };

  if (presenting) {
    return <OrbitSlidePresenter slides={slides} activeIdx={safeIdx} layout={meta.layout} align={meta.align} theme={meta.theme} onSelect={setActiveIdx} onExit={() => setPresenting(false)} />;
  }

  const alignCls = meta.align === 'center' ? 'text-center' : meta.align === 'right' ? 'text-right' : 'text-left';
  const isCentered = meta.layout === 'centered-title';
  const isSection = meta.layout === 'section-header';
  const isTwoCol = meta.layout === 'two-column';
  const dividerAlign = meta.align === 'right' ? 'ml-auto' : meta.align === 'left' && !isCentered ? '' : 'mx-auto';

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      <OrbitSlideToolbar
        readOnly={readOnly} activeIdx={safeIdx} slideCount={slides.length} layout={meta.layout} align={meta.align} theme={meta.theme}
        onAddSlide={addSlide} onDuplicateSlide={duplicateSlide} onDeleteSlide={deleteSlide}
        onMoveUp={() => moveSlide(-1)} onMoveDown={() => moveSlide(1)}
        onChangeLayout={(layout) => updateMeta({ layout })} onChangeAlign={(align) => updateMeta({ align })} onChangeTheme={(theme) => updateMeta({ theme })}
        onAddBullet={() => { pendingFocusIdx.current = current.bullets.length; updateSlide({ bullets: [...current.bullets, ''] }); }}
        onPresent={() => setPresenting(true)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside aria-label="Slide filmstrip" className="flex w-56 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {slides.map((s, idx) => {
              const sMeta = parseSlideNotes(s.notes);
              const sTheme = SLIDE_THEMES[sMeta.theme];
              return (
                <button key={idx} type="button" onClick={() => setActiveIdx(idx)} className={`group flex w-full items-start gap-2 rounded-none text-left ${idx === safeIdx ? 'text-[#22C55E]' : 'text-[#8B949E]'}`}>
                  <span className="mt-1 w-4 shrink-0 font-mono text-[11px]">{idx + 1}</span>
                  <div className={`flex aspect-video min-w-0 flex-1 flex-col justify-between rounded-none border p-2 transition-colors ${sTheme.thumbCls} ${idx === safeIdx ? 'border-2 border-[#22C55E]' : 'border-[#30363D] group-hover:border-[#8B949E]'}`}>
                    <div className={`min-w-0 flex-1 ${sMeta.layout === 'section-header' ? `border-l-4 ${sTheme.accentBorder} pl-1.5 flex flex-col justify-center` : sMeta.layout === 'centered-title' ? 'flex flex-col items-center justify-center text-center' : ''}`}>
                      {sMeta.layout === 'title-bullets' && <div className={`mb-1 h-0.5 w-6 ${sTheme.accentBg}`} />}
                      <div className={`w-full truncate text-[10px] font-semibold ${sTheme.titleCls}`}>{s.title || 'Untitled Slide'}</div>
                      {sMeta.layout === 'centered-title' && <div className={`my-0.5 h-0.5 w-8 ${sTheme.accentBg}`} />}
                      {s.subtitle && <div className={`w-full truncate text-[8px] ${sTheme.subtitleCls}`}>{s.subtitle}</div>}
                      <div className={`mt-1 ${sMeta.layout === 'two-column' ? 'grid grid-cols-2 gap-1' : 'space-y-0.5'}`}>
                        {s.bullets.slice(0, 3).map((b, bIdx) => (
                          <div key={bIdx} className={`flex items-center gap-1 truncate text-[8px] ${sTheme.mutedCls} ${sMeta.layout === 'two-column' ? 'border border-[#30363D] px-1' : ''}`}>
                            <span className={`inline-block h-1 w-1 shrink-0 ${sTheme.accentBg}`} /><span className="truncate">{b || 'Bullet point'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[7px] uppercase text-[#8B949E]">
                      <span>{sMeta.layout.replace('-', ' ')}</span><span>16:9</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center overflow-y-auto bg-[#0D1117] p-6">
            <div aria-label="Slide stage" data-theme={meta.theme} data-layout={meta.layout} className={`flex aspect-video w-full max-w-4xl flex-col justify-between rounded-none border p-10 shadow-2xl ${themeTokens.cardCls}`}>
              {!isCentered && !isSection && <div className={`mb-2 h-1.5 w-20 ${themeTokens.accentBg}`} aria-hidden="true" />}
              <div className={`flex flex-1 flex-col ${isCentered || isSection ? 'justify-center' : 'justify-start'} ${isSection ? `border-l-8 ${themeTokens.accentBorder} bg-[#052E16]/25 pl-6` : ''} space-y-2.5`}>
                {isSection && <span className={`font-mono text-[11px] uppercase tracking-widest ${themeTokens.subtitleCls} ${alignCls}`}>SECTION HEADER</span>}
                <input type="text" aria-label="Slide title" readOnly={readOnly} value={current.title} onChange={(e) => updateSlide({ title: e.target.value })} placeholder="Click to add title" className={`w-full rounded-none border border-transparent bg-transparent px-2 py-1 ${isCentered || isSection ? 'text-4xl' : 'text-3xl'} font-bold ${themeTokens.titleCls} hover:border-[#30363D] focus:border-[#22C55E] focus:bg-[#0D1117]/50 focus:outline-none ${alignCls}`} />
                {isCentered && <div className={`h-0.5 w-24 ${dividerAlign} ${themeTokens.accentBg}`} aria-hidden="true" />}
                <input type="text" aria-label="Slide subtitle" readOnly={readOnly} value={current.subtitle} onChange={(e) => updateSlide({ subtitle: e.target.value })} placeholder="Click to add subtitle" className={`w-full rounded-none border border-transparent bg-transparent px-2 py-1 text-base ${themeTokens.subtitleCls} hover:border-[#30363D] focus:border-[#22C55E] focus:bg-[#0D1117]/50 focus:outline-none ${alignCls}`} />
                <div className={`pt-2 ${isTwoCol ? 'grid grid-cols-2 gap-2.5' : 'space-y-2'}`}>
                  {current.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className={`group flex items-center gap-2 border px-2 py-1 ${isTwoCol ? themeTokens.colFrameCls : 'border-transparent'} hover:border-[#30363D] focus-within:border-[#22C55E] focus-within:bg-[#0D1117]/50`}>
                      <span className={`inline-block h-1.5 w-1.5 shrink-0 ${themeTokens.accentBg}`} />
                      <input ref={(el) => { bulletRefs.current[bIdx] = el; }} type="text" aria-label={`Bullet ${bIdx + 1}`} readOnly={readOnly} value={bullet} onKeyDown={(e) => handleBulletKeyDown(e, bIdx, bullet)} onChange={(e) => updateSlide({ bullets: current.bullets.map((b, i) => (i === bIdx ? e.target.value : b)) })} placeholder="Click to add point..." className={`flex-1 rounded-none bg-transparent text-sm ${themeTokens.bodyCls} focus:outline-none ${alignCls}`} />
                      {!readOnly && (
                        <button type="button" aria-label={`Remove bullet ${bIdx + 1}`} onClick={() => updateSlide({ bullets: current.bullets.filter((_, i) => i !== bIdx) })} className="p-0.5 text-[#8B949E] opacity-70 hover:text-[#EF4444] group-hover:opacity-100">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button type="button" onClick={() => { pendingFocusIdx.current = current.bullets.length; updateSlide({ bullets: [...current.bullets, ''] }); }} className="inline-flex items-center gap-1 rounded-none border border-dashed border-[#30363D] px-2.5 py-1 text-xs text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]">
                      <Plus className="h-3 w-3" strokeWidth={1.5} /> Add bullet
                    </button>
                  )}
                </div>
              </div>
              <div className={`flex items-center justify-between border-t border-[#30363D]/60 pt-2 font-mono text-[10px] uppercase ${themeTokens.mutedCls}`}>
                <span>ORBIT SLIDES // {meta.layout.replace('-', ' ')} // {themeTokens.label}</span>
                <span>SLIDE {safeIdx + 1} OF {slides.length}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-[#30363D] bg-[#161B22] px-4 py-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#8B949E]">
                <MessageSquare className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} /> Speaker Notes
              </span>
              <button type="button" aria-label="Toggle speaker notes" onClick={() => setNotesOpen((v) => !v)} className="text-[#8B949E] hover:text-[#E6EDF3]">
                {notesOpen ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
            </div>
            {notesOpen && (
              <textarea rows={2} readOnly={readOnly} aria-label="Speaker notes" value={meta.cleanNotes} onChange={(e) => updateMeta({}, e.target.value)} placeholder="Click to add speaker notes..." className="mt-1.5 w-full resize-none rounded-none border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 font-sans text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
