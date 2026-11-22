import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { chatService } from '../../services/workspace/services';
import type { ChatMessageDto, ChatReactionKey, ChatTypingEvent, SendChatMessageRequest } from '../../types/workspace.types';
import { applyReaction, mergeMessage, mergeOlder, removeMessage } from './chatMessages';

const PAGE_SIZE = 50;

/** History (cursor-paged), live STOMP updates, sending, and deletion for one channel. */
export function useChatChannel(channelId: string, currentUserId: string | null = null) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimers = useRef(new Map<string, number>());

  const receiveTyping = useCallback((event: ChatTypingEvent) => {
    if (event.userId === currentUserId) return;
    window.clearTimeout(typingTimers.current.get(event.userId));
    if (!event.active) {
      typingTimers.current.delete(event.userId);
      setTypingUsers((users) => { const next = { ...users }; delete next[event.userId]; return next; });
      return;
    }
    setTypingUsers((users) => ({ ...users, [event.userId]: event.displayName }));
    const timer = window.setTimeout(() => {
      setTypingUsers((users) => { const next = { ...users }; delete next[event.userId]; return next; });
      typingTimers.current.delete(event.userId);
    }, 3500);
    typingTimers.current.set(event.userId, timer);
  }, [currentUserId]);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);

    // Subscribe first so nothing sent or deleted while history loads is missed.
    const unsubscribe = chatService.subscribeChannel(
      channelId,
      (message) => {
        if (active) setMessages((current) => mergeMessage(current, message));
      },
      (deleted) => {
        if (active && deleted.channelId === channelId) {
          setMessages((current) => removeMessage(current, deleted.messageId));
        }
      },
      receiveTyping,
      (event) => { if (active) setMessages((current) => applyReaction(current, event, currentUserId)); }
    );
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
      typingTimers.current.forEach(window.clearTimeout);
      typingTimers.current.clear();
    };
  }, [channelId, receiveTyping]);

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

  const sendTyping = useCallback((active: boolean) => chatService.sendTyping(channelId, active), [channelId]);

  const setReaction = useCallback(async (messageId: string, key: ChatReactionKey) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target) return;
    const existing = (target.reactions ?? []).find((reaction) => reaction.reactionKey === key);
    const event = await chatService.setReaction(channelId, messageId, key, !existing?.reactedByMe);
    setMessages((current) => applyReaction(current, event, currentUserId));
  }, [channelId, currentUserId, messages]);

  return {
    messages,
    loading,
    loadingOlder,
    error,
    hasOlder: nextCursor !== null,
    loadOlder,
    send,
    deleteMessage,
    setReaction,
    typingUsers: Object.values(typingUsers),
    sendTyping,
  };
}
