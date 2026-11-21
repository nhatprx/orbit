import { DOC_BLOCK_CLASSES, normalizeDocAlign, type EditableDocBlockType } from './docHtmlCodec';
import type { DocAlign } from './officeTypes';

const TAG_FOR_BLOCK: Record<EditableDocBlockType, string> = {
  p: 'p', h1: 'h1', h2: 'h2', h3: 'h3', quote: 'blockquote', code: 'pre',
};

export function resolveCursorNode(root: HTMLElement | null, fallback: Node | null): Node | null {
  const sel = window.getSelection?.();
  if (root && sel && sel.rangeCount > 0 && sel.anchorNode && root.contains(sel.anchorNode) && sel.anchorNode !== root) {
    return sel.anchorNode;
  }
  return fallback;
}

export function resolveActiveBlock(root: HTMLElement | null, cursorNode: Node | null): HTMLElement | null {
  if (!root) return null;
  let node = cursorNode;
  while (node && node !== root && node.parentNode !== root) node = node.parentNode;
  if (node && node.parentNode === root && node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement;
  return (root.firstElementChild as HTMLElement | null) ?? null;
}

export function replaceBlockTypeInDom(
  root: HTMLElement, target: HTMLElement | null, nextType: EditableDocBlockType
): HTMLElement {
  const rep = document.createElement(TAG_FOR_BLOCK[nextType]);
  rep.className = DOC_BLOCK_CLASSES[nextType];
  const isReplaceable = Boolean(target && target.tagName.toUpperCase() !== 'TABLE' && target.tagName.toUpperCase() !== 'HR');
  const align: DocAlign = normalizeDocAlign(
    isReplaceable ? target?.getAttribute('data-align') || target?.style.textAlign : 'left'
  );
  rep.setAttribute('data-align', align);
  rep.style.textAlign = align;
  if (isReplaceable && target) {
    rep.innerHTML = target.innerHTML;
    root.replaceChild(rep, target);
  } else {
    root.appendChild(rep);
  }
  return rep;
}

export function toggleListInDom(root: HTMLElement, target: HTMLElement | null, listType: 'ul' | 'ol'): HTMLElement {
  if (target && target.tagName.toLowerCase() === listType) {
    const p = document.createElement('p');
    p.className = DOC_BLOCK_CLASSES.p;
    p.innerHTML = target.querySelector('li')?.innerHTML ?? target.innerHTML;
    root.replaceChild(p, target);
    return p;
  }
  const list = document.createElement(listType);
  const li = document.createElement('li');
  list.className = `my-2 ${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1 text-sm text-[#E6EDF3]`;
  li.innerHTML = target?.innerHTML ?? '';
  list.appendChild(li);
  if (target) root.replaceChild(list, target);
  else root.appendChild(list);
  return li;
}

export function insertHtmlBlockInDom(root: HTMLElement, target: HTMLElement | null, html: string): HTMLElement | null {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const inserted = wrapper.firstElementChild as HTMLElement | null;
  if (!inserted) return null;
  if (target && target.parentNode === root) root.insertBefore(inserted, target.nextSibling);
  else root.appendChild(inserted);
  return inserted;
}
