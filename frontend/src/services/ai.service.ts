import type {
  AiDocumentIndex,
  AiMemory,
  AiMessage,
  AiModelId,
  AiProviderConfig,
  AiScopeType,
  AiThread,
  AiToolTrace,
  UpdateAiProviderConfigPayload,
} from '../types/ai.types';
import { getStoredSession } from './auth.storage';
import { apiRequest } from './workspace/httpClient';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export interface StreamHandlers {
  onToken?: (delta: string) => void;
  onTool?: (trace: AiToolTrace) => void;
  onDone?: (message: AiMessage) => void;
  onError?: (message: string) => void;
}

export interface IAiChatService {
  listThreads(scopeType?: AiScopeType, workspaceId?: string | null): Promise<AiThread[]>;
  createThread(payload: {
    scopeType: AiScopeType;
    workspaceId?: string | null;
    projectId?: string | null;
    model: AiModelId;
  }): Promise<AiThread>;
  deleteThread(threadId: string): Promise<void>;
  listMessages(threadId: string): Promise<AiMessage[]>;
  streamPrompt(
    threadId: string,
    payload: { prompt: string; model: AiModelId; webSearch: boolean },
    handlers: StreamHandlers
  ): Promise<void>;
  listMemories(scopeType: AiScopeType, workspaceId?: string | null, projectId?: string | null): Promise<AiMemory[]>;
  createMemory(payload: {
    scopeType: AiScopeType;
    workspaceId?: string | null;
    projectId?: string | null;
    category: 'FACT' | 'DECISION' | 'PREFERENCE';
    content: string;
    pinned?: boolean;
  }): Promise<AiMemory>;
  deleteMemory(memoryId: string): Promise<void>;
  listIndexedFiles(scopeType: AiScopeType, workspaceId?: string | null, projectId?: string | null): Promise<AiDocumentIndex[]>;
  triggerFileIndex(nodeId: string, scopeType: AiScopeType, workspaceId?: string | null, projectId?: string | null): Promise<void>;
  getAdminConfig(): Promise<AiProviderConfig>;
  updateAdminConfig(payload: UpdateAiProviderConfigPayload): Promise<AiProviderConfig>;
}

function parseSseChunk(rawEvent: string, handlers: StreamHandlers) {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  const payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
  if (eventName === 'token' && typeof payload.delta === 'string') {
    handlers.onToken?.(payload.delta);
  } else if (eventName === 'tool') {
    handlers.onTool?.(payload as unknown as AiToolTrace);
  } else if (eventName === 'done') {
    handlers.onDone?.(payload as unknown as AiMessage);
  } else if (eventName === 'error') {
    handlers.onError?.(typeof payload.message === 'string' ? payload.message : 'AI request failed.');
  }
}

export const aiChatService: IAiChatService = {
  listThreads(scopeType, workspaceId) {
    return apiRequest<AiThread[]>('GET', '/api/v1/ai/threads', {
      query: { scopeType: scopeType ?? undefined, workspaceId: workspaceId ?? undefined },
    });
  },

  createThread(payload) {
    return apiRequest<AiThread>('POST', '/api/v1/ai/threads', { body: payload });
  },

  deleteThread(threadId) {
    return apiRequest<void>('DELETE', `/api/v1/ai/threads/${threadId}`);
  },

  listMessages(threadId) {
    return apiRequest<AiMessage[]>('GET', `/api/v1/ai/threads/${threadId}/messages`);
  },

  async streamPrompt(threadId, payload, handlers) {
    const token = getStoredSession()?.accessToken ?? null;
    const res = await fetch(`${API_BASE}/api/v1/ai/threads/${threadId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      handlers.onError?.(`AI request failed (HTTP ${res.status}).`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let sepIndex = buffer.indexOf('\n\n');
      while (sepIndex !== -1) {
        const block = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);
        if (block) {
          try {
            parseSseChunk(block, handlers);
          } catch {
            // Ignore partial frame
          }
        }
        sepIndex = buffer.indexOf('\n\n');
      }
    }
  },

  listMemories(scopeType, workspaceId, projectId) {
    return apiRequest<AiMemory[]>('GET', '/api/v1/ai/memories', {
      query: { scopeType, workspaceId: workspaceId ?? undefined, projectId: projectId ?? undefined },
    });
  },

  createMemory(payload) {
    return apiRequest<AiMemory>('POST', '/api/v1/ai/memories', { body: payload });
  },

  deleteMemory(memoryId) {
    return apiRequest<void>('DELETE', `/api/v1/ai/memories/${memoryId}`);
  },

  listIndexedFiles(scopeType, workspaceId, projectId) {
    return apiRequest<AiDocumentIndex[]>('GET', '/api/v1/ai/rag/files', {
      query: { scopeType, workspaceId: workspaceId ?? undefined, projectId: projectId ?? undefined },
    });
  },

  async triggerFileIndex(nodeId, scopeType, workspaceId, projectId) {
    await apiRequest<unknown>('POST', `/api/v1/ai/rag/index/${nodeId}`, {
      query: { scopeType, workspaceId: workspaceId ?? undefined, projectId: projectId ?? undefined },
    });
  },

  getAdminConfig() {
    return apiRequest<AiProviderConfig>('GET', '/api/v1/admin/ai/config');
  },

  updateAdminConfig(payload) {
    return apiRequest<AiProviderConfig>('PUT', '/api/v1/admin/ai/config', { body: payload });
  },
};
