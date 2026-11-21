export type ChatScopeType = 'WORKSPACE' | 'PROJECT';
export type ChatChannelType = 'TEXT' | 'VOICE';

export interface ChatChannelDto {
  id: string;
  scopeType: ChatScopeType;
  scopeId: string;
  name: string;
  description: string;
  channelType: ChatChannelType;
  category: string;
  participantCount: number;
  createdAt: string;
}

export interface CreateChatChannelRequest {
  name: string;
  description?: string;
  channelType: ChatChannelType;
  category?: string;
}

export interface UpdateChatChannelRequest {
  name?: string;
  description?: string;
  category?: string;
}

export interface ChatMessageDto {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  content: string;
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToSnippet?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

export interface SendChatMessageRequest {
  content: string;
  replyToId?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export interface VoiceParticipantDto {
  userId: string;
  username: string;
  displayName: string;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
  joinedAt: string;
}

export interface VoiceStateRequest {
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
}

export type VoiceSignalType =
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'SCREEN_SHARE_STARTED'
  | 'SCREEN_SHARE_STOPPED'
  | 'SPEAKING';

export interface VoiceSignalRequest {
  type: VoiceSignalType;
  targetUserId?: string | null;
  sdp?: string | null;
  candidate?: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface VoiceEventDto {
  eventType: 'PARTICIPANTS' | 'SIGNAL';
  channelId: string;
  senderId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  targetUserId: string | null;
  signalType: VoiceSignalType | null;
  sdp: string | null;
  candidate: string | null;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  participants: VoiceParticipantDto[] | null;
  timestamp: string;
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
