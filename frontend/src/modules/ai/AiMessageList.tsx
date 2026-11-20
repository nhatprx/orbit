import { ExternalLink, FileText, Loader2, Wrench } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AiMessage, AiToolTrace } from '../../types/ai.types';
import { formatDate } from '../../utils/format';

interface AiMessageListProps {
  messages: AiMessage[];
  streamingText: string;
  liveTools: AiToolTrace[];
  sending: boolean;
  starterPrompts: string[];
  onStarterClick: (prompt: string) => void;
}

export function AiMessageList({
  messages,
  streamingText,
  liveTools,
  sending,
  starterPrompts,
  onStarterClick,
}: AiMessageListProps) {
  if (messages.length === 0 && !sending) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[#7D8590]">
          Orbit AI Workspace Agent — Suggested Prompts
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {starterPrompts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStarterClick(item)}
              className="border border-[#30363D] bg-[#161B22] p-3 text-left text-xs text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`border p-3.5 ${
            msg.role === 'assistant'
              ? 'border-[#30363D] bg-[#161B22]'
              : 'border-[#22C55E]/40 bg-[#052E16]/40'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className={msg.role === 'assistant' ? 'text-[#22C55E]' : 'text-[#E6EDF3]'}>
                {msg.role === 'assistant' ? 'ORBIT AI' : 'YOU'}
              </span>
              {msg.providerUsed && <Badge tone="neutral">{msg.providerUsed}</Badge>}
            </div>
            <span className="text-[#7D8590]">{formatDate(msg.timestamp)}</span>
          </div>

          {msg.toolTraces.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {msg.toolTraces.map((trace, idx) => (
                <span
                  key={`${trace.tool}-${idx}`}
                  className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]"
                >
                  <Wrench className="h-2.5 w-2.5 text-[#22C55E]" strokeWidth={1.5} />
                  {trace.tool}: {trace.summary}
                </span>
              ))}
            </div>
          )}

          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#E6EDF3]">
            {msg.content}
          </p>

          {msg.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#30363D] pt-2.5">
              {msg.citations.map((c, idx) =>
                c.type === 'web' ? (
                  <a
                    key={`${c.ref}-${idx}`}
                    href={c.ref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 text-[11px] text-[#22C55E] hover:border-[#22C55E]"
                  >
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    {c.label}
                  </a>
                ) : (
                  <span
                    key={`${c.ref}-${idx}`}
                    className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#BDBDBD]"
                  >
                    <FileText className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
                    {c.label}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {sending && (
        <div className="border border-[#22C55E]/50 bg-[#161B22] p-3.5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-[#22C55E]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            <span>ORBIT AI THINKING</span>
          </div>
          {liveTools.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {liveTools.map((trace, idx) => (
                <span
                  key={`${trace.tool}-${idx}`}
                  className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]"
                >
                  <Wrench className="h-2.5 w-2.5 text-[#22C55E]" strokeWidth={1.5} />
                  {trace.tool}: {trace.summary}
                </span>
              ))}
            </div>
          )}
          {streamingText && (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#E6EDF3]">
              {streamingText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
