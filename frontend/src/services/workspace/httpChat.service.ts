import { API_BASE_URL, getStoredSession } from '../auth.storage';
import type {
  ChatChannelDto,
  ChatMessageDto,
  CursorPageResponse,
  SendChatMessageRequest,
} from '../../types/workspace.types';
import type { ChatService } from './collab.service';
import { apiRequest, seg } from './httpClient';
import { StompConnection } from './stomp/StompConnection';

const TOPIC_PREFIX = '/topic/chat.';

/** Derives ws(s)://host/ws from the REST base URL (or the page origin when it is relative). */
export function resolveWebSocketUrl(apiBase: string, origin: string): string {
  const base = apiBase || origin;
  return `${base.replace(/^http/i, 'ws').replace(/\/+$/, '')}/ws`;
}

export const chatConnection = new StompConnection({
  url: () => resolveWebSocketUrl(API_BASE_URL, window.location.origin),
  token: () => getStoredSession()?.accessToken ?? null,
});

class HttpChatService implements ChatService {
  listWorkspaceChannels(workspaceId: string) {
    return apiRequest<ChatChannelDto[]>('GET', `/api/v1/workspaces/${seg(workspaceId)}/chat/channels`);
  }

  listProjectChannels(workspaceId: string, projectId: string) {
    return apiRequest<ChatChannelDto[]>(
      'GET',
      `/api/v1/workspaces/${seg(workspaceId)}/projects/${seg(projectId)}/chat/channels`
    );
  }

  listMessages(channelId: string, cursor?: string, limit?: number) {
    return apiRequest<CursorPageResponse<ChatMessageDto>>(
      'GET',
      `/api/v1/chat/channels/${seg(channelId)}/messages`,
      { query: { cursor, limit } }
    );
  }

  sendMessage(channelId: string, request: SendChatMessageRequest) {
    return apiRequest<ChatMessageDto>('POST', `/api/v1/chat/channels/${seg(channelId)}/messages`, {
      body: request,
    });
  }

  subscribeChannel(channelId: string, onMessage: (message: ChatMessageDto) => void): () => void {
    return chatConnection.subscribe(`${TOPIC_PREFIX}${channelId}`, (frame) => {
      try {
        onMessage(JSON.parse(frame.body) as ChatMessageDto);
      } catch {
        // Ignore a malformed broadcast rather than tearing down the subscription.
      }
    });
  }
}

export const httpChatService: ChatService = new HttpChatService();
