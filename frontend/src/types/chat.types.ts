import type { UserRole } from './auth.types';

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  kind: 'channel' | 'dm';
  unread: number;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorName: string;
  authorHandle: string;
  authorRole: UserRole;
  content: string;
  timestamp: string;
}

export interface ChatMember {
  id: string;
  name: string;
  handle: string;
  role: UserRole;
  status: 'online' | 'away' | 'offline';
}
