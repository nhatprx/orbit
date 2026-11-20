import { useSyncExternalStore } from 'react';
import { chatConnection } from '../../services/workspace/httpChat.service';
import type { ConnectionState } from '../../services/workspace/stomp/StompConnection';

/** Live connection state of the shared STOMP session, for the status indicator. */
export function useChatConnection(): ConnectionState {
  return useSyncExternalStore(
    (listener) => chatConnection.onStateChange(listener),
    () => chatConnection.getState(),
    () => 'idle'
  );
}
