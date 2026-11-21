import { PageElementType, PageType, type ISlideData } from '@univerjs/slides';
import { describe, expect, it } from 'vitest';
import { formatSlideNotes } from './OrbitSlideToolbar';
import type { OfficeSlideContentDto } from './officeTypes';
import {
  fromUniverSlideData,
  SLIDE_PAGE_HEIGHT,
  SLIDE_PAGE_WIDTH,
  toUniverSlideData,
} from './univerSlideAdapter';

describe('univerSlideAdapter', () => {
  it('round-trips multi-slide decks with titles, subtitles, bullets, and Orbit layout/theme/speaker notes losslessly', () => {
    const dto: OfficeSlideContentDto = {
      slides: [
        {
          title: 'Orbit Architecture',
          subtitle: 'High Concurrency Stack',
          bullets: ['Spring Boot 3 + Java 21', 'PostgreSQL + Redis', 'Univer Office SDK'],
          notes: formatSlideNotes('Opening keynote notes', {
            layout: 'title-bullets',
            align: 'left',
            theme: 'orbit-dark',
          }),
        },
        {
          title: 'Two Column Breakdown',
          subtitle: 'Frontend vs Backend',
          bullets: ['React 19 + Tailwind', 'Apache POI Codecs', 'Zero Rounded Corners', 'Square 6x6 Indicators'],
          notes: formatSlideNotes('Comparison slide', {
            layout: 'two-column',
            align: 'center',
            theme: 'emerald',
          }),
        },
      ],
    };

    const slideData = toUniverSlideData(dto);
    expect(slideData.pageSize).toEqual({ width: SLIDE_PAGE_WIDTH, height: SLIDE_PAGE_HEIGHT });
    expect(slideData.body?.pageOrder).toEqual(['slide-1', 'slide-2']);

    const page1 = slideData.body?.pages['slide-1']!;
    expect(page1.pageType).toBe(PageType.SLIDE);
    expect(page1.pageBackgroundFill.rgb).toBe('#161B22');
    expect(page1.pageElements['slide-1-accent']?.type).toBe(PageElementType.SHAPE);
    expect(page1.pageElements['slide-1-title']?.richText?.text).toBe('Orbit Architecture');
    expect(page1.pageElements['slide-1-subtitle']?.richText?.text).toBe('High Concurrency Stack');
    expect(page1.pageElements['slide-1-bullet-1']?.richText?.text).toBe('Spring Boot 3 + Java 21');

    const page2 = slideData.body?.pages['slide-2']!;
    expect(page2.pageBackgroundFill.rgb).toBe('#052E16');
    expect(page2.pageElements['slide-2-bullet-1']?.left).toBe(60);
    expect(page2.pageElements['slide-2-bullet-2']?.left).toBe(490);

    const roundTripped = fromUniverSlideData(slideData);
    expect(roundTripped).toEqual(dto);
  });

  it('extracts untagged text elements and rich-text document streams added via Univer Slides UI operations', () => {
    const rawSlideSnapshot: Partial<ISlideData> = {
      id: 'custom-deck',
      title: 'Custom Deck',
      pageSize: { width: 960, height: 540 },
      body: {
        pageOrder: ['p1'],
        pages: {
          p1: {
            id: 'p1',
            pageType: PageType.SLIDE,
            zIndex: 1,
            title: 'Fallback Title',
            description: 'Speaker cue',
            pageBackgroundFill: { rgb: '#161B22' },
            pageElements: {
              e1: {
                id: 'e1',
                zIndex: 10,
                title: 'text',
                description: '',
                type: PageElementType.TEXT,
                richText: { text: 'Canvas Authored Title', fs: 30 },
              },
              e2: {
                id: 'e2',
                zIndex: 22,
                title: 'text',
                description: '',
                type: PageElementType.TEXT,
                richText: {
                  rich: {
                    id: 'doc-1',
                    body: { dataStream: 'Rich document bullet\r\n' },
                    documentStyle: {},
                  },
                },
              },
            },
          },
        },
      },
    };

    const dto = fromUniverSlideData(rawSlideSnapshot);
    expect(dto.slides).toEqual([
      {
        title: 'Canvas Authored Title',
        subtitle: '',
        bullets: ['Rich document bullet'],
        notes: 'Speaker cue',
      },
    ]);
  });

  it('provides a valid default slide when converting empty snapshots', () => {
    expect(fromUniverSlideData({}).slides).toEqual([
      { title: 'Slide 1', subtitle: '', bullets: [''], notes: '' },
    ]);
    const emptyDto = fromUniverSlideData(toUniverSlideData({ slides: [] }));
    expect(emptyDto.slides).toEqual([
      { title: 'Slide 1', subtitle: '', bullets: [''], notes: '' },
    ]);
  });
});
