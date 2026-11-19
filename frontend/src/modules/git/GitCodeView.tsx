import { useState } from 'react';
import { Check, Copy, FileCode, Folder } from 'lucide-react';
import type { GitFileEntry } from '../../types/git.types';

interface GitCodeViewProps {
  files: GitFileEntry[];
}

export function GitCodeView({ files }: GitCodeViewProps) {
  const [selectedPath, setSelectedPath] = useState<string>(files[0]?.path ?? '');
  const [copied, setCopied] = useState(false);

  const selectedFile =
    files.find((f) => f.path === selectedPath) ?? files[0] ?? null;

  async function handleCopy() {
    if (!selectedFile?.content) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="border border-[#30363D] bg-[#161B22] lg:col-span-5">
        <div className="border-b border-[#30363D] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#BDBDBD]">
          Files ({files.length})
        </div>
        <div>
          {files.map((file, idx) => {
            const active = file.path === selectedFile?.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  idx > 0 ? 'border-t border-[#30363D]' : ''
                } ${
                  active
                    ? 'border-l-2 border-l-[#22C55E] bg-[#21262D] text-[#E6EDF3]'
                    : 'text-[#BDBDBD] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {file.type === 'dir' ? (
                    <Folder className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                  ) : (
                    <FileCode className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                  )}
                  <span className="truncate font-mono text-xs">{file.name}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[#8A8A8A]">
                  {file.updatedAt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-[#30363D] bg-[#161B22] lg:col-span-7">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#E6EDF3]">
                  {selectedFile.path}
                </span>
                {selectedFile.language && (
                  <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#8A8A8A]">
                    {selectedFile.language}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1.5 border border-[#3B434B] bg-[#0D1117] px-2.5 py-1 text-xs text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#22C55E]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto bg-[#0D1117] p-4 font-mono text-xs leading-relaxed text-[#E6EDF3]">
              {(selectedFile.content ?? '').split('\n').map((line, i) => (
                <div key={i} className="flex gap-4">
                  <span className="w-6 select-none text-right text-[#8A8A8A]">
                    {i + 1}
                  </span>
                  <span>{line || ' '}</span>
                </div>
              ))}
            </pre>
          </>
        ) : (
          <div className="p-6 text-sm text-[#8A8A8A]">Select a file to inspect.</div>
        )}
      </div>
    </div>
  );
}
