import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const draculaChrome = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#1E1F29',
      color: '#F8F8F2',
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '12.5px',
      lineHeight: '1.6',
    },
    '.cm-scroller': {
      overflow: 'auto',
      scrollbarWidth: 'none',
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    '.cm-scroller::-webkit-scrollbar': { display: 'none' },
    '.cm-content': { padding: '12px 0' },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': {
      backgroundColor: '#191A22',
      color: '#6272A4',
      borderRight: '1px solid #343746',
      minWidth: '46px',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 8px' },
    '.cm-activeLine': { backgroundColor: '#282A36' },
    '.cm-activeLineGutter': { backgroundColor: '#282A36', color: '#F8F8F2' },
    '.cm-cursor': { borderLeftColor: '#22C55E', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#44475A' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);

const draculaHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.tagName], color: '#FF79C6' },
    { tag: [t.string, t.special(t.string), t.regexp], color: '#F1FA8C' },
    { tag: [t.number, t.bool, t.null, t.atom], color: '#BD93F9' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.attributeName], color: '#50FA7B' },
    { tag: [t.typeName, t.className, t.definition(t.typeName)], color: '#8BE9FD', fontStyle: 'italic' },
    { tag: [t.propertyName], color: '#66D9EF' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: '#6272A4', fontStyle: 'italic' },
    { tag: [t.meta, t.annotation], color: '#FFB86C' },
    { tag: [t.heading], color: '#BD93F9', fontWeight: '700' },
  ]),
);

export const draculaCodeTheme: Extension[] = [draculaChrome, draculaHighlight];
