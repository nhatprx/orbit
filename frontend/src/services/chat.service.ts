import {
  INITIAL_CHAT_CHANNELS,
  INITIAL_CHAT_MESSAGES,
  MOCK_CHAT_MEMBERS,
} from '../mocks/chat.mock';
import type { AuthUser } from '../types/auth.types';
import type { ChatChannel, ChatMember, ChatMessage } from '../types/chat.types';

export interface IChatService {
  listChannels(): Promise<ChatChannel[]>;
  listMessages(channelId: string, limit?: number): Promise<ChatMessage[]>;
  listMembers(): Promise<ChatMember[]>;
  markRead(channelId: string): Promise<void>;
  sendMessage(channelId: string, content: string, sender: AuthUser): Promise<ChatMessage>;
}

let channels: ChatChannel[] = [...INITIAL_CHAT_CHANNELS];
let messages: ChatMessage[] = [...INITIAL_CHAT_MESSAGES];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockChatService implements IChatService {
  async listChannels(): Promise<ChatChannel[]> {
    await delay(60);
    return [...channels];
  }

  async listMessages(channelId: string, limit = 50): Promise<ChatMessage[]> {
    await delay(60);
    return messages
      .filter((m) => m.channelId === channelId)
      .slice(-limit);
  }

  async listMembers(): Promise<ChatMember[]> {
    return MOCK_CHAT_MEMBERS;
  }

  async markRead(channelId: string): Promise<void> {
    channels = channels.map((c) =>
      c.id === channelId ? { ...c, unread: 0 } : c
    );
  }

  async sendMessage(
    channelId: string,
    content: string,
    sender: AuthUser
  ): Promise<ChatMessage> {
    await delay(80);
    const created: ChatMessage = {
      id: `msg_${Date.now()}`,
      channelId,
      authorName: sender.name,
      authorHandle: sender.username ?? sender.email.split('@')[0] ?? 'user',
      authorRole: sender.role,
      content: content.trim(),
      timestamp: 'Just now',
    };
    messages = [...messages, created];
    return created;
  }
}

export const chatService: IChatService = new MockChatService();
