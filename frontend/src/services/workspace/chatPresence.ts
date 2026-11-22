import type { ChatScopeType } from '../../types/workspace.types';
import { chatConnection } from './httpChat.service';

export interface ChatPresenceEvent {
  eventType: 'PRESENCE';
  scopeType: ChatScopeType;
  scopeId: string;
  onlineCount: number;
}

export function subscribeChatPresence(
  channelId: string,
  scopeType: ChatScopeType,
  scopeId: string,
  onCount: (count: number) => void
): () => void {
  const scope = scopeType.toLowerCase();
  const topic = `/topic/chat-presence.${scope}.${scopeId}`;
  const send = (action: 'JOIN' | 'HEARTBEAT' | 'LEAVE') => {
    try { chatConnection.send(`/app/chat.${channelId}.presence`, { action }); } catch { /* reconnect will rejoin */ }
  };
  const unsubscribe = chatConnection.subscribe(topic, (frame) => {
    try {
      const event = JSON.parse(frame.body) as Partial<ChatPresenceEvent>;
      if (event.eventType === 'PRESENCE' && event.scopeId === scopeId
        && event.scopeType === scopeType && typeof event.onlineCount === 'number') {
        onCount(Math.max(0, event.onlineCount));
      }
    } catch { /* Ignore malformed presence events. */ }
  });
  const unsubscribeState = chatConnection.onStateChange((state) => {
    if (state === 'connected') send('JOIN');
  });
  send('JOIN');
  const heartbeat = window.setInterval(() => send('HEARTBEAT'), 25000);
  return () => {
    window.clearInterval(heartbeat);
    unsubscribeState();
    send('LEAVE');
    unsubscribe();
  };
}
