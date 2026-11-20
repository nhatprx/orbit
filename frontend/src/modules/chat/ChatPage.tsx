import { useMemo, useState } from 'react';
import { Hash } from 'lucide-react';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import { authService } from '../../services/auth.service';
import { chatService } from '../../services/workspace/services';
import type { ConnectionState } from '../../services/workspace/stomp/StompConnection';
import type { ChatChannelDto, ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useChatChannel } from './useChatChannel';
import { useChatConnection } from './useChatConnection';

const STATE_LABEL: Record<ConnectionState, { text: string; color: string }> = {
  connected: { text: 'Live', color: 'bg-[#22C55E]' },
  connecting: { text: 'Connecting', color: 'bg-[#EAB308]' },
  reconnecting: { text: 'Reconnecting', color: 'bg-[#EAB308]' },
  idle: { text: 'Offline', color: 'bg-[#7D8590]' },
};

function Thread({ channel, scopeLabel }: { channel: ChatChannelDto; scopeLabel: string }) {
  const chat = useChatChannel(channel.id);
  const connection = useChatConnection();
  const currentUserId = useMemo(() => authService.getSession()?.user.id ?? null, []);
  const state = STATE_LABEL[connection];

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-[#E6EDF3]">
            <Hash className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            <span className="truncate">{channel.name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#8A8A8A]">
            {scopeLabel} - {channel.description}
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-xs text-[#8B949E]" role="status">
          <span className={`h-1.5 w-1.5 ${state.color}`} />
          {state.text}
        </span>
      </div>

      {chat.error && (
        <div className="p-3">
          <ErrorView message={chat.error} />
        </div>
      )}
      {chat.loading ? (
        <LoadingView label="Loading messages..." />
      ) : (
        <ChatMessageList
          messages={chat.messages}
          currentUserId={currentUserId}
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
        />
      )}
      <ChatComposer placeholder={`Message #${channel.name}`} onSend={chat.send} />
    </div>
  );
}

interface ChatPageProps {
  workspace: WorkspaceDto;
  project: ProjectDto | null;
}

/** Workspace chat, or project chat when a project is selected (D-15). One default channel per scope. */
export function ChatPage({ workspace, project }: ChatPageProps) {
  const channels = useResource(
    () =>
      project
        ? chatService.listProjectChannels(workspace.id, project.id)
        : chatService.listWorkspaceChannels(workspace.id),
    [workspace.id, project?.id]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const list = channels.data ?? [];
  const channel = list.find((c) => c.id === selected) ?? list[0] ?? null;

  if (channels.loading && !channels.data) return <LoadingView label="Loading channels..." />;
  if (channels.error) return <div className="p-4"><ErrorView message={channels.error} onRetry={channels.reload} /></div>;
  if (!channel) return <EmptyView title="No channels" description="This scope has no chat channel yet." />;

  const scopeLabel = project ? project.name : workspace.name;

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      {list.length > 1 && (
        <nav aria-label="Channels" className="w-52 shrink-0 space-y-1 border-r border-[#30363D] bg-[#161B22] p-3">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`flex w-full items-center gap-2 border px-3 py-2 text-sm ${
                c.id === channel.id
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:bg-[#21262D]'
              }`}
            >
              <Hash className="h-3.5 w-3.5" strokeWidth={1.5} />
              {c.name}
            </button>
          ))}
        </nav>
      )}
      <Thread key={channel.id} channel={channel} scopeLabel={scopeLabel} />
    </div>
  );
}
