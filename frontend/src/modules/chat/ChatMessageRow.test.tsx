import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessageDto } from '../../types/workspace.types';
import { ChatMessageList } from './ChatMessageList';
import { formatDayDivider, groupChatMessages } from './chatMessageGrouping';

afterEach(() => {
  cleanup();
});

function msg(overrides: Partial<ChatMessageDto> = {}): ChatMessageDto {
  return {
    id: 'm-1',
    channelId: 'ch-1',
    senderId: 'u-2',
    senderName: 'Bob Smith',
    senderUsername: 'bob',
    content: 'Hello team',
    createdAt: '2026-11-22T07:00:00Z',
    ...overrides,
  };
}

describe('chatMessageGrouping', () => {
  it('groups consecutive messages from the same sender within 5 minutes and splits across gaps or days', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    const items = groupChatMessages(
      [
        msg({ id: 'm-1', createdAt: '2026-11-21T08:00:00Z' }),
        msg({ id: 'm-2', createdAt: '2026-11-22T07:00:00Z' }),
        msg({ id: 'm-3', createdAt: '2026-11-22T07:02:00Z' }),
        msg({ id: 'm-4', createdAt: '2026-11-22T07:10:00Z' }),
        msg({ id: 'm-5', senderId: 'u-1', senderName: 'Alice', createdAt: '2026-11-22T07:11:00Z' }),
      ],
      now
    );

    expect(items[0]?.dateLabel).toBe('Yesterday');
    expect(items[1]?.dateLabel).toBe('Today');
    expect(items[1]?.isFirstInGroup).toBe(true);
    expect(items[1]?.isLastInGroup).toBe(false);
    expect(items[2]?.dateLabel).toBeNull();
    expect(items[2]?.isFirstInGroup).toBe(false);
    expect(items[2]?.isLastInGroup).toBe(true);
    expect(items[3]?.isFirstInGroup).toBe(true);
    expect(items[4]?.isFirstInGroup).toBe(true);
  });

  it('formats older dates cleanly', () => {
    expect(formatDayDivider('2026-11-10T08:00:00Z', new Date('2026-11-22T12:00:00Z'))).toContain('Nov');
  });
});

describe('Telegram-style ChatMessageList & ChatMessageRow', () => {
  it('renders grouped incoming bubbles with single sender header, bottom avatar, and outgoing bubbles without self header', () => {
    const onReply = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onToggleReaction = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatMessageList
        messages={[
          msg({ id: 'm-1', content: 'First line', createdAt: '2026-11-22T07:00:00Z' }),
          msg({ id: 'm-2', content: 'Second line', createdAt: '2026-11-22T07:01:00Z' }),
          msg({
            id: 'm-3',
            senderId: 'u-1',
            senderName: 'Alice Chen',
            senderUsername: 'alice',
            content: 'Got it!',
            replyToSenderName: 'Bob Smith',
            replyToSnippet: 'Second line',
            reactions: [{ reactionKey: 'LIKE', count: 2, reactedByMe: true }],
            createdAt: '2026-11-22T07:02:00Z',
          }),
        ]}
        currentUserId="u-1"
        canManageChannels={false}
        canWriteChat
        hasOlder={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        onReply={onReply}
        onDeleteMessage={onDelete}
        onToggleReaction={onToggleReaction}
      />
    );

    // Incoming sender name appears once for the grouped bubble pair, plus once in reply quote
    expect(screen.getAllByText('Bob Smith')).toHaveLength(2);
    // Outgoing message does not repeat self sender name inside the bubble
    expect(screen.queryByText('Alice Chen')).toBeNull();
    // Reply quote snippet rendered inside outgoing bubble
    expect(screen.getAllByText('Second line')).toHaveLength(2);
    // Reaction chip works
    fireEvent.click(screen.getByRole('button', { name: /2/ }));
    expect(onToggleReaction).toHaveBeenCalledWith('m-3', 'LIKE');
  });

  it('renders soft-deleted tombstone without action buttons', () => {
    render(
      <ChatMessageList
        messages={[
          msg({ id: 'm-del', content: '', deletedAt: '2026-11-22T07:05:00Z' }),
        ]}
        currentUserId="u-1"
        canManageChannels={false}
        canWriteChat
        hasOlder={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        onReply={vi.fn()}
        onDeleteMessage={vi.fn().mockResolvedValue(undefined)}
        onToggleReaction={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText('This message was deleted')).toBeTruthy();
    expect(screen.queryByLabelText('More message actions')).toBeNull();
  });
});
