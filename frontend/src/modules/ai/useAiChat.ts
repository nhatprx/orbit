import { useCallback, useEffect, useState } from 'react';
import { aiChatService } from '../../services/ai.service';
import type { AiMemory, AiMessage, AiModelId, AiScopeType, AiThread, AiToolTrace } from '../../types/ai.types';

export function useAiChat(workspaceId?: string | null, projectId?: string | null) {
  const [scopeType, setScopeType] = useState<AiScopeType>(
    projectId ? 'PROJECT' : workspaceId ? 'WORKSPACE' : 'USER'
  );
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [model, setModel] = useState<AiModelId>('orbit-pro');
  const [webSearch, setWebSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveTools, setLiveTools] = useState<AiToolTrace[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const list = await aiChatService.listThreads();
    setThreads(list);
    setActiveId((prev) => prev ?? (list[0]?.id ?? null));
  }, []);

  const loadMemories = useCallback(async () => {
    const list = await aiChatService.listMemories(scopeType, workspaceId, projectId);
    setMemories(list);
  }, [scopeType, workspaceId, projectId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void aiChatService.listMessages(activeId).then(setMessages);
  }, [activeId]);

  async function createNewThread() {
    const created = await aiChatService.createThread({ scopeType, workspaceId, projectId, model });
    setThreads((prev) => [created, ...prev]);
    setActiveId(created.id);
    setMessages([]);
    return created.id;
  }

  async function deleteThread(id: string) {
    await aiChatService.deleteThread(id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function sendPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setStreamingText('');
    setLiveTools([]);
    try {
      const threadId = activeId ?? (await createNewThread());
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          threadId,
          role: 'user',
          content: trimmed,
          toolTraces: [],
          citations: [],
          timestamp: new Date().toISOString(),
        },
      ]);
      await aiChatService.streamPrompt(
        threadId,
        { prompt: trimmed, model, webSearch },
        {
          onToken: (delta) => setStreamingText((prev) => prev + delta),
          onTool: (trace) => setLiveTools((prev) => [...prev.filter((t) => t.tool !== trace.tool), trace]),
          onDone: (saved) => {
            setMessages((prev) => [...prev, saved]);
            setStreamingText('');
            setLiveTools([]);
            void loadThreads();
            void loadMemories();
          },
          onError: (msg) => setError(msg),
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send prompt.');
    } finally {
      setSending(false);
    }
  }

  async function addMemory(category: 'FACT' | 'DECISION' | 'PREFERENCE', content: string) {
    await aiChatService.createMemory({ scopeType, workspaceId, projectId, category, content });
    await loadMemories();
  }

  async function deleteMemory(id: string) {
    await aiChatService.deleteMemory(id);
    await loadMemories();
  }

  return {
    scopeType, setScopeType,
    threads, activeId, setActiveId,
    messages, memories,
    model, setModel,
    webSearch, setWebSearch,
    sending, streamingText, liveTools, error,
    createNewThread, deleteThread, sendPrompt, addMemory, deleteMemory,
  };
}
