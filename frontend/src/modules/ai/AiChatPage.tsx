import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bot, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { aiChatService } from '../../services/ai.service';
import type { AiMessage, AiModelId, AiThread } from '../../types/ai.types';
import { AiThreadSidebar } from './AiThreadSidebar';

interface AiChatPageProps {
  workspaceName: string;
}

const STARTER_PROMPTS = [
  'Check ponytail compliance rules',
  'How do per-project modules work?',
  'Summarize the 10k CCU stack',
];

export function AiChatPage({ workspaceName }: AiChatPageProps) {
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [activeId, setActiveId] = useState('ai_01');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [model, setModel] = useState<AiModelId>('orbit-pro');
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async (targetId: string) => {
    const [threadList, msgList] = await Promise.all([
      aiChatService.listThreads(),
      aiChatService.listMessages(targetId),
    ]);
    setThreads(threadList);
    setMessages(msgList);
  }, []);

  useEffect(() => {
    void refresh(activeId);
  }, [activeId, refresh]);

  async function handleNewChat() {
    const created = await aiChatService.createThread(model);
    setActiveId(created.id);
    await refresh(created.id);
  }

  async function submitPrompt(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setPrompt('');
    try {
      await aiChatService.sendPrompt(activeId, text, model);
      await refresh(activeId);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submitPrompt(prompt);
  }

  const activeThread = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <AiThreadSidebar
        threads={threads}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={() => void handleNewChat()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[#E6EDF3]">
              {activeThread?.title ?? 'Orbit AI'}
            </span>
            <Badge tone="neutral">{workspaceName}</Badge>
          </div>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AiModelId)}
            className="h-7 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-xs text-[#22C55E] focus:border-[#22C55E] focus:outline-none"
          >
            <option value="orbit-pro">orbit-pro</option>
            <option value="orbit-coder">orbit-coder</option>
            <option value="orbit-fast">orbit-fast</option>
          </select>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-10">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[#7D8590]">
                Orbit AI Assistant — Suggested Prompts
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void submitPrompt(item)}
                    className="border border-[#30363D] bg-[#161B22] p-3 text-left text-xs text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`border p-3.5 ${
                  msg.role === 'assistant'
                    ? 'border-[#30363D] bg-[#161B22]'
                    : 'border-[#22C55E]/40 bg-[#052E16]/40'
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
                  <span
                    className={
                      msg.role === 'assistant' ? 'text-[#22C55E]' : 'text-[#E6EDF3]'
                    }
                  >
                    {msg.role === 'assistant' ? 'ORBIT AI' : 'YOU'}
                  </span>
                  <span className="text-[#7D8590]">{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#E6EDF3]">
                  {msg.content}
                </p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-[#30363D] bg-[#161B22] p-3"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Orbit AI about your workspace, architecture, or code..."
            className="h-9 flex-1 border border-[#30363D] bg-[#0D1117] px-3 text-[13px] text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
          />
          <Button type="submit" variant="primary" disabled={sending || !prompt.trim()}>
            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            {sending ? 'Thinking...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
