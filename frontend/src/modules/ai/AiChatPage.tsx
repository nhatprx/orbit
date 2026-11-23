import { useMemo, useState, type FormEvent } from 'react';
import { Globe, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorView } from '../../components/ui/StateViews';
import { authService } from '../../services/auth.service';
import { AiMemoryDrawer } from './AiMemoryDrawer';
import { AiMessageList } from './AiMessageList';
import { AiThreadHeader } from './AiThreadHeader';
import { AiThreadSidebar } from './AiThreadSidebar';
import { AiUsageDrawer } from './AiUsageDrawer';
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
  const [showUsage, setShowUsage] = useState(false);
  const [prompt, setPrompt] = useState('');
  const chat = useAiChat(workspaceId, projectId);
  const currentUser = useMemo(() => authService.getSession()?.user ?? null, []);

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
        currentUser={currentUser}
        onSelect={chat.setActiveId}
        onNewChat={() => void chat.createNewThread()}
        onDelete={(id) => void chat.deleteThread(id)}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
        <AiThreadHeader
          title={activeThread?.title ?? 'Orbit AI'}
          scopeLabel={scopeLabel}
          scopeType={chat.scopeType}
          model={chat.model}
          workspaceId={workspaceId}
          projectId={projectId}
          usage={chat.usage}
          memoryCount={chat.memories.length}
          showUsage={showUsage}
          showMemory={showMemory}
          onChangeScope={chat.setScopeType}
          onChangeModel={chat.setModel}
          onToggleUsage={() => {
            setShowUsage((prev) => !prev);
            setShowMemory(false);
          }}
          onToggleMemory={() => {
            setShowMemory((prev) => !prev);
            setShowUsage(false);
          }}
        />

        {chat.error && (
          <div className="p-3 pb-0">
            <ErrorView message={chat.error} />
          </div>
        )}

        <AiMessageList
          messages={chat.messages}
          streamingText={chat.streamingText}
          liveTools={chat.liveTools}
          sending={chat.sending}
          starterPrompts={STARTER_PROMPTS}
          onStarterClick={(item) => void chat.sendPrompt(item)}
        />

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#30363D] bg-[#161B22] p-3">
          <button
            type="button"
            onClick={() => chat.setWebSearch((prev) => !prev)}
            title="Toggle external web search"
            aria-label="Toggle external web search"
            className={`flex h-10 shrink-0 items-center gap-1.5 border px-2.5 font-mono text-xs transition-colors ${
              chat.webSearch
                ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
            }`}
          >
            <Globe className="h-4 w-4" strokeWidth={1.5} />
            Web
          </button>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Message Orbit AI..."
            className="h-10 min-w-0 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />

          <Button type="submit" variant="primary" disabled={chat.sending || !prompt.trim()} className="h-10">
            <Send className="h-4 w-4" strokeWidth={1.5} />
            {chat.sending ? 'Thinking...' : 'Send'}
          </Button>
        </form>
      </div>

      {showUsage && (
        <AiUsageDrawer
          usage={chat.usage}
          loading={chat.sending}
          onSavePersonalKey={chat.savePersonalKey}
          onClearPersonalKey={chat.clearPersonalKey}
          onClose={() => setShowUsage(false)}
        />
      )}

      {showMemory && (
        <AiMemoryDrawer
          scopeType={chat.scopeType}
          memories={chat.memories}
          indexedFiles={chat.indexedFiles}
          onAdd={chat.addMemory}
          onDelete={chat.deleteMemory}
          onReindexFile={chat.reindexFile}
          onClose={() => setShowMemory(false)}
        />
      )}
    </div>
  );
}
