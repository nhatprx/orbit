import { useCallback, useEffect, useState } from 'react';
import { aiChatService } from '../../services/ai.service';
import { aiOpenRouterService } from '../../services/aiOpenRouter.service';
import type { AiDocumentIndex, AiMemory, AiMessage, AiModelId, AiScopeType, AiThread, AiToolTrace, AiUsageSummary } from '../../types/ai.types';

export function useAiChat(workspaceId?: string | null, projectId?: string | null) {
  const [scopeType, setScopeType] = useState<AiScopeType>(
    projectId ? 'PROJECT' : workspaceId ? 'WORKSPACE' : 'USER'
  );
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [indexedFiles, setIndexedFiles] = useState<AiDocumentIndex[]>([]);
  const [model, setModel] = useState<AiModelId>('orbit-pro');
  const [webSearch, setWebSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveTools, setLiveTools] = useState<AiToolTrace[]>([]);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    const summary = await aiOpenRouterService.getMyUsage().catch(() => null);
    setUsage(summary);
  }, []);

  const loadThreads = useCallback(async () => {
    const list = await aiChatService.listThreads();
    setThreads(list);
    setActiveId((prev) => prev ?? (list[0]?.id ?? null));
  }, []);

  const loadMemories = useCallback(async () => {
    const [memList, fileList] = await Promise.all([
      aiChatService.listMemories(scopeType, workspaceId, projectId),
      aiChatService.listIndexedFiles(scopeType, workspaceId, projectId).catch(() => []),
    ]);
    setMemories(memList);
    setIndexedFiles(fileList);
  }, [scopeType, workspaceId, projectId]);

  useEffect(() => {
    void loadThreads();
    void loadUsage();
  }, [loadThreads, loadUsage]);

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
            void loadUsage();
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

  async function reindexFile(nodeId: string) {
    await aiChatService.triggerFileIndex(nodeId, scopeType, workspaceId, projectId);
    await loadMemories();
  }

  async function savePersonalKey(apiKey: string) {
    const updated = await aiOpenRouterService.savePersonalKey(apiKey);
    setUsage(updated);
  }

  async function clearPersonalKey() {
    const updated = await aiOpenRouterService.clearPersonalKey();
    setUsage(updated);
  }

  return {
    scopeType, setScopeType,
    threads, activeId, setActiveId,
    messages, memories, indexedFiles,
    model, setModel,
    webSearch, setWebSearch,
    sending, streamingText, liveTools, usage, error,
    createNewThread, deleteThread, sendPrompt, addMemory, deleteMemory, reindexFile,
    savePersonalKey, clearPersonalKey,
  };
}
