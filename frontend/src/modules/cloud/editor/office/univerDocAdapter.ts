import {
  BooleanNumber, DashStyleType, HorizontalAlign, LocaleType, NamedStyleType,
  PRESET_LIST_TYPE, PresetListType,
  type IDocumentData, type IParagraph, type IParagraphStyle, type ITextRun, type ITextStyle,
} from '@univerjs/presets';
import { decodeHtmlEntities, escapeHtmlEntities, normalizeDocAlign, sanitizeInlineHtml } from './docHtmlCodec';
import type { DocAlign, DocBlockDto, DocBlockType, DocTableDto, OfficeDocContentDto } from './officeTypes';

interface InlineFlags { b: boolean; i: boolean; u: boolean; s: boolean; code: boolean; }

const ALIGN_TO_UNIVER: Record<DocAlign, HorizontalAlign> = {
  left: HorizontalAlign.LEFT, center: HorizontalAlign.CENTER,
  right: HorizontalAlign.RIGHT, justify: HorizontalAlign.JUSTIFIED,
};
const VALID_BLOCK_TYPES = new Set<DocBlockType>(['h1', 'h2', 'h3', 'p', 'quote', 'code', 'ul', 'ol', 'hr']);

function fromUniverAlign(ht?: HorizontalAlign): DocAlign {
  return ht === HorizontalAlign.CENTER ? 'center' : ht === HorizontalAlign.RIGHT ? 'right' : ht === HorizontalAlign.JUSTIFIED ? 'justify' : 'left';
}

function buildRunStyle(blockType: DocBlockType, f: InlineFlags): { ts: ITextStyle; sId?: string } {
  const ts: ITextStyle = {};
  if (blockType === 'h1' || blockType === 'h2' || blockType === 'h3') {
    ts.fs = blockType === 'h1' ? 22 : blockType === 'h2' ? 17 : 14;
    ts.bl = BooleanNumber.TRUE;
  } else if (blockType === 'quote') { ts.it = BooleanNumber.TRUE; ts.cl = { rgb: '#8B949E' }; }
  else if (blockType === 'code') { ts.ff = 'JetBrains Mono'; ts.fs = 10.5; ts.cl = { rgb: '#22C55E' }; }
  if (f.b) ts.bl = BooleanNumber.TRUE;
  if (f.i) ts.it = BooleanNumber.TRUE;
  if (f.u) ts.ul = { s: BooleanNumber.TRUE };
  if (f.s) ts.st = { s: BooleanNumber.TRUE };
  if (f.code) { ts.ff = 'JetBrains Mono'; if (blockType !== 'code') ts.cl = { rgb: '#22C55E' }; }
  const active = [f.b && 'b', f.i && 'i', f.u && 'u', f.s && 's', f.code && 'code'].filter(Boolean).join(',');
  return { ts, ...(active ? { sId: `orbit-inline:${active}` } : {}) };
}

function parseBlockInline(rawHtml: string, baseOffset: number, blockType: DocBlockType): { text: string; runs: ITextRun[] } {
  if (blockType === 'hr') return { text: '', runs: [] };
  const safe = sanitizeInlineHtml(rawHtml);
  const tagRe = /<(\/?)(b|strong|i|em|u|s|del|strike|code|br)>/gi;
  const counts = { b: 0, i: 0, u: 0, s: 0, code: 0 };
  const runs: ITextRun[] = [];
  let plain = '', lastIdx = 0, match: RegExpExecArray | null;
  const pushChunk = (rawChunk: string) => {
    const chunk = decodeHtmlEntities(rawChunk);
    if (!chunk) return;
    const st = baseOffset + plain.length;
    plain += chunk;
    const { ts, sId } = buildRunStyle(blockType, { b: counts.b > 0, i: counts.i > 0, u: counts.u > 0, s: counts.s > 0, code: counts.code > 0 });
    if (Object.keys(ts).length > 0 || sId) runs.push({ st, ed: baseOffset + plain.length, ...(sId ? { sId } : {}), ts });
  };
  while ((match = tagRe.exec(safe)) !== null) {
    pushChunk(safe.slice(lastIdx, match.index));
    const closing = match[1] === '/', tag = (match[2] ?? '').toLowerCase();
    if (tag === 'br') { if (!closing) pushChunk(' '); }
    else {
      const k = tag === 'strong' ? 'b' : tag === 'em' ? 'i' : (tag === 'del' || tag === 'strike') ? 's' : (tag as keyof typeof counts);
      counts[k] = Math.max(0, counts[k] + (closing ? -1 : 1));
    }
    lastIdx = tagRe.lastIndex;
  }
  pushChunk(safe.slice(lastIdx));
  return { text: plain, runs };
}

export function toUniverDocData(dto: OfficeDocContentDto): IDocumentData {
  const blocks: DocBlockDto[] = dto.blocks?.length ? dto.blocks : [{ type: 'p', text: '', align: 'left' }];
  const textRuns: ITextRun[] = [], paragraphs: IParagraph[] = [];
  let stream = '';
  blocks.forEach((block, idx) => {
    const type: DocBlockType = VALID_BLOCK_TYPES.has(block.type) ? block.type : 'p';
    const align: DocAlign = normalizeDocAlign(block.align);
    const { text, runs } = parseBlockInline(block.text ?? '', stream.length, type);
    stream += text;
    textRuns.push(...runs);
    const paraIndex = stream.length;
    stream += '\r';
    const paragraphStyle: IParagraphStyle = {
      horizontalAlign: ALIGN_TO_UNIVER[align], headingId: `orbit:${type}`,
      namedStyleType: type === 'h1' ? NamedStyleType.HEADING_1 : type === 'h2' ? NamedStyleType.HEADING_2 : type === 'h3' ? NamedStyleType.HEADING_3 : NamedStyleType.NORMAL_TEXT,
    };
    if (type === 'h1' || type === 'h2' || type === 'h3') paragraphStyle.textStyle = { fs: type === 'h1' ? 22 : type === 'h2' ? 17 : 14, bl: BooleanNumber.TRUE };
    else if (type === 'quote') {
      paragraphStyle.indentStart = { v: 16 };
      paragraphStyle.borderLeft = { padding: 8, color: { rgb: '#22C55E' }, width: 2, dashStyle: DashStyleType.SOLID };
      paragraphStyle.textStyle = { it: BooleanNumber.TRUE, cl: { rgb: '#8B949E' } };
    } else if (type === 'code') {
      paragraphStyle.shading = { backgroundColor: { rgb: '#161B22' } };
      paragraphStyle.textStyle = { ff: 'JetBrains Mono', fs: 10.5, cl: { rgb: '#22C55E' } };
    } else if (type === 'hr') paragraphStyle.borderBottom = { padding: 5, color: { rgb: '#30363D' }, width: 1, dashStyle: DashStyleType.SOLID };
    const bullet = (type === 'ul' || type === 'ol')
      ? { listType: type === 'ol' ? PresetListType.ORDER_LIST : PresetListType.BULLET_LIST, listId: type === 'ol' ? 'orbit-ol' : 'orbit-ul', nestingLevel: 0 }
      : undefined;
    paragraphs.push({ startIndex: paraIndex, paragraphId: `p-${idx + 1}`, paragraphStyle, ...(bullet ? { bullet } : {}) });
  });
  const sectionIndex = stream.length;
  stream += '\n';
  return {
    id: 'orbit-doc', title: 'Orbit Document', locale: LocaleType.EN_US, lists: PRESET_LIST_TYPE,
    customProperties: { orbitTables: { type: 'string', value: JSON.stringify(dto.tables ?? []) } },
    body: { dataStream: stream, textRuns, paragraphs, sectionBreaks: [{ startIndex: sectionIndex, sectionId: 'sec-1' }] },
    documentStyle: { pageSize: { width: 794, height: 1123 }, marginTop: 56, marginBottom: 56, marginLeft: 64, marginRight: 64, textStyle: { ff: 'Outfit', fs: 11, cl: { rgb: '#E6EDF3' } } },
  };
}

function inferBlockType(para: IParagraph | undefined, runs: ITextRun[], isEmpty: boolean): DocBlockType {
  if (para?.bullet?.listType) return String(para.bullet.listType).toUpperCase().includes('ORDER') ? 'ol' : 'ul';
  const style = para?.paragraphStyle;
  if (isEmpty && (style?.borderBottom || style?.headingId === 'orbit:hr')) return 'hr';
  if (style?.namedStyleType === NamedStyleType.HEADING_1) return 'h1';
  if (style?.namedStyleType === NamedStyleType.HEADING_2) return 'h2';
  if (style?.namedStyleType === NamedStyleType.HEADING_3) return 'h3';
  const tag = style?.headingId?.startsWith('orbit:') ? (style.headingId.slice(6) as DocBlockType) : undefined;
  if (tag && VALID_BLOCK_TYPES.has(tag) && tag !== 'p') return tag;
  if (!tag) {
    if (style?.shading) return 'code';
    if (style?.borderLeft) return 'quote';
    const maxFs = Math.max(0, ...runs.map((r) => r.ts?.fs ?? 0));
    if (maxFs >= 20) return 'h1';
    if (maxFs >= 16) return 'h2';
    if (maxFs >= 13.5 && runs.some((r) => r.ts?.bl === BooleanNumber.TRUE)) return 'h3';
    if (runs.length > 0 && runs.every((r) => Boolean(r.ts?.ff && /mono/i.test(r.ts.ff)) && !r.sId?.startsWith('orbit-inline:'))) return 'code';
    if (runs.length > 0 && runs.every((r) => r.ts?.it === BooleanNumber.TRUE && r.ts?.cl?.rgb?.toUpperCase() === '#8B949E' && !r.sId?.startsWith('orbit-inline:'))) return 'quote';
  }
  return 'p';
}

function reconstructParagraphHtml(stream: string, pStart: number, pEnd: number, runs: ITextRun[], blockType: DocBlockType): string {
  if (blockType === 'hr' || pEnd <= pStart) return '';
  const pts = new Set<number>([pStart, pEnd]);
  runs.forEach((r) => { pts.add(Math.max(pStart, r.st)); pts.add(Math.min(pEnd, r.ed)); });
  const bounds = [...pts].sort((a, b) => a - b);
  const isHeading = blockType === 'h1' || blockType === 'h2' || blockType === 'h3';
  const segs: Array<{ text: string; f: InlineFlags }> = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const s = bounds[i]!, e = bounds[i + 1]!;
    if (e <= s) continue;
    const r = runs.find((run) => run.st <= s && run.ed >= e);
    const inlineSet = new Set(r?.sId?.startsWith('orbit-inline:') ? r.sId.slice(13).split(',') : []);
    const partialBold = isHeading && runs.some((x) => x.ts?.bl !== BooleanNumber.TRUE);
    const partialItalic = blockType === 'quote' && runs.some((x) => x.ts?.it !== BooleanNumber.TRUE);
    const f: InlineFlags = {
      b: inlineSet.has('b') || (r?.ts?.bl === BooleanNumber.TRUE && (!isHeading || partialBold)),
      i: inlineSet.has('i') || (r?.ts?.it === BooleanNumber.TRUE && (blockType !== 'quote' || partialItalic)),
      u: inlineSet.has('u') || r?.ts?.ul?.s === BooleanNumber.TRUE,
      s: inlineSet.has('s') || r?.ts?.st?.s === BooleanNumber.TRUE,
      code: inlineSet.has('code') || (Boolean(r?.ts?.ff && /mono/i.test(r.ts.ff)) && blockType !== 'code'),
    };
    const prev = segs[segs.length - 1];
    if (prev && prev.f.b === f.b && prev.f.i === f.i && prev.f.u === f.u && prev.f.s === f.s && prev.f.code === f.code) prev.text += stream.slice(s, e);
    else segs.push({ text: stream.slice(s, e), f });
  }
  return segs.map(({ text, f }) => {
    let out = escapeHtmlEntities(text);
    (['code', 's', 'u', 'i', 'b'] as const).forEach((t) => { if (f[t]) out = `<${t}>${out}</${t}>`; });
    return out;
  }).join('');
}

export function fromUniverDocData(snapshot: Partial<IDocumentData>, fallbackTables: DocTableDto[] = []): OfficeDocContentDto {
  let tables: DocTableDto[] = fallbackTables.map((t) => ({ rows: t.rows.map((r) => [...r]) }));
  const prop = snapshot.customProperties?.orbitTables;
  if (prop?.type === 'string' && prop.value) { try { const parsed = JSON.parse(prop.value); if (Array.isArray(parsed)) tables = parsed; } catch { /* fallback */ } }
  const rawStream = snapshot.body?.dataStream ?? '';
  const stream = rawStream.endsWith('\n') ? rawStream.slice(0, -1) : rawStream;
  const paragraphs = snapshot.body?.paragraphs ?? [];
  const paraByIndex = new Map<number, IParagraph>(paragraphs.map((p) => [p.startIndex, p]));
  const runs = snapshot.body?.textRuns ?? [];
  const crIndices: number[] = [];
  for (let i = 0; i < stream.length; i += 1) if (stream[i] === '\r') crIndices.push(i);
  if (crIndices.length === 0 && stream.length > 0) crIndices.push(stream.length);
  const blocks: DocBlockDto[] = [];
  let pStart = 0;
  crIndices.forEach((pEnd, idx) => {
    const para = paraByIndex.get(pEnd) ?? paragraphs[idx];
    const pRuns = runs.filter((r) => r.ed > pStart && r.st < pEnd);
    const type = inferBlockType(para, pRuns, pEnd === pStart);
    blocks.push({ type, text: reconstructParagraphHtml(stream, pStart, pEnd, pRuns, type), align: fromUniverAlign(para?.paragraphStyle?.horizontalAlign) });
    pStart = pEnd + 1;
  });
  return { blocks: blocks.length > 0 ? blocks : [{ type: 'p', text: '', align: 'left' }], tables };
}
