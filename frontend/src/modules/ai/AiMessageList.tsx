import { useEffect, useRef } from 'react';
import { Bot, ExternalLink, FileText, Loader2, Wrench } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AiMessage, AiToolTrace } from '../../types/ai.types';
import { formatTime } from '../../utils/format';
import { AiMarkdownContent } from './AiMarkdownContent';

interface AiMessageListProps {
  messages: AiMessage[];
  streamingText: string;
  liveTools: AiToolTrace[];
  sending: boolean;
  starterPrompts: string[];
  onStarterClick: (prompt: string) => void;
}

function ToolTraceList({ traces }: { traces: AiToolTrace[] }) {
  if (traces.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {traces.map((trace, idx) => (
        <span
          key={`${trace.tool}-${idx}`}
          className="inline-flex items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]"
        >
          <Wrench className="h-2.5 w-2.5 text-[#22C55E]" strokeWidth={1.5} />
          {trace.tool}: {trace.summary}
        </span>
      ))}
    </div>
  );
}

export function AiMessageList({
  messages,
  streamingText,
  liveTools,
  sending,
  starterPrompts,
  onStarterClick,
}: AiMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingText, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl border border-[#30363D] bg-[#161B22] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#22C55E]">
              <Bot className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E6EDF3]">Orbit AI Workspace Agent</h3>
              <p className="text-xs text-[#8B949E]">
                Ask about your workspace, files, team chat, or choose a suggested prompt below.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {starterPrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onStarterClick(item)}
                className="border border-[#30363D] bg-[#0D1117] p-3 text-left text-xs leading-relaxed text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#4ADE80]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {messages.map((msg) => {
        const mine = msg.role === 'user';
        const bubbleClass = mine
          ? 'border border-[#1E5631] bg-[#0B2918] px-3.5 py-2 text-[#E6EDF3]'
          : 'border border-[#2D333B] bg-[#161B22] px-3.5 py-2 text-[#E6EDF3]';

        return (
          <div
            key={msg.id}
            className={`mt-3.5 flex items-start gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}
          >
            {!mine && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#22C55E]">
                <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
            )}

            <div className={`flex min-w-0 max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`w-fit max-w-full ${bubbleClass}`}>
                {!mine && (
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold leading-tight text-[#4ADE80]">Orbit AI</span>
                    {msg.providerUsed && <Badge tone="neutral">{msg.providerUsed}</Badge>}
                    {typeof msg.costUsd === 'number' && msg.costUsd > 0 && (
                      <span className="font-mono text-[10px] text-[#22C55E]">${msg.costUsd.toFixed(5)}</span>
                    )}
                  </div>
                )}

                <ToolTraceList traces={msg.toolTraces} />

                {mine ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#E6EDF3]">
                    {msg.content}
                  </p>
                ) : (
                  <AiMarkdownContent content={msg.content} />
                )}

                {msg.citations.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#30363D] pt-2">
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

              <time dateTime={msg.timestamp} className="mt-1 font-mono text-[10px] text-[#7D8590]">
                {formatTime(msg.timestamp)}
              </time>
            </div>
          </div>
        );
      })}

      {sending && (
        <div className="mt-3.5 flex items-start gap-2.5 justify-start">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#22C55E]">
            <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
          </div>
          <div className="max-w-[78%] border border-[#22C55E]/50 bg-[#161B22] px-3.5 py-2.5">
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] text-[#4ADE80]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              <span>Orbit AI is thinking...</span>
            </div>
            <ToolTraceList traces={liveTools} />
            {streamingText && <AiMarkdownContent content={streamingText} />}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
