import { useState, type FormEvent } from 'react';
import { Bot, Brain, Globe, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AiModelId, AiScopeType } from '../../types/ai.types';
import { AiMemoryDrawer } from './AiMemoryDrawer';
import { AiMessageList } from './AiMessageList';
import { AiThreadSidebar } from './AiThreadSidebar';
import { useAiChat } from './useAiChat';

interface AiChatPageProps {
  workspaceId?: string | null;
  workspaceName: string;
  projectId?: string | null;
  projectName?: string | null;
}

const STARTER_PROMPTS = [
  'Summarize my current workspace, projects, and suggest what to do next.',
  'Search my uploaded Cloud Files and list the most recent documents.',
  'Review recent team chat messages and highlight open action items.',
  'Remember: I prefer concise engineering checklists with clear trade-offs.',
];

export function AiChatPage({ workspaceId, workspaceName, projectId, projectName }: AiChatPageProps) {
  const [showMemory, setShowMemory] = useState(false);
  const [prompt, setPrompt] = useState('');
  const chat = useAiChat(workspaceId, projectId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || chat.sending) return;
    const text = prompt;
    setPrompt('');
    void chat.sendPrompt(text);
  }

  const activeThread = chat.threads.find((t) => t.id === chat.activeId) ?? null;
  const scopeLabel =
    chat.scopeType === 'PROJECT' && projectName
      ? projectName
      : chat.scopeType === 'WORKSPACE'
        ? workspaceName
        : 'Personal';

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <AiThreadSidebar
        threads={chat.threads}
        activeId={chat.activeId}
        onSelect={chat.setActiveId}
        onNewChat={() => void chat.createNewThread()}
        onDelete={(id) => void chat.deleteThread(id)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[#E6EDF3]">
              {activeThread?.title ?? 'Orbit AI'}
            </span>
            <Badge tone="neutral">{scopeLabel}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="AI context scope"
              value={chat.scopeType}
              onChange={(e) => chat.setScopeType(e.target.value as AiScopeType)}
              className="h-7 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="USER">Personal</option>
              {workspaceId && <option value="WORKSPACE">Workspace</option>}
              {projectId && <option value="PROJECT">Project</option>}
            </select>

            <select
              aria-label="AI model tier"
              value={chat.model}
              onChange={(e) => chat.setModel(e.target.value as AiModelId)}
              className="h-7 border border-[#30363D] bg-[#0D1117] px-2 font-mono text-xs text-[#22C55E] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="orbit-pro">orbit-pro</option>
              <option value="orbit-coder">orbit-coder</option>
              <option value="orbit-fast">orbit-fast</option>
            </select>

            <button
              type="button"
              onClick={() => setShowMemory((prev) => !prev)}
              className={`inline-flex h-7 items-center gap-1.5 border px-2.5 font-mono text-[11px] transition-colors ${
                showMemory
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
              Memory ({chat.memories.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {chat.error && (
            <p role="alert" className="mb-4 border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
              {chat.error}
            </p>
          )}
          <AiMessageList
            messages={chat.messages}
            streamingText={chat.streamingText}
            liveTools={chat.liveTools}
            sending={chat.sending}
            starterPrompts={STARTER_PROMPTS}
            onStarterClick={(item) => void chat.sendPrompt(item)}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#30363D] bg-[#161B22] p-3">
          <button
            type="button"
            onClick={() => chat.setWebSearch((prev) => !prev)}
            title="Toggle external web search"
            className={`inline-flex h-9 items-center gap-1.5 border px-2.5 font-mono text-xs transition-colors ${
              chat.webSearch
                ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            Web
          </button>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Orbit AI about your workspace, files, next steps, or type 'Remember ...'"
            className="h-9 flex-1 border border-[#30363D] bg-[#0D1117] px-3 text-[13px] text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none"
          />

          <Button type="submit" variant="primary" disabled={chat.sending || !prompt.trim()}>
            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            {chat.sending ? 'Thinking...' : 'Send'}
          </Button>
        </form>
      </div>

      {showMemory && (
        <AiMemoryDrawer
          scopeType={chat.scopeType}
          memories={chat.memories}
          onAdd={chat.addMemory}
          onDelete={chat.deleteMemory}
          onClose={() => setShowMemory(false)}
        />
      )}
    </div>
  );
}
