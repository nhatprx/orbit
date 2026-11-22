export interface ChatAttachmentDto {
  name: string;
  url: string;
}

export type ChatReactionKey = 'LIKE';

export interface ChatReactionSummaryDto {
  reactionKey: ChatReactionKey;
  count: number;
  reactedByMe: boolean;
}

export interface ChatReactionEvent {
  eventType: 'REACTION_CHANGED';
  channelId: string;
  messageId: string;
  reactionKey: ChatReactionKey;
  userId: string;
  active: boolean;
  count: number;
}
