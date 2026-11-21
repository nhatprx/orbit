import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';
import {
  SLIDE_THEMES,
  parseSlideNotes,
  type SlideLayoutPreset,
  type SlideTextAlign,
  type SlideThemePreset,
} from './OrbitSlideToolbar';
import type { SlideItemDto } from './officeTypes';

interface OrbitSlidePresenterProps {
  slides: SlideItemDto[];
  activeIdx: number;
  layout?: SlideLayoutPreset;
  align?: SlideTextAlign;
  theme?: SlideThemePreset;
  onSelect: (index: number) => void;
  onExit: () => void;
}

export function OrbitSlidePresenter({
  slides,
  activeIdx,
  layout,
  align,
  theme,
  onSelect,
  onExit,
}: OrbitSlidePresenterProps) {
  const slide = slides[activeIdx] ?? {
    title: 'Untitled Slide',
    subtitle: '',
    bullets: [],
    notes: '',
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        onSelect(Math.min(slides.length - 1, activeIdx + 1));
      } else if (e.key === 'ArrowLeft') {
        onSelect(Math.max(0, activeIdx - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIdx, slides.length, onSelect, onExit]);

  const parsed = parseSlideNotes(slide.notes);
  const hasMetaTag = slide.notes.includes('<!--orbit:');
  const effLayout = hasMetaTag ? parsed.layout : (layout ?? parsed.layout);
  const effAlign = hasMetaTag ? parsed.align : (align ?? parsed.align);
  const effTheme = hasMetaTag ? parsed.theme : (theme ?? parsed.theme);
  const themeTokens = SLIDE_THEMES[effTheme];

  const alignClass =
    effAlign === 'center' ? 'text-center' : effAlign === 'right' ? 'text-right' : 'text-left';
  const isCentered = effLayout === 'centered-title';
  const isSection = effLayout === 'section-header';
  const isTwoCol = effLayout === 'two-column';
  const dividerAlign =
    effAlign === 'right' ? 'ml-auto' : effAlign === 'left' && !isCentered ? '' : 'mx-auto';

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[#22C55E]">
          Presentation Mode - Slide {activeIdx + 1} of {slides.length} ({themeTokens.label})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activeIdx <= 0}
            onClick={() => onSelect(Math.max(0, activeIdx - 1))}
            className="inline-flex items-center gap-1 rounded-none border border-[#30363D] bg-[#21262D] px-2.5 py-1 text-xs text-[#E6EDF3] hover:border-[#22C55E] disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Previous
          </button>
          <button
            type="button"
            disabled={activeIdx >= slides.length - 1}
            onClick={() => onSelect(Math.min(slides.length - 1, activeIdx + 1))}
            className="inline-flex items-center gap-1 rounded-none border border-[#30363D] bg-[#21262D] px-2.5 py-1 text-xs text-[#E6EDF3] hover:border-[#22C55E] disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1 rounded-none border border-[#22C55E] bg-[#052E16] px-3 py-1 text-xs font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
          >
            <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Exit Presentation
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8">
        <div
          data-theme={effTheme}
          data-layout={effLayout}
          className={`flex aspect-video w-full max-w-4xl flex-col justify-between rounded-none border-2 p-12 shadow-2xl ${themeTokens.cardCls}`}
        >
          {!isCentered && !isSection && (
            <div className={`mb-4 h-1.5 w-20 ${themeTokens.accentBg}`} aria-hidden="true" />
          )}
          <div
            className={`flex flex-1 flex-col ${
              isCentered || isSection ? 'justify-center' : 'justify-start'
            } ${
              isSection
                ? `border-l-8 ${themeTokens.accentBorder} bg-[#052E16]/25 pl-8`
                : ''
            } ${alignClass}`}
          >
            {isSection && (
              <span className="mb-2 font-mono text-xs uppercase tracking-widest text-[#22C55E]">
                SECTION HEADER
              </span>
            )}
            <h1 className={`${isCentered || isSection ? 'text-4xl' : 'text-3xl'} font-bold tracking-tight ${themeTokens.titleCls}`}>
              {slide.title || 'Untitled Slide'}
            </h1>
            {isCentered && (
              <div className={`my-4 h-0.5 w-28 ${dividerAlign} ${themeTokens.accentBg}`} aria-hidden="true" />
            )}
            {slide.subtitle && (
              <p className={`mt-2 text-lg ${themeTokens.subtitleCls}`}>{slide.subtitle}</p>
            )}
            {slide.bullets.length > 0 && (
              <ul className={`mt-8 ${isTwoCol ? 'grid grid-cols-2 gap-4' : 'space-y-3'}`}>
                {slide.bullets.map((bullet, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-3 text-base ${themeTokens.bodyCls} ${
                      isTwoCol ? `border p-3 ${themeTokens.colFrameCls}` : ''
                    } ${effAlign === 'center' ? 'justify-center' : effAlign === 'right' ? 'justify-end' : ''}`}
                  >
                    <span className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 ${themeTokens.accentBg}`} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`flex items-center justify-between border-t border-[#30363D] pt-3 font-mono text-[11px] ${themeTokens.mutedCls}`}>
            <span>ORBIT SLIDES // {themeTokens.label.toUpperCase()}</span>
            <span>{activeIdx + 1} / {slides.length}</span>
          </div>
        </div>
        {parsed.cleanNotes && (
          <div className="mt-3 w-full max-w-4xl border border-[#30363D] bg-[#161B22] px-4 py-2 text-xs text-[#8B949E]">
            <span className="mr-2 font-mono text-[10px] uppercase text-[#22C55E]">Notes:</span>
            {parsed.cleanNotes}
          </div>
        )}
      </div>
    </div>
  );
}
