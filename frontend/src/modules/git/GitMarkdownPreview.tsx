import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface GitMarkdownPreviewProps {
  content: string;
}

export function GitMarkdownPreview({ content }: GitMarkdownPreviewProps) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { async: false, gfm: true, breaks: true });
    return DOMPurify.sanitize(typeof raw === 'string' ? raw : '');
  }, [content]);

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0D1117] px-6 py-5">
      <article
        className="mx-auto max-w-4xl text-sm leading-relaxed text-[#E6EDF3] [&_a]:text-[#4ADE80] [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[#22C55E] [&_blockquote]:bg-[#161B22] [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-[#BDBDBD] [&_code]:bg-[#1E1F29] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#F1FA8C] [&_h1]:mb-3 [&_h1]:border-b [&_h1]:border-[#30363D] [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2.5 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-[#30363D] [&_h2]:pb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-[#30363D] [&_li]:my-1 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2.5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#343746] [&_pre]:bg-[#1E1F29] [&_pre]:p-3.5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#F8F8F2] [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#30363D] [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#30363D] [&_th]:bg-[#161B22] [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-xs [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
