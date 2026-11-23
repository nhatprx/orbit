import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const MD_CLASSES =
  'space-y-2.5 text-[13px] leading-relaxed text-[#E6EDF3] [&_a]:text-[#22C55E] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#22C55E] [&_blockquote]:bg-[#0D1117] [&_blockquote]:px-3 [&_blockquote]:py-1.5 [&_blockquote]:text-[#8B949E] [&_code]:border [&_code]:border-[#30363D] [&_code]:bg-[#0D1117] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#22C55E] [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-[13px] [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:no-scrollbar [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#30363D] [&_pre]:bg-[#0D1117] [&_pre]:p-3 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-[#E6EDF3] [&_ul]:list-disc';

export function AiMarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    const parsed = marked.parse(content, { async: false });
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [content]);

  return <div className={MD_CLASSES} dangerouslySetInnerHTML={{ __html: html }} />;
}
