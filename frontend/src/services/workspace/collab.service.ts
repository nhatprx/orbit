import type {
  ChatChannelDto,
  ChatMessageDeletedEvent,
  ChatMessageDto,
  ChatTypingEvent,
  ChatReactionEvent,
  ChatReactionKey,
  ConnectImapMailRequest,
  ConnectOAuthMailRequest,
  CreateChatChannelRequest,
  CursorPageResponse,
  LinkedAccountDto,
  MailAccountDto,
  MailMessageDetailDto,
  MailMessageSummaryDto,
  SendChatMessageRequest,
  SendMailRequest,
  SocialProvider,
  UpdateChatChannelRequest,
  VoiceEventDto,
  VoiceIceServerDto,
  VoiceParticipantDto,
  VoiceSignalRequest,
  VoiceStateRequest,
} from '../../types/workspace.types';

export interface ChatService {
  listWorkspaceChannels(workspaceId: string): Promise<ChatChannelDto[]>;
  listProjectChannels(workspaceId: string, projectId: string): Promise<ChatChannelDto[]>;
  createWorkspaceChannel(
    workspaceId: string,
    request: CreateChatChannelRequest
  ): Promise<ChatChannelDto>;
  createProjectChannel(
    workspaceId: string,
    projectId: string,
    request: CreateChatChannelRequest
  ): Promise<ChatChannelDto>;
  updateChannel(channelId: string, request: UpdateChatChannelRequest): Promise<ChatChannelDto>;
  deleteChannel(channelId: string): Promise<void>;
  listMessages(
    channelId: string,
    cursor?: string,
    limit?: number
  ): Promise<CursorPageResponse<ChatMessageDto>>;
  sendMessage(channelId: string, request: SendChatMessageRequest): Promise<ChatMessageDto>;
  deleteMessage(channelId: string, messageId: string): Promise<void>;
  setReaction(channelId: string, messageId: string, key: ChatReactionKey, active: boolean): Promise<ChatReactionEvent>;
  subscribeChannel(
    channelId: string,
    onMessage: (message: ChatMessageDto) => void,
    onDeleted?: (event: ChatMessageDeletedEvent) => void,
    onTyping?: (event: ChatTypingEvent) => void,
    onReaction?: (event: ChatReactionEvent) => void
  ): () => void;
  sendTyping(channelId: string, active: boolean): void;
  getVoiceIceServers(): Promise<VoiceIceServerDto[]>;
  listVoiceParticipants(channelId: string): Promise<VoiceParticipantDto[]>;
  joinVoiceChannel(channelId: string, state: VoiceStateRequest): Promise<VoiceParticipantDto[]>;
  updateVoiceState(channelId: string, state: VoiceStateRequest): Promise<VoiceParticipantDto[]>;
  leaveVoiceChannel(channelId: string): Promise<VoiceParticipantDto[]>;
  sendVoiceSignal(channelId: string, signal: VoiceSignalRequest): Promise<void>;
  subscribeVoice(channelId: string, onEvent: (event: VoiceEventDto) => void): () => void;
}

export interface MailService {
  listAccounts(): Promise<MailAccountDto[]>;
  connectOAuthAccount(request: ConnectOAuthMailRequest): Promise<MailAccountDto>;
  connectImapAccount(request: ConnectImapMailRequest): Promise<MailAccountDto>;
  disconnectAccount(accountId: string): Promise<void>;
  listMessages(
    accountId: string,
    folder?: 'inbox' | 'sent' | 'archive' | 'trash'
  ): Promise<MailMessageSummaryDto[]>;
  getMessage(accountId: string, messageId: string): Promise<MailMessageDetailDto>;
  sendMessage(request: SendMailRequest): Promise<MailMessageSummaryDto>;
  markRead(accountId: string, messageId: string, read: boolean): Promise<void>;
}

export interface LinkedAccountService {
  listLinkedAccounts(): Promise<LinkedAccountDto[]>;
  connectProvider(provider: SocialProvider): Promise<LinkedAccountDto | void>;
  disconnectAccount(accountId: string): Promise<void>;
}
