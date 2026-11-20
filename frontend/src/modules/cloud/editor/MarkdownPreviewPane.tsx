import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface MarkdownPreviewPaneProps {
  content: string;
}

export function MarkdownPreviewPane({ content }: MarkdownPreviewPaneProps) {
  const sanitizedHtml = useMemo(() => {
    const parsed = marked.parse(content, { async: false });
    const rawHtml = typeof parsed === 'string' ? parsed : '';
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  return (
    <div
      data-testid="markdown-preview"
      className="h-full overflow-auto border-l border-[#30363D] bg-[#0D1117] p-6 text-sm leading-relaxed text-[#E6EDF3]"
    >
      <div className="mb-3 border-b border-[#21262D] pb-2 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
        Live Markdown Preview
      </div>
      <div
        className="space-y-3 [&_a]:text-[#22C55E] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#22C55E] [&_blockquote]:bg-[#161B22] [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-[#8B949E] [&_code]:border [&_code]:border-[#30363D] [&_code]:bg-[#161B22] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#22C55E] [&_h1]:border-b [&_h1]:border-[#30363D] [&_h1]:pb-1.5 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_hr]:border-[#30363D] [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#30363D] [&_pre]:bg-[#161B22] [&_pre]:p-3 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#30363D] [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#30363D] [&_th]:bg-[#161B22] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
