import { BooleanNumber, HorizontalAlign, NamedStyleType, PresetListType, type IDocumentData } from '@univerjs/presets';
import { describe, expect, it } from 'vitest';
import type { OfficeDocContentDto } from './officeTypes';
import { fromUniverDocData, toUniverDocData } from './univerDocAdapter';

describe('univerDocAdapter', () => {
  it('round-trips all 9 DocBlockType variants, 4 alignments, inline HTML tags, and tables losslessly', () => {
    const dto: OfficeDocContentDto = {
      blocks: [
        { type: 'h1', text: '<b>Architecture</b> Overview', align: 'left' },
        { type: 'h2', text: 'System <i>Design</i>', align: 'center' },
        { type: 'h3', text: 'Storage Layer', align: 'right' },
        { type: 'p', text: 'Normal with <b>bold</b>, <i>italic</i>, <u>underline</u>, <s>strike</s>, and <code>code()</code>.', align: 'justify' },
        { type: 'quote', text: 'Distributed consensus note with <b>emphasis</b>', align: 'left' },
        { type: 'code', text: 'const orbit = true;', align: 'left' },
        { type: 'ul', text: 'First bullet <u>item</u>', align: 'left' },
        { type: 'ol', text: 'First numbered <b>step</b>', align: 'left' },
        { type: 'hr', text: '', align: 'left' },
      ],
      tables: [
        {
          rows: [
            ['Service', 'Database', 'Cache'],
            ['Orbit Cloud', 'PostgreSQL', 'Redis'],
          ],
        },
      ],
    };

    const docData = toUniverDocData(dto);
    expect(docData.body?.dataStream.endsWith('\r\n')).toBe(true);
    expect(docData.body?.paragraphs).toHaveLength(9);

    const h1Run = docData.body?.textRuns?.[0];
    expect(h1Run?.ts?.fs).toBe(22);
    expect(h1Run?.ts?.bl).toBe(BooleanNumber.TRUE);
    expect(h1Run?.ts?.cl?.rgb).toBe('#E6EDF3');

    // Verify plain paragraphs, headings, and lists explicitly carry bright readable text color (#E6EDF3)
    const runs = docData.body?.textRuns ?? [];
    expect(runs.length).toBeGreaterThanOrEqual(8);
    const nonQuoteCodeRuns = runs.filter((r) => r.ts?.cl?.rgb !== '#8B949E' && r.ts?.cl?.rgb !== '#22C55E');
    expect(nonQuoteCodeRuns.length).toBeGreaterThan(0);
    for (const run of nonQuoteCodeRuns) {
      expect(run.ts?.cl?.rgb).toBe('#E6EDF3');
    }

    const roundTripped = fromUniverDocData(docData);
    expect(roundTripped).toEqual(dto);
  });

  it('assigns explicit #E6EDF3 textRuns to plain p, h1..h3, ul, and ol blocks without inline tags', () => {
    const plainDto: OfficeDocContentDto = {
      blocks: [
        { type: 'p', text: 'Plain paragraph text', align: 'left' },
        { type: 'h1', text: 'Plain H1', align: 'left' },
        { type: 'h2', text: 'Plain H2', align: 'left' },
        { type: 'h3', text: 'Plain H3', align: 'left' },
        { type: 'ul', text: 'Plain bullet', align: 'left' },
        { type: 'ol', text: 'Plain numbered', align: 'left' },
      ],
      tables: [],
    };
    const docData = toUniverDocData(plainDto);
    const runs = docData.body?.textRuns ?? [];
    expect(runs).toHaveLength(6);
    for (const run of runs) {
      expect(run.ts?.cl?.rgb).toBe('#E6EDF3');
      expect(run.ts?.ff).toBe('Outfit');
    }
    expect(fromUniverDocData(docData)).toEqual(plainDto);
  });

  it('normalizes <strong/>, <em/>, <del/>, <br/>, strips unsafe tags and control chars, and preserves fallback tables', () => {
    const dto: OfficeDocContentDto = {
      blocks: [
        {
          type: 'p',
          text: '<strong>Strong</strong> <em>Em</em> <del>Del</del><br>Line2<script>alert(1)</script>',
          align: 'center',
        },
      ],
      tables: [],
    };
    const fallbackTables = [{ rows: [['A', 'B'], ['1', '2']] }];

    const docData = toUniverDocData(dto);
    delete docData.customProperties;
    const roundTripped = fromUniverDocData(docData, fallbackTables);

    expect(roundTripped.blocks[0]).toEqual({
      type: 'p',
      text: '<b>Strong</b> <i>Em</i> <s>Del</s> Line2',
      align: 'center',
    });
    expect(roundTripped.tables).toEqual(fallbackTables);
  });

  it('infers block types and alignments from raw Univer snapshots without orbit headingId tags', () => {
    const rawSnapshot: Partial<IDocumentData> = {
      id: 'raw-doc',
      body: {
        dataStream: 'Heading One\rHeading Two\rHeading Three\rCode Line\rQuote Line\rBullet Item\rOrdered Item\r\rPlain Text\r\n',
        textRuns: [
          { st: 0, ed: 11, ts: { fs: 22, bl: BooleanNumber.TRUE } },
          { st: 12, ed: 23, ts: { fs: 17, bl: BooleanNumber.TRUE } },
          { st: 24, ed: 37, ts: { fs: 14, bl: BooleanNumber.TRUE } },
          { st: 38, ed: 47, ts: { ff: 'JetBrains Mono', fs: 10.5 } },
          { st: 48, ed: 58, ts: { it: BooleanNumber.TRUE, cl: { rgb: '#8B949E' } } },
          { st: 85, ed: 90, ts: { bl: BooleanNumber.TRUE } },
        ],
        paragraphs: [
          { startIndex: 11, paragraphId: 'p1', paragraphStyle: { namedStyleType: NamedStyleType.HEADING_1 } },
          { startIndex: 23, paragraphId: 'p2', paragraphStyle: { horizontalAlign: HorizontalAlign.CENTER } },
          { startIndex: 37, paragraphId: 'p3', paragraphStyle: { horizontalAlign: HorizontalAlign.RIGHT } },
          { startIndex: 47, paragraphId: 'p4', paragraphStyle: {} },
          { startIndex: 58, paragraphId: 'p5', paragraphStyle: {} },
          { startIndex: 70, paragraphId: 'p6', bullet: { listType: PresetListType.BULLET_LIST, listId: 'l1', nestingLevel: 0 } },
          { startIndex: 83, paragraphId: 'p7', bullet: { listType: PresetListType.ORDER_LIST, listId: 'l2', nestingLevel: 0 } },
          { startIndex: 84, paragraphId: 'p8', paragraphStyle: { borderBottom: { padding: 4, width: 1, dashStyle: 1, color: { rgb: '#30363D' } } } },
          { startIndex: 95, paragraphId: 'p9', paragraphStyle: { horizontalAlign: HorizontalAlign.JUSTIFIED } },
        ],
      },
    };

    const parsed = fromUniverDocData(rawSnapshot);
    expect(parsed.blocks).toEqual([
      { type: 'h1', text: 'Heading One', align: 'left' },
      { type: 'h2', text: 'Heading Two', align: 'center' },
      { type: 'h3', text: 'Heading Three', align: 'right' },
      { type: 'code', text: 'Code Line', align: 'left' },
      { type: 'quote', text: 'Quote Line', align: 'left' },
      { type: 'ul', text: 'Bullet Item', align: 'left' },
      { type: 'ol', text: 'Ordered Item', align: 'left' },
      { type: 'hr', text: '', align: 'left' },
      { type: 'p', text: '<b>Plain</b> Text', align: 'justify' },
    ]);
  });

  it('handles empty or missing document body gracefully', () => {
    expect(fromUniverDocData({})).toEqual({
      blocks: [{ type: 'p', text: '', align: 'left' }],
      tables: [],
    });
    const emptyRoundTrip = fromUniverDocData(toUniverDocData({ blocks: [], tables: [] }));
    expect(emptyRoundTrip).toEqual({
      blocks: [{ type: 'p', text: '', align: 'left' }],
      tables: [],
    });
  });
});
