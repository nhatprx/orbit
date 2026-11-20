import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type EditorKind = 'TEXT' | 'OFFICE' | 'NONE';

const OFFICE_EXTS = new Set([
  'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'odt', 'ods', 'odp',
]);

const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonc',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',
  'html', 'htm', 'css', 'scss', 'less',
  'py', 'java', 'sql', 'xml', 'svg',
  'yaml', 'yml', 'toml', 'ini', 'env', 'sh', 'bash', 'zsh',
  'log', 'conf', 'cfg', 'properties', 'gradle',
]);

const TEXT_BASENAMES = new Set([
  'dockerfile', 'makefile', 'readme', 'license', '.env', '.gitignore', '.editorconfig',
]);

const OFFICE_MIMES = new Set([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]);

const TEXT_MIMES = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/yaml',
  'application/sql',
]);

export function getFileExtension(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot === trimmed.length - 1) return '';
  return trimmed.slice(dot + 1);
}

export function classifyFileEditor(name: string, mimeType?: string | null): EditorKind {
  const ext = getFileExtension(name);
  if (OFFICE_EXTS.has(ext)) return 'OFFICE';
  if (TEXT_EXTS.has(ext)) return 'TEXT';

  const lowerName = name.trim().toLowerCase();
  if (TEXT_BASENAMES.has(lowerName)) return 'TEXT';

  const mime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (OFFICE_MIMES.has(mime)) return 'OFFICE';
  if (mime.startsWith('text/') || TEXT_MIMES.has(mime)) return 'TEXT';
  return 'NONE';
}

export function isMarkdownFile(name: string, mimeType?: string | null): boolean {
  const ext = getFileExtension(name);
  if (ext === 'md' || ext === 'markdown') return true;
  const mime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
  return mime === 'text/markdown';
}

export function getCodeMirrorLanguage(name: string): Extension[] {
  const ext = getFileExtension(name);
  switch (ext) {
    case 'md':
    case 'markdown':
      return [markdown()];
    case 'js':
    case 'mjs':
    case 'cjs':
      return [javascript()];
    case 'jsx':
      return [javascript({ jsx: true })];
    case 'ts':
      return [javascript({ typescript: true })];
    case 'tsx':
      return [javascript({ jsx: true, typescript: true })];
    case 'json':
    case 'jsonc':
      return [json()];
    case 'html':
    case 'htm':
      return [html()];
    case 'css':
    case 'scss':
    case 'less':
      return [css()];
    case 'py':
      return [python()];
    case 'java':
      return [java()];
    case 'sql':
      return [sql()];
    case 'xml':
    case 'svg':
      return [xml()];
    default:
      return [];
  }
}

export const orbitEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#0D1117',
      color: '#E6EDF3',
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      borderRadius: '0px',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    '.cm-gutters': {
      backgroundColor: '#161B22',
      color: '#7D8590',
      borderRight: '1px solid #30363D',
    },
    '.cm-activeLine': { backgroundColor: '#161B22' },
    '.cm-activeLineGutter': { backgroundColor: '#21262D', color: '#E6EDF3' },
    '.cm-cursor': { borderLeftColor: '#22C55E' },
    '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#052E16' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true }
);
