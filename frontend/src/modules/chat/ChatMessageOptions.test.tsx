import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatChannelDto, ChatMessageDto } from '../../types/workspace.types';
import { ChatThreadView } from './ChatThreadView';

const mockState = vi.hoisted(() => ({
  messages: [] as ChatMessageDto[],
  deleteMessage: vi.fn(),
  editMessage: vi.fn(),
  togglePin: vi.fn(),
}));

vi.mock('./useChatChannel', () => ({
  useChatChannel: () => ({
    messages: mockState.messages,
    loading: false,
    loadingOlder: false,
    error: null,
    hasOlder: false,
    loadOlder: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    editMessage: mockState.editMessage,
    togglePin: mockState.togglePin,
    deleteMessage: mockState.deleteMessage,
    setReaction: vi.fn().mockResolvedValue(undefined),
    typingUsers: [],
    sendTyping: vi.fn(),
  }),
}));

const CHANNEL: ChatChannelDto = {
  id: 'ch-1',
  scopeType: 'WORKSPACE',
  scopeId: 'ws-1',
  name: 'general',
  description: 'Team chat',
  channelType: 'TEXT',
  category: 'TEXT CHANNELS',
  participantCount: 0,
  createdAt: '2026-11-20T00:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Chat message options: Pin, Edit, Multi-select', () => {
  it('supports editing own sent message and shows (edited) badge', async () => {
    mockState.messages = [
      {
        id: 'm-1',
        channelId: 'ch-1',
        senderId: 'u-1',
        senderName: 'Alice',
        senderUsername: 'alice',
        content: 'Original text',
        createdAt: '2026-11-22T08:00:00Z',
      },
    ];
    mockState.editMessage.mockResolvedValue(undefined);

    render(
      <ChatThreadView
        channel={CHANNEL}
        scopeLabel="Orbit"
        currentUserId="u-1"
        canManageChannels={false}
        canWriteChat
        onlineCount={2}
      />
    );

    fireEvent.click(screen.getByLabelText('More message actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Editing message')).toBeTruthy();
    const input = screen.getByLabelText('Message') as HTMLInputElement;
    expect(input.value).toBe('Original text');

    fireEvent.change(input, { target: { value: 'Updated text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockState.editMessage).toHaveBeenCalledWith('m-1', 'Updated text');
    });
  });

  it('pins and unpins messages and renders pinned banner', async () => {
    mockState.messages = [
      {
        id: 'm-1',
        channelId: 'ch-1',
        senderId: 'u-2',
        senderName: 'Bob',
        senderUsername: 'bob',
        content: 'Important release note',
        pinned: true,
        pinnedAt: '2026-11-22T08:01:00Z',
        createdAt: '2026-11-22T08:00:00Z',
      },
    ];
    mockState.togglePin.mockResolvedValue(undefined);

    render(
      <ChatThreadView
        channel={CHANNEL}
        scopeLabel="Orbit"
        currentUserId="u-1"
        canManageChannels={false}
        canWriteChat
        onlineCount={2}
      />
    );

    expect(screen.getByRole('region', { name: 'Pinned messages' })).toBeTruthy();
    expect(screen.getByText('Pinned Message')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Unpin message'));
    await waitFor(() => expect(mockState.togglePin).toHaveBeenCalledWith('m-1'));
  });

  it('selects multiple messages and bulk deletes deletable messages', async () => {
    mockState.messages = [
      {
        id: 'm-1',
        channelId: 'ch-1',
        senderId: 'u-1',
        senderName: 'Alice',
        senderUsername: 'alice',
        content: 'First msg',
        createdAt: '2026-11-22T08:00:00Z',
      },
      {
        id: 'm-2',
        channelId: 'ch-1',
        senderId: 'u-1',
        senderName: 'Alice',
        senderUsername: 'alice',
        content: 'Second msg',
        createdAt: '2026-11-22T08:01:00Z',
      },
    ];
    mockState.deleteMessage.mockResolvedValue(undefined);

    render(
      <ChatThreadView
        channel={CHANNEL}
        scopeLabel="Orbit"
        currentUserId="u-1"
        canManageChannels={false}
        canWriteChat
        onlineCount={2}
      />
    );

    const moreButtons = screen.getAllByLabelText('More message actions');
    fireEvent.click(moreButtons[0]!);
    expect(moreButtons[0]!.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(moreButtons[1]!);
    expect(moreButtons[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(moreButtons[1]!.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(moreButtons[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect(screen.getByRole('toolbar', { name: 'Selected messages actions' })).toBeTruthy();
    fireEvent.click(screen.getByText('Second msg'));

    expect(screen.getByRole('button', { name: 'Delete (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete (2)' }));

    await waitFor(() => {
      expect(mockState.deleteMessage).toHaveBeenCalledWith('m-1');
      expect(mockState.deleteMessage).toHaveBeenCalledWith('m-2');
    });
  });
});
