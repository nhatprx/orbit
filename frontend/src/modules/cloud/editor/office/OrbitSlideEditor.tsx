import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { OrbitOfficeHeader, type OrbitOfficeHeaderProps } from './OrbitOfficeHeader';
import { OrbitSlidePresenter } from './OrbitSlidePresenter';
import { OrbitSlideToolbar, SLIDE_THEMES, formatSlideNotes, parseSlideNotes, type SlideMeta } from './OrbitSlideToolbar';
import { UniverSlideCanvas, type UniverSlideCanvasHandle } from './UniverSlideCanvas';
import type { OfficeSlideContentDto, SlideItemDto } from './officeTypes';

export interface OrbitSlideEditorProps {
  value: OfficeSlideContentDto;
  readOnly?: boolean;
  headerProps?: Omit<OrbitOfficeHeaderProps, 'menuBar' | 'onExportCsv'>;
  onChange: (next: OfficeSlideContentDto) => void;
  onReady?: (handle: UniverSlideCanvasHandle) => void;
}

const DEFAULT_SLIDE: SlideItemDto = {
  title: 'Slide Title', subtitle: 'Subtitle or key takeaway', bullets: ['Key point one'], notes: '',
};

export function OrbitSlideEditor({ value, readOnly = false, headerProps, onChange, onReady }: OrbitSlideEditorProps) {
  const [localSlides, setLocalSlides] = useState<SlideItemDto[]>(() => (value.slides.length > 0 ? value.slides : [DEFAULT_SLIDE]));
  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const canvasRef = useRef<UniverSlideCanvasHandle | null>(null);
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

  const commitSlides = useCallback((next: SlideItemDto[], nextActiveIdx = safeIdx) => {
    setLocalSlides(next);
    canvasRef.current?.syncSlides({ slides: next }, nextActiveIdx);
    onChange({ slides: next });
  }, [onChange, safeIdx]);

  const updateSlide = (patch: Partial<SlideItemDto>) =>
    commitSlides(slides.map((s, idx) => (idx === safeIdx ? { ...s, ...patch } : s)), safeIdx);
  const updateMeta = (patch: Partial<Pick<SlideMeta, 'layout' | 'align' | 'theme'>>, nextClean = meta.cleanNotes) =>
    updateSlide({ notes: formatSlideNotes(nextClean, { layout: patch.layout ?? meta.layout, align: patch.align ?? meta.align, theme: patch.theme ?? meta.theme }) });

  const selectSlide = (idx: number) => { setActiveIdx(idx); canvasRef.current?.activateSlide(idx); };
  const addSlide = () => {
    const notes = formatSlideNotes('', { layout: 'title-bullets', align: 'left', theme: meta.theme });
    const next = [...slides, { title: `Slide ${slides.length + 1}`, subtitle: '', bullets: ['New point'], notes }];
    setActiveIdx(next.length - 1);
    commitSlides(next, next.length - 1);
  };
  const duplicateSlide = () => {
    const next = [...slides.slice(0, safeIdx + 1), { ...current, bullets: [...current.bullets] }, ...slides.slice(safeIdx + 1)];
    setActiveIdx(safeIdx + 1);
    commitSlides(next, safeIdx + 1);
  };
  const deleteSlide = () => {
    if (slides.length <= 1) return;
    const nextIdx = Math.max(0, safeIdx - 1);
    setActiveIdx(nextIdx);
    commitSlides(slides.filter((_, idx) => idx !== safeIdx), nextIdx);
  };
  const moveSlide = (delta: number) => {
    const target = safeIdx + delta;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(safeIdx, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    setActiveIdx(target);
    commitSlides(next, target);
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

  const handleSave = useCallback((closeAfter: boolean) => {
    if (!headerProps) return;
    canvasRef.current?.flushNow();
    headerProps.onSave(closeAfter);
  }, [headerProps]);

  if (presenting) {
    return <OrbitSlidePresenter slides={slides} activeIdx={safeIdx} layout={meta.layout} align={meta.align} theme={meta.theme} onSelect={selectSlide} onExit={() => setPresenting(false)} />;
  }

  const alignCls = meta.align === 'center' ? 'text-center' : meta.align === 'right' ? 'text-right' : 'text-left';
  const isTwoCol = meta.layout === 'two-column';

  return (
    <div aria-label="Orbit Slides Univer workspace" data-testid="orbit-slide-editor" className="flex h-full w-full flex-col rounded-none bg-[#0D1117]">
      {headerProps && <OrbitOfficeHeader {...headerProps} onSave={handleSave} />}
      <OrbitSlideToolbar
        readOnly={readOnly} activeIdx={safeIdx} slideCount={slides.length} layout={meta.layout} align={meta.align} theme={meta.theme}
        onAddSlide={addSlide} onDuplicateSlide={duplicateSlide} onDeleteSlide={deleteSlide}
        onMoveUp={() => moveSlide(-1)} onMoveDown={() => moveSlide(1)}
        onChangeLayout={(layout) => updateMeta({ layout })} onChangeAlign={(align) => updateMeta({ align })} onChangeTheme={(theme) => updateMeta({ theme })}
        onAddBullet={() => { pendingFocusIdx.current = current.bullets.length; updateSlide({ bullets: [...current.bullets, ''] }); }}
        onPresent={() => setPresenting(true)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside aria-label="Slide filmstrip" className="flex w-44 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-2.5 overflow-y-auto space-y-2">
          {slides.map((s, idx) => (
            <button key={idx} type="button" onClick={() => selectSlide(idx)} className={`flex w-full items-start gap-1.5 rounded-none border p-2 text-left ${idx === safeIdx ? 'border-[#22C55E] bg-[#052E16]/40 text-[#22C55E]' : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#8B949E]'}`}>
              <span className="font-mono text-[10px]">{idx + 1}</span>
              <span className="truncate text-xs font-semibold text-[#E6EDF3]">{s.title || 'Untitled Slide'}</span>
            </button>
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 overflow-hidden">
            <div className="flex min-h-[260px] flex-col border-b border-[#30363D] lg:border-b-0 lg:border-r">
              <UniverSlideCanvas ref={canvasRef} initialValue={value} readOnly={readOnly} onChange={(next) => { setLocalSlides(next.slides); onChange(next); }} onActiveSlideChange={setActiveIdx} onReady={onReady} />
            </div>
            <div className="flex items-center justify-center overflow-y-auto bg-[#0D1117] p-4">
              <div aria-label="Slide stage" data-theme={meta.theme} data-layout={meta.layout} className={`flex aspect-video w-full max-w-2xl flex-col justify-between rounded-none border p-6 shadow-2xl ${themeTokens.cardCls}`}>
                <div className="flex flex-1 flex-col space-y-2">
                  <input type="text" aria-label="Slide title" readOnly={readOnly} value={current.title} onChange={(e) => updateSlide({ title: e.target.value })} placeholder="Click to add title" className={`w-full rounded-none border border-transparent bg-transparent px-2 py-1 text-2xl font-bold ${themeTokens.titleCls} hover:border-[#30363D] focus:border-[#22C55E] focus:outline-none ${alignCls}`} />
                  <input type="text" aria-label="Slide subtitle" readOnly={readOnly} value={current.subtitle} onChange={(e) => updateSlide({ subtitle: e.target.value })} placeholder="Click to add subtitle" className={`w-full rounded-none border border-transparent bg-transparent px-2 py-1 text-sm ${themeTokens.subtitleCls} hover:border-[#30363D] focus:border-[#22C55E] focus:outline-none ${alignCls}`} />
                  <div className={`pt-1 ${isTwoCol ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}`}>
                    {current.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className={`group flex items-center gap-2 border px-2 py-1 ${isTwoCol ? themeTokens.colFrameCls : 'border-transparent'} hover:border-[#30363D] focus-within:border-[#22C55E]`}>
                        <span className={`inline-block h-1.5 w-1.5 shrink-0 ${themeTokens.accentBg}`} />
                        <input ref={(el) => { bulletRefs.current[bIdx] = el; }} type="text" aria-label={`Bullet ${bIdx + 1}`} readOnly={readOnly} value={bullet} onKeyDown={(e) => handleBulletKeyDown(e, bIdx, bullet)} onChange={(e) => updateSlide({ bullets: current.bullets.map((b, i) => (i === bIdx ? e.target.value : b)) })} placeholder="Click to add point..." className={`flex-1 rounded-none bg-transparent text-xs ${themeTokens.bodyCls} focus:outline-none ${alignCls}`} />
                        {!readOnly && <button type="button" aria-label={`Remove bullet ${bIdx + 1}`} onClick={() => updateSlide({ bullets: current.bullets.filter((_, i) => i !== bIdx) })} className="p-0.5 text-[#8B949E] hover:text-[#EF4444]"><Trash2 className="h-3 w-3" strokeWidth={1.5} /></button>}
                      </div>
                    ))}
                    {!readOnly && <button type="button" onClick={() => { pendingFocusIdx.current = current.bullets.length; updateSlide({ bullets: [...current.bullets, ''] }); }} className="inline-flex items-center gap-1 rounded-none border border-dashed border-[#30363D] px-2 py-1 text-xs text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]"><Plus className="h-3 w-3" strokeWidth={1.5} /> Add bullet</button>}
                  </div>
                </div>
                <div className={`flex items-center justify-between border-t border-[#30363D]/60 pt-2 font-mono text-[10px] uppercase ${themeTokens.mutedCls}`}>
                  <span>ORBIT SLIDES // {themeTokens.label}</span><span>SLIDE {safeIdx + 1} OF {slides.length}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#30363D] bg-[#161B22] px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#8B949E]"><MessageSquare className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} /> Speaker Notes</span>
              <button type="button" aria-label="Toggle speaker notes" onClick={() => setNotesOpen((v) => !v)} className="text-[#8B949E] hover:text-[#E6EDF3]">{notesOpen ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />}</button>
            </div>
            {notesOpen && <textarea rows={2} readOnly={readOnly} aria-label="Speaker notes" value={meta.cleanNotes} onChange={(e) => updateMeta({}, e.target.value)} placeholder="Click to add speaker notes..." className="mt-1.5 w-full resize-none rounded-none border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 font-sans text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none" />}
          </div>
        </div>
      </div>
    </div>
  );
}
