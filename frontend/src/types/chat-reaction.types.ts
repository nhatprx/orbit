export type ChatReactionKey = 'LIKE' | 'LOVE' | 'LAUGH' | 'CELEBRATE';

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
