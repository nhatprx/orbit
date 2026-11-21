import type { DocAlign, DocBlockDto, DocBlockType, DocTableDto, OfficeDocContentDto } from './officeTypes';

export interface DocHeadingItem {
  index: number;
  type: 'h1' | 'h2' | 'h3';
  text: string;
}

export interface DocStats {
  words: number;
  chars: number;
  paragraphs: number;
  tables: number;
}

export type EditableDocBlockType = Exclude<DocBlockType, 'ul' | 'ol' | 'hr'>;

export const DOC_BLOCK_CLASSES: Record<EditableDocBlockType, string> = {
  h1: 'mt-5 mb-2 text-2xl font-bold tracking-tight text-[#E6EDF3]',
  h2: 'mt-4 mb-1.5 text-xl font-semibold text-[#E6EDF3]',
  h3: 'mt-3 mb-1 text-base font-semibold uppercase tracking-wider text-[#22C55E]',
  p: 'my-2 text-sm leading-relaxed text-[#E6EDF3]',
  quote: 'my-3 border-l-2 border-[#22C55E] bg-[#0D1117]/70 py-1.5 pl-4 text-sm italic text-[#8B949E]',
  code: 'my-3 border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs text-[#22C55E] whitespace-pre-wrap',
};

export const DOC_HR_HTML = '<hr class="my-4 border-0 border-t border-[#30363D]" />';

const ALLOWED_INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'code', 'br']);
const TAG_TO_TYPE: Record<string, EditableDocBlockType> = {
  H1: 'h1', H2: 'h2', H3: 'h3', BLOCKQUOTE: 'quote', PRE: 'code', P: 'p',
};

export function sanitizeInlineHtml(raw: string | null | undefined): string {
  const source = (raw ?? '')
    .replace(/\u00a0/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const tagPattern = /<(\/?)([a-zA-Z0-9]+)(?:\s[^<>]*)?(\/?)>/g;
  let result = '', lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    result += source.slice(lastIndex, match.index).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isClosing = match[1] === '/', tag = (match[2] ?? '').toLowerCase();
    if (ALLOWED_INLINE_TAGS.has(tag)) {
      result += tag === 'br' ? (isClosing ? '' : '<br>') : isClosing ? `</${tag}>` : `<${tag}>`;
    }
    lastIndex = tagPattern.lastIndex;
  }
  return result + source.slice(lastIndex).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function stripHtmlTags(raw: string | null | undefined): string {
  return (raw ?? '')
    .replace(/\u00a0/g, ' ').replace(/&nbsp;/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

export function normalizeDocAlign(raw?: string | null): DocAlign {
  const val = (raw ?? '').trim().toLowerCase();
  return val === 'center' || val === 'right' || val === 'justify' ? val : 'left';
}

function alignAttr(align?: DocAlign): string {
  const normalized = normalizeDocAlign(align);
  return ` data-align="${normalized}" style="text-align:${normalized}"`;
}

export function buildTableHtml(rows: string[][] = [['Header 1', 'Header 2', 'Header 3'], ['', '', ''], ['', '', '']]): string {
  const safeRows = rows.length > 0 ? rows : [['', '']];
  const colCount = Math.max(1, ...safeRows.map((r) => r.length));
  const trs = safeRows.map((row, rIdx) => {
    const cellBg = rIdx === 0 ? 'bg-[#0D1117] font-semibold text-[#22C55E]' : 'bg-[#161B22] text-[#E6EDF3]';
    const cells = Array.from({ length: colCount }, (_, cIdx) =>
      `<td class="border border-[#30363D] px-3 py-2 align-top ${cellBg}">${sanitizeInlineHtml(row[cIdx] ?? '')}</td>`
    ).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table class="my-4 w-full border-collapse border border-[#30363D] text-xs"><tbody>${trs}</tbody></table>`;
}

export function docDtoToHtml(dto: OfficeDocContentDto): string {
  const blocks = dto.blocks ?? [], tables = dto.tables ?? [], parts: string[] = [];
  for (let i = 0; i < blocks.length; ) {
    const block = blocks[i];
    if (!block) { i += 1; continue; }
    if (block.type === 'hr') { parts.push(DOC_HR_HTML); i += 1; continue; }
    if (block.type === 'ul' || block.type === 'ol') {
      const listType = block.type;
      const listCls = `my-2 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1 text-sm text-[#E6EDF3]`;
      const items: string[] = [];
      while (i < blocks.length && blocks[i]?.type === listType) {
        const item = blocks[i];
        if (item) items.push(`<li${alignAttr(item.align)}>${sanitizeInlineHtml(item.text)}</li>`);
        i += 1;
      }
      parts.push(`<${listType} class="${listCls}">${items.join('')}</${listType}>`);
      continue;
    }
    const tag = block.type === 'quote' ? 'blockquote' : block.type === 'code' ? 'pre' : block.type;
    parts.push(`<${tag} class="${DOC_BLOCK_CLASSES[block.type]}"${alignAttr(block.align)}>${sanitizeInlineHtml(block.text)}</${tag}>`);
    i += 1;
  }
  for (const table of tables) if (table.rows.length > 0) parts.push(buildTableHtml(table.rows));
  if (parts.length === 0) parts.push(`<p class="${DOC_BLOCK_CLASSES.p}" data-align="left" style="text-align:left"></p>`);
  return parts.join('');
}

const readAlign = (el: HTMLElement): DocAlign => normalizeDocAlign(el.getAttribute('data-align') || el.style.textAlign);

export function htmlToDocDto(root: HTMLElement): OfficeDocContentDto {
  const blocks: DocBlockDto[] = [], tables: DocTableDto[] = [];
  const visitNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = sanitizeInlineHtml(node.textContent).trim();
      if (txt) blocks.push({ type: 'p', text: txt, align: 'left' });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement, tag = el.tagName.toUpperCase();
    if (tag === 'TABLE') {
      const rows: string[][] = [];
      el.querySelectorAll('tr').forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((c) => sanitizeInlineHtml((c as HTMLElement).innerHTML));
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length > 0) tables.push({ rows });
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const listType: DocBlockType = tag === 'OL' ? 'ol' : 'ul';
      const items = el.querySelectorAll(':scope > li');
      if (items.length === 0) blocks.push({ type: listType, text: sanitizeInlineHtml(el.innerHTML), align: readAlign(el) });
      else items.forEach((li) => blocks.push({ type: listType, text: sanitizeInlineHtml((li as HTMLElement).innerHTML), align: readAlign(li as HTMLElement) }));
      return;
    }
    if (tag === 'HR') { blocks.push({ type: 'hr', text: '', align: 'left' }); return; }
    const mapped = TAG_TO_TYPE[tag];
    if (mapped) { blocks.push({ type: mapped, text: sanitizeInlineHtml(el.innerHTML), align: readAlign(el) }); return; }
    if (el.children.length > 0 && el.querySelector('p, h1, h2, h3, blockquote, pre, ul, ol, table, hr')) {
      Array.from(el.childNodes).forEach(visitNode);
      return;
    }
    blocks.push({ type: 'p', text: sanitizeInlineHtml(el.innerHTML), align: readAlign(el) });
  };
  Array.from(root.childNodes).forEach(visitNode);
  if (blocks.length === 0 && tables.length === 0) blocks.push({ type: 'p', text: sanitizeInlineHtml(root.innerHTML), align: 'left' });
  return { blocks, tables };
}

export function computeDocStats(dto: OfficeDocContentDto): DocStats {
  const contentBlocks = dto.blocks.filter((b) => b.type !== 'hr');
  const allTexts = [
    ...contentBlocks.map((b) => stripHtmlTags(b.text)),
    ...dto.tables.flatMap((t) => t.rows.flatMap((r) => r.map((cell) => stripHtmlTags(cell)))),
  ];
  const combined = allTexts.join(' ').trim();
  const words = combined.length === 0 ? 0 : combined.split(/\s+/).filter(Boolean).length;
  const chars = allTexts.reduce((acc, s) => acc + s.length, 0);
  return { words, chars, paragraphs: contentBlocks.length, tables: dto.tables.length };
}
