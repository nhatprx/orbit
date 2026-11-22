import type { ChatMessageDeletedEvent, ChatMessageDto, ChatReactionEvent, ChatTypingEvent } from '../../types/workspace.types';
import type { StompConnection } from './stomp/StompConnection';

export function subscribeChatChannel(connection: StompConnection, channelId: string,
  onMessage: (message: ChatMessageDto) => void,
  onDeleted?: (event: ChatMessageDeletedEvent) => void,
  onTyping?: (event: ChatTypingEvent) => void,
  onReaction?: (event: ChatReactionEvent) => void): () => void {
  return connection.subscribe(`/topic/chat.${channelId}`, (frame) => {
    try {
      const payload = JSON.parse(frame.body) as Record<string, unknown>;
      if (payload.eventType === 'REACTION_CHANGED' && typeof payload.messageId === 'string'
        && typeof payload.reactionKey === 'string' && typeof payload.userId === 'string') {
        onReaction?.(payload as unknown as ChatReactionEvent);
        return;
      }
      if (payload.eventType === 'TYPING' && typeof payload.userId === 'string'
        && typeof payload.active === 'boolean' && typeof payload.displayName === 'string'
        && (payload.channelId === undefined || payload.channelId === channelId)) {
        onTyping?.(payload as unknown as ChatTypingEvent);
        return;
      }
      if (payload.eventType === 'MESSAGE_DELETED' && typeof payload.messageId === 'string') {
        onDeleted?.({ eventType: 'MESSAGE_DELETED',
          channelId: typeof payload.channelId === 'string' ? payload.channelId : channelId,
          messageId: payload.messageId,
          deletedAt: typeof payload.deletedAt === 'string' ? payload.deletedAt : undefined });
        return;
      }
      if (typeof payload.id === 'string') onMessage(payload as unknown as ChatMessageDto);
    } catch {
      // Ignore malformed broadcasts without dropping the live subscription.
    }
  });
}
