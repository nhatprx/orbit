import {
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
} from 'lucide-react';
import type { CloudNodeDto } from '../../types/cloud.types';
import { getFileExtension } from './editor/fileEditorRegistry';

const CODE_EXTS = new Set([
  'md', 'markdown', 'json', 'jsonc', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'java', 'sql', 'html', 'htm', 'css', 'scss', 'xml', 'yaml', 'yml', 'sh',
]);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', 'tgz', '7z', 'rar']);

interface CloudNodeIconProps {
  node: CloudNodeDto;
  className?: string;
}

export function CloudNodeIcon({ node, className = 'h-4 w-4 shrink-0' }: CloudNodeIconProps) {
  if (node.nodeType === 'FOLDER') {
    return <Folder className={`${className} text-[#22C55E]`} strokeWidth={1.5} />;
  }
  const ext = getFileExtension(node.name);
  if (ext === 'docx') {
    return <FileText className={`${className} text-[#22C55E]`} strokeWidth={1.5} />;
  }
  if (ext === 'xlsx' || ext === 'csv') {
    return <FileSpreadsheet className={`${className} text-[#22C55E]`} strokeWidth={1.5} />;
  }
  if (ext === 'pptx') {
    return <Presentation className={`${className} text-[#22C55E]`} strokeWidth={1.5} />;
  }
  if (ext === 'pdf' || node.mimeType === 'application/pdf') {
    return <FileText className={`${className} text-[#E6EDF3]`} strokeWidth={1.5} />;
  }
  if (CODE_EXTS.has(ext)) {
    return <FileCode2 className={`${className} text-[#22C55E]`} strokeWidth={1.5} />;
  }
  if (IMAGE_EXTS.has(ext) || node.mimeType?.startsWith('image/')) {
    return <FileImage className={`${className} text-[#8B949E]`} strokeWidth={1.5} />;
  }
  if (ARCHIVE_EXTS.has(ext)) {
    return <FileArchive className={`${className} text-[#8B949E]`} strokeWidth={1.5} />;
  }
  return <File className={`${className} text-[#8B949E]`} strokeWidth={1.5} />;
}
