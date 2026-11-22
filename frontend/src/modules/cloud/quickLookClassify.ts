import { getFileExtension } from './editor/fileEditorRegistry';

export type QuickLookKind = 'MARKDOWN' | 'TEXT' | 'IMAGE' | 'PDF' | 'OFFICE' | 'BINARY';

const MARKDOWN_EXTS = new Set(['md', 'markdown']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const OFFICE_EXTS = new Set(['docx', 'xlsx', 'pptx']);
const TEXT_EXTS = new Set([
  'txt', 'csv', 'tsv', 'json', 'jsonc',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'java', 'py', 'css', 'scss', 'less',
  'html', 'htm', 'xml', 'sql',
  'yml', 'yaml', 'sh', 'bash', 'zsh', 'log',
  'toml', 'ini', 'env', 'conf', 'cfg', 'properties', 'gradle',
]);

const OFFICE_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

export function classifyQuickLook(name: string, mimeType?: string | null): QuickLookKind {
  const ext = getFileExtension(name);
  const mime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';

  if (MARKDOWN_EXTS.has(ext) || mime === 'text/markdown') return 'MARKDOWN';
  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) return 'IMAGE';
  if (ext === 'pdf' || mime === 'application/pdf') return 'PDF';
  if (OFFICE_EXTS.has(ext) || OFFICE_MIMES.has(mime)) return 'OFFICE';
  if (TEXT_EXTS.has(ext) || mime.startsWith('text/') || TEXT_MIMES.has(mime)) return 'TEXT';
  return 'BINARY';
}
