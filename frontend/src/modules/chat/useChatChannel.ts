import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { chatService } from '../../services/workspace/services';
import type { ChatMessageDto, SendChatMessageRequest } from '../../types/workspace.types';
import { mergeMessage, mergeOlder, removeMessage } from './chatMessages';

const PAGE_SIZE = 50;

/** History (cursor-paged), live STOMP updates, sending, and deletion for one channel. */
export function useChatChannel(channelId: string) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);

    // Subscribe first so nothing sent while history loads is missed; merging de-duplicates by id.
    const unsubscribe = chatService.subscribeChannel(channelId, (message) => {
      if (active) setMessages((current) => mergeMessage(current, message));
    });
    chatService
      .listMessages(channelId, undefined, PAGE_SIZE)
      .then((page) => {
        if (!active) return;
        setMessages((current) => mergeOlder(current, page.items));
        setNextCursor(page.hasMore ? page.nextCursor : null);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err, 'Could not load messages.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [channelId]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.listMessages(channelId, nextCursor, PAGE_SIZE);
      setMessages((current) => mergeOlder(current, page.items));
      setNextCursor(page.hasMore ? page.nextCursor : null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load older messages.'));
    } finally {
      setLoadingOlder(false);
    }
  }, [channelId, nextCursor, loadingOlder]);

  const send = useCallback(
    async (request: SendChatMessageRequest) => {
      const sent = await chatService.sendMessage(channelId, request);
      setMessages((current) => mergeMessage(current, sent));
    },
    [channelId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await chatService.deleteMessage(channelId, messageId);
      setMessages((current) => removeMessage(current, messageId));
    },
    [channelId]
  );

  return {
    messages,
    loading,
    loadingOlder,
    error,
    hasOlder: nextCursor !== null,
    loadOlder,
    send,
    deleteMessage,
  };
}
