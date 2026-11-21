import { useEffect, useMemo, useRef, useState } from 'react';
import { OrbitDocOutline, OrbitDocRuler, mutateDocTable } from './OrbitDocOutline';
import { OrbitDocToolbar, inspectDocCursor, type DocActiveFormatState } from './OrbitDocToolbar';
import {
  DOC_BLOCK_CLASSES, buildTableHtml, computeDocStats, docDtoToHtml, htmlToDocDto, stripHtmlTags, type DocHeadingItem,
} from './docHtmlCodec';
import type { DocAlign, DocBlockType, OfficeDocContentDto } from './officeTypes';

export interface OrbitDocEditorProps {
  value: OfficeDocContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeDocContentDto) => void;
}

const TAG_FOR_BLOCK: Record<Exclude<DocBlockType, 'ul' | 'ol'>, string> = { p: 'p', h1: 'h1', h2: 'h2', h3: 'h3', quote: 'blockquote', code: 'pre' };

export function OrbitDocEditor({ value, readOnly = false, onChange }: OrbitDocEditorProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<OfficeDocContentDto | null>(null);
  const activeNodeRef = useRef<Node | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [blockType, setBlockType] = useState<Exclude<DocBlockType, 'ul' | 'ol'>>('p');
  const [fontFamily, setFontFamily] = useState('Outfit');
  const [fontSize, setFontSize] = useState('11pt');
  const [zoom, setZoom] = useState(100);
  const [activeFormats, setActiveFormats] = useState<DocActiveFormatState>({
    bold: false, italic: false, underline: false, strike: false, align: 'left', insideTable: false,
  });

  useEffect(() => {
    const el = pageRef.current;
    if (!el || value === lastEmittedRef.current) return;
    el.innerHTML = docDtoToHtml(value);
  }, [value]);

  const headings = useMemo<DocHeadingItem[]>(() =>
    value.blocks.flatMap((b, index) => (b.type === 'h1' || b.type === 'h2' || b.type === 'h3' ? [{ index, type: b.type, text: stripHtmlTags(b.text) }] : [])),
  [value.blocks]);
  const stats = useMemo(() => computeDocStats(value), [value]);

  const syncFromDom = () => {
    const el = pageRef.current;
    if (!el || readOnly) return;
    const next = htmlToDocDto(el);
    lastEmittedRef.current = next;
    onChange(next);
  };

  const getCursorNode = (): Node | null => {
    const root = pageRef.current, sel = window.getSelection?.();
    if (root && sel && sel.rangeCount > 0 && sel.anchorNode && root.contains(sel.anchorNode) && sel.anchorNode !== root) return sel.anchorNode;
    return activeNodeRef.current;
  };

  const getActiveBlockElement = (): HTMLElement | null => {
    const root = pageRef.current;
    if (!root) return null;
    let node = getCursorNode();
    while (node && node !== root && node.parentNode !== root) node = node.parentNode;
    return (node && node.parentNode === root && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : (root.firstElementChild as HTMLElement | null)) ?? null;
  };

  const inspectCursorState = (hint?: Node | null) => {
    const root = pageRef.current;
    if (!root) return;
    if (hint && hint !== root && root.contains(hint)) activeNodeRef.current = hint;
    const res = inspectDocCursor(root, getCursorNode());
    activeTableRef.current = res.table;
    if (res.blockType) setBlockType(res.blockType);
    setActiveFormats(res.formats);
  };

  const execNative = (cmd: string, arg?: string) => {
    if (readOnly) return;
    pageRef.current?.focus();
    if (typeof document.execCommand === 'function') { try { document.execCommand(cmd, false, arg); } catch { /* fallback */ } }
    if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline' || cmd === 'strikeThrough') {
      const key = cmd === 'strikeThrough' ? 'strike' : cmd;
      setActiveFormats((prev) => ({ ...prev, [key]: !prev[key] }));
    }
    syncFromDom();
  };

  const handleBlockTypeChange = (nextType: Exclude<DocBlockType, 'ul' | 'ol'>) => {
    setBlockType(nextType);
    const root = pageRef.current, target = getActiveBlockElement();
    if (!root || readOnly) return;
    const rep = document.createElement(TAG_FOR_BLOCK[nextType]);
    rep.className = DOC_BLOCK_CLASSES[nextType];
    const align = (target && target.tagName.toUpperCase() !== 'TABLE' && (target.getAttribute('data-align') || target.style.textAlign)) || 'left';
    rep.setAttribute('data-align', align);
    rep.style.textAlign = align;
    if (target && target.tagName.toUpperCase() !== 'TABLE') { rep.innerHTML = target.innerHTML; root.replaceChild(rep, target); } else root.appendChild(rep);
    activeNodeRef.current = rep;
    syncFromDom();
  };

  const handleAlignChange = (align: DocAlign | 'justify') => {
    const target = getActiveBlockElement();
    if (target) { target.setAttribute('data-align', align === 'center' || align === 'right' ? align : 'left'); target.style.textAlign = align; }
    setActiveFormats((prev) => ({ ...prev, align }));
    syncFromDom();
  };

  const handleToggleList = (listType: 'ul' | 'ol') => {
    const root = pageRef.current, target = getActiveBlockElement();
    if (!root || readOnly) return;
    if (target && target.tagName.toLowerCase() === listType) {
      const p = document.createElement('p');
      p.className = DOC_BLOCK_CLASSES.p;
      p.innerHTML = target.querySelector('li')?.innerHTML ?? target.innerHTML;
      root.replaceChild(p, target);
      activeNodeRef.current = p;
    } else {
      const list = document.createElement(listType), li = document.createElement('li');
      list.className = `my-2 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1 text-sm text-[#E6EDF3]`;
      li.innerHTML = target?.innerHTML ?? '';
      list.appendChild(li);
      if (target) root.replaceChild(list, target); else root.appendChild(list);
      activeNodeRef.current = li;
    }
    syncFromDom();
  };

  const handleInsertHtmlBlock = (html: string, activateTable = false) => {
    const root = pageRef.current;
    if (!root || readOnly) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const inserted = wrapper.firstElementChild as HTMLElement | null;
    if (!inserted) return;
    const target = getActiveBlockElement();
    if (target && target.parentNode === root) root.insertBefore(inserted, target.nextSibling); else root.appendChild(inserted);
    if (activateTable && inserted.tagName.toUpperCase() === 'TABLE') {
      activeTableRef.current = inserted as HTMLTableElement;
      activeNodeRef.current = inserted.querySelector('td') ?? inserted;
      setActiveFormats((prev) => ({ ...prev, insideTable: true }));
    }
    syncFromDom();
  };

  const handleTableAction = (action: 'row' | 'col' | 'delete') => {
    const root = pageRef.current;
    const table = activeTableRef.current && root?.contains(activeTableRef.current) ? activeTableRef.current : (root?.querySelector('table') as HTMLTableElement | null);
    if (!root || !table || readOnly) return;
    const stillExists = mutateDocTable(table, action);
    if (!stillExists) {
      activeTableRef.current = null;
      activeNodeRef.current = root.firstElementChild;
      setActiveFormats((prev) => ({ ...prev, insideTable: false }));
    }
    syncFromDom();
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      {!readOnly && (
        <OrbitDocToolbar
          blockType={blockType} fontFamily={fontFamily} fontSize={fontSize} zoom={zoom} activeFormats={activeFormats}
          onUndo={() => execNative('undo')} onRedo={() => execNative('redo')} onBlockTypeChange={handleBlockTypeChange}
          onFontFamilyChange={(fam) => { setFontFamily(fam); execNative('fontName', fam); }} onFontSizeChange={setFontSize}
          onInlineCommand={(cmd) => execNative(cmd)} onAlignChange={handleAlignChange} onToggleList={handleToggleList}
          onInsertTable={() => handleInsertHtmlBlock(buildTableHtml(), true)} onAddTableRow={() => handleTableAction('row')}
          onAddTableCol={() => handleTableAction('col')} onDeleteTable={() => handleTableAction('delete')}
          onInsertHorizontalRule={() => handleInsertHtmlBlock('<hr class="my-4 border-0 border-t border-[#30363D]" />')}
          onClearFormatting={() => execNative('removeFormat')} onZoomChange={setZoom}
        />
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <OrbitDocOutline
          headings={headings} open={outlineOpen} onToggle={() => setOutlineOpen((prev) => !prev)}
          onSelectHeading={(ord) => (pageRef.current?.querySelectorAll('h1, h2, h3')[ord] as HTMLElement | undefined)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0D1117]">
          <OrbitDocRuler />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div
              ref={pageRef} role="textbox" aria-multiline="true" aria-label="Document canvas"
              contentEditable={!readOnly} suppressContentEditableWarning onInput={syncFromDom}
              onKeyUp={(e) => inspectCursorState(e.target as Node)} onMouseUp={(e) => inspectCursorState(e.target as Node)}
              style={{ fontFamily, fontSize, zoom: `${zoom}%` }}
              className="mx-auto min-h-[880px] max-w-[800px] rounded-none border border-[#30363D] bg-[#161B22] px-14 py-12 text-[#E6EDF3] shadow-2xl focus:border-[#22C55E]/70 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-[#30363D] bg-[#161B22] px-4 py-1.5 font-mono text-[11px] text-[#8B949E]">
        <div className="flex items-center gap-4">
          <span>Words: {stats.words}</span><span>Characters: {stats.chars}</span><span>Paragraphs: {stats.paragraphs}</span><span>Tables: {stats.tables}</span>
        </div>
        <span>Zoom: {zoom}%</span>
      </footer>
    </div>
  );
}
