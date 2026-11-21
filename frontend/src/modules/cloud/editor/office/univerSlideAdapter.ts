import { BooleanNumber, LocaleType } from '@univerjs/presets';
import {
  BasicShapes, PageElementType, PageType,
  type IPageElement, type ISlideData, type ISlidePage,
} from '@univerjs/slides';
import { parseSlideNotes, type SlideThemePreset } from './OrbitSlideToolbar';
import type { OfficeSlideContentDto, SlideItemDto } from './officeTypes';

export const SLIDE_PAGE_WIDTH = 960;
export const SLIDE_PAGE_HEIGHT = 540;

const THEME_BG_HEX: Record<SlideThemePreset, string> = {
  'orbit-dark': '#161B22', emerald: '#052E16', slate: '#21262D', terminal: '#050806',
};
const THEME_TITLE_HEX: Record<SlideThemePreset, string> = {
  'orbit-dark': '#E6EDF3', emerald: '#ECFDF5', slate: '#FFFFFF', terminal: '#22C55E',
};
const THEME_ACCENT_HEX: Record<SlideThemePreset, string> = {
  'orbit-dark': '#22C55E', emerald: '#4ADE80', slate: '#22C55E', terminal: '#22C55E',
};

export function toUniverSlideData(dto: OfficeSlideContentDto): ISlideData {
  const slides: SlideItemDto[] = dto.slides?.length
    ? dto.slides
    : [{ title: 'Slide 1', subtitle: '', bullets: [''], notes: '' }];
  const pages: Record<string, ISlidePage> = {};
  const pageOrder: string[] = [];

  slides.forEach((slide, idx) => {
    const pageId = `slide-${idx + 1}`;
    pageOrder.push(pageId);
    const meta = parseSlideNotes(slide.notes ?? '');
    const isTwoCol = meta.layout === 'two-column';
    const isCentered = meta.layout === 'centered-title';
    const fontFamily = meta.theme === 'terminal' ? 'JetBrains Mono' : 'Outfit';
    const titleColor = THEME_TITLE_HEX[meta.theme];
    const accentColor = THEME_ACCENT_HEX[meta.theme];
    const pageElements: Record<string, IPageElement> = {
      [`${pageId}-accent`]: {
        id: `${pageId}-accent`, zIndex: 1, left: isCentered ? 430 : 60, top: 42, width: 100, height: 6,
        title: 'slide-accent', description: 'accent', type: PageElementType.SHAPE,
        shape: { shapeType: BasicShapes.Rect, text: '', shapeProperties: { shapeBackgroundFill: { rgb: accentColor } } },
      },
      [`${pageId}-title`]: {
        id: `${pageId}-title`, zIndex: 10, left: 60, top: 64, width: 840, height: 56,
        title: 'slide-title', description: 'title', type: PageElementType.TEXT,
        richText: { text: slide.title ?? '', fs: 30, bl: BooleanNumber.TRUE, ff: fontFamily, cl: { rgb: titleColor } },
      },
      [`${pageId}-subtitle`]: {
        id: `${pageId}-subtitle`, zIndex: 11, left: 60, top: 128, width: 840, height: 36,
        title: 'slide-subtitle', description: 'subtitle', type: PageElementType.TEXT,
        richText: { text: slide.subtitle ?? '', fs: 18, ff: fontFamily, cl: { rgb: accentColor } },
      },
    };

    (slide.bullets ?? []).forEach((bullet, bIdx) => {
      const elemId = `${pageId}-bullet-${bIdx + 1}`;
      pageElements[elemId] = {
        id: elemId, zIndex: 20 + bIdx,
        left: isTwoCol ? (bIdx % 2 === 0 ? 60 : 490) : 60,
        top: isTwoCol ? 188 + Math.floor(bIdx / 2) * 52 : 188 + bIdx * 46,
        width: isTwoCol ? 410 : 840, height: 38,
        title: 'slide-bullet', description: `bullet:${bIdx}`, type: PageElementType.TEXT,
        richText: { text: bullet ?? '', fs: 16, ff: fontFamily, cl: { rgb: titleColor } },
      };
    });

    pages[pageId] = {
      id: pageId, pageType: PageType.SLIDE, zIndex: idx + 1,
      title: slide.title || `Slide ${idx + 1}`, description: slide.notes ?? '',
      pageBackgroundFill: { rgb: THEME_BG_HEX[meta.theme] }, pageElements,
    };
  });

  return {
    id: 'orbit-slides', locale: LocaleType.EN_US, title: 'Orbit Presentation',
    pageSize: { width: SLIDE_PAGE_WIDTH, height: SLIDE_PAGE_HEIGHT },
    body: { pages, pageOrder },
  };
}

function extractElementText(el: IPageElement): string {
  if (typeof el.richText?.text === 'string') return el.richText.text;
  const richStream = el.richText?.rich?.body?.dataStream ?? el.document?.body?.dataStream;
  if (typeof richStream === 'string') return richStream.replace(/\r\n$/, '').replace(/\r/g, ' ');
  return typeof el.shape?.text === 'string' ? el.shape.text : '';
}

export function fromUniverSlideData(snapshot: Partial<ISlideData>): OfficeSlideContentDto {
  const pageMap = snapshot.body?.pages ?? {};
  const order = snapshot.body?.pageOrder?.length ? snapshot.body.pageOrder : Object.keys(pageMap);
  const slides: SlideItemDto[] = [];

  order.forEach((pageId, idx) => {
    const page = pageMap[pageId];
    if (!page) return;
    const elements = Object.values(page.pageElements ?? {}).sort(
      (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || (a.top ?? 0) - (b.top ?? 0)
    );
    let title: string | undefined;
    let subtitle = '';
    const bullets: string[] = [];

    for (const el of elements) {
      if (el.type !== PageElementType.TEXT) continue;
      const text = extractElementText(el);
      if (el.description === 'title' || el.title === 'slide-title' || el.id.endsWith('-title')) title = text;
      else if (el.description === 'subtitle' || el.title === 'slide-subtitle' || el.id.endsWith('-subtitle')) subtitle = text;
      else if (el.description?.startsWith('bullet') || el.title === 'slide-bullet' || el.id.includes('-bullet-')) bullets.push(text);
      else if (title === undefined) title = text;
      else bullets.push(text);
    }

    slides.push({
      title: title ?? (page.title && page.title !== page.id ? page.title : `Slide ${idx + 1}`),
      subtitle, bullets, notes: page.description ?? '',
    });
  });

  return { slides: slides.length > 0 ? slides : [{ title: 'Slide 1', subtitle: '', bullets: [''], notes: '' }] };
}
