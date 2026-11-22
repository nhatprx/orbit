import type { CloudNodeDto } from '../../types/cloud.types';
import { getFileExtension } from './editor/fileEditorRegistry';

const EXT_KIND: Record<string, string> = {
  docx: 'Word Document',
  xlsx: 'Excel Spreadsheet',
  pptx: 'PowerPoint Deck',
  pdf: 'PDF Document',
  md: 'Markdown',
  markdown: 'Markdown',
  txt: 'Plain Text',
  csv: 'CSV Table',
  tsv: 'TSV Table',
  json: 'JSON',
  jsonc: 'JSON',
  ts: 'TypeScript',
  tsx: 'TypeScript JSX',
  js: 'JavaScript',
  jsx: 'JavaScript JSX',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  java: 'Java',
  py: 'Python',
  css: 'CSS',
  scss: 'SCSS',
  less: 'LESS',
  html: 'HTML',
  htm: 'HTML',
  xml: 'XML',
  sql: 'SQL',
  yml: 'YAML',
  yaml: 'YAML',
  sh: 'Shell Script',
  bash: 'Shell Script',
  zsh: 'Shell Script',
  log: 'Log File',
  png: 'PNG Image',
  jpg: 'JPEG Image',
  jpeg: 'JPEG Image',
  gif: 'GIF Image',
  webp: 'WebP Image',
  svg: 'SVG Image',
  bmp: 'BMP Image',
  ico: 'Icon Image',
  zip: 'ZIP Archive',
  tar: 'TAR Archive',
  gz: 'GZIP Archive',
  tgz: 'TAR Archive',
  '7z': '7Z Archive',
  rar: 'RAR Archive',
};

const MIME_KIND: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Deck',
  'application/pdf': 'PDF Document',
  'text/markdown': 'Markdown',
  'text/plain': 'Plain Text',
  'text/csv': 'CSV Table',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'text/html': 'HTML',
  'text/css': 'CSS',
  'application/javascript': 'JavaScript',
  'application/typescript': 'TypeScript',
  'image/png': 'PNG Image',
  'image/jpeg': 'JPEG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
  'image/svg+xml': 'SVG Image',
  'application/zip': 'ZIP Archive',
};

export function humanFileKind(node: Pick<CloudNodeDto, 'nodeType' | 'name' | 'mimeType'>): string {
  if (node.nodeType === 'FOLDER') return 'Folder';
  const ext = getFileExtension(node.name);
  if (ext && EXT_KIND[ext]) return EXT_KIND[ext];
  const baseMime = node.mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (baseMime && MIME_KIND[baseMime]) return MIME_KIND[baseMime];
  if (ext && /^[a-z0-9]{1,8}$/i.test(ext)) return `${ext.toUpperCase()} File`;
  if (baseMime.startsWith('image/')) return 'Image';
  if (baseMime.startsWith('text/')) return 'Plain Text';
  if (baseMime.startsWith('audio/')) return 'Audio File';
  if (baseMime.startsWith('video/')) return 'Video File';
  return 'Binary File';
}
