export type ChatScopeType = 'WORKSPACE' | 'PROJECT';

export interface ChatChannelDto {
  id: string;
  scopeType: ChatScopeType;
  scopeId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  content: string;
  createdAt: string;
}

export interface SendChatMessageRequest {
  content: string;
}

export type MailProvider = 'gmail' | 'outlook' | 'imap';

export interface MailAccountDto {
  id: string;
  provider: MailProvider;
  email: string;
  displayName: string;
  status: 'CONNECTED' | 'ERROR';
  lastSyncedAt: string;
}

export interface ConnectOAuthMailRequest {
  provider: 'gmail' | 'outlook';
  email: string;
  displayName?: string;
}

export interface ConnectImapMailRequest {
  email: string;
  displayName?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}

export interface MailMessageSummaryDto {
  id: string;
  accountId: string;
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  read: boolean;
}

export interface MailMessageDetailDto extends MailMessageSummaryDto {
  body: string;
}

export interface SendMailRequest {
  accountId: string;
  toEmail: string;
  subject: string;
  body: string;
  inReplyToId?: string;
}

export type SocialProvider = 'google' | 'github';

export interface LinkedAccountDto {
  id: string;
  provider: SocialProvider;
  providerUserId: string;
  providerEmail: string;
  displayName: string;
  connectedAt: string;
}
