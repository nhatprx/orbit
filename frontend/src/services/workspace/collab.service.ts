import type {
  ChatChannelDto,
  ChatMessageDto,
  ConnectImapMailRequest,
  ConnectOAuthMailRequest,
  CursorPageResponse,
  LinkedAccountDto,
  MailAccountDto,
  MailMessageDetailDto,
  MailMessageSummaryDto,
  SendChatMessageRequest,
  SendMailRequest,
  SocialProvider,
} from '../../types/workspace.types';

export interface ChatService {
  listWorkspaceChannels(workspaceId: string): Promise<ChatChannelDto[]>;
  listProjectChannels(workspaceId: string, projectId: string): Promise<ChatChannelDto[]>;
  listMessages(
    channelId: string,
    cursor?: string,
    limit?: number
  ): Promise<CursorPageResponse<ChatMessageDto>>;
  sendMessage(channelId: string, request: SendChatMessageRequest): Promise<ChatMessageDto>;
  subscribeChannel(
    channelId: string,
    onMessage: (message: ChatMessageDto) => void
  ): () => void;
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
  connectProvider(provider: SocialProvider): Promise<LinkedAccountDto>;
  disconnectAccount(accountId: string): Promise<void>;
}
