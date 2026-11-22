import { useEffect, useState } from 'react';
import type { ChatScopeType } from '../../types/workspace.types';
import { subscribeChatPresence } from '../../services/workspace/chatPresence';

export function useChatOnlineCount(channelId: string | null, scopeType: ChatScopeType, scopeId: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!channelId) return;
    return subscribeChatPresence(channelId, scopeType, scopeId, setCount);
  }, [channelId, scopeId, scopeType]);
  return count;
}
