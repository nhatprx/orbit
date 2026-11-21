import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatChannelDto } from '../../types/workspace.types';
import { ChatPage } from './ChatPage';
import { VoiceParticipantTile } from './VoiceParticipantTile';
import {
  makeTestWorkspace,
  resetChatTestStore,
  useFakeChatChannel,
  useFakeChatChannels,
  useFakeVoiceSession,
  type ChatTestStore,
} from './chatTestHarness';

const store = vi.hoisted(
  (): ChatTestStore => ({
    channels: [],
    messages: [],
    participants: {},
    members: [],
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
    joinVoiceSpy: vi.fn(),
    leaveVoiceSpy: vi.fn(),
  })
);

vi.mock('../../services/auth.service', () => ({
  authService: {
    getSession: () => ({
      user: { id: 'u-1', name: 'Alice Chen', username: 'alice', email: 'alice@orbit.dev', role: 'admin', workspaceId: 'ws-1' },
      accessToken: 'token',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
  },
}));

vi.mock('../../services/workspace/services', () => ({
  memberService: {
    listWorkspaceMembers: vi.fn(async () => ({ items: store.members, page: 0, size: 100, totalElements: store.members.length, totalPages: 1, hasMore: false })),
    listProjectMembers: vi.fn(async () => ({ items: store.members, page: 0, size: 100, totalElements: store.members.length, totalPages: 1, hasMore: false })),
  },
}));

vi.mock('./useChatConnection', () => ({ useChatConnection: () => 'connected' as const }));
vi.mock('./useChatChannels', () => ({ useChatChannels: () => useFakeChatChannels(store) }));
vi.mock('./useChatChannel', () => ({ useChatChannel: (id: string) => useFakeChatChannel(store, id) }));
vi.mock('./useVoiceSession', () => ({ useVoiceSession: (channels: ChatChannelDto[]) => useFakeVoiceSession(store, channels) }));

beforeEach(() => {
  vi.clearAllMocks();
  resetChatTestStore(store);
});

describe('ChatPage', () => {
  it('renders categories, nested voice participants, category collapse, and channel filter', () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write', 'chat.manage'])} project={null} />);
    expect(screen.getByText('TEXT CHANNELS')).toBeTruthy();
    expect(screen.getByText('VOICE CHANNELS')).toBeTruthy();
    expect(screen.getByText('1 LIVE')).toBeTruthy();
    expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'TEXT CHANNELS' }));
    expect(screen.queryByRole('button', { name: 'general' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'TEXT CHANNELS' }));
    expect(screen.getByRole('button', { name: 'general' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter channels'), { target: { value: 'lounge' } });
    expect(screen.queryByRole('button', { name: 'general' })).toBeNull();
    expect(screen.getByRole('button', { name: 'lounge' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter channels'), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No matching channels.')).toBeTruthy();
  });

  it('creates and deletes channels with chat.manage and hides manage controls without permission', async () => {
    const { rerender } = render(
      <ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write', 'chat.manage'])} project={null} />
    );
    expect(screen.queryByLabelText('Delete general')).toBeNull();

    fireEvent.click(screen.getByLabelText('New channel'));
    const dialog = screen.getByRole('dialog', { name: 'Create Channel' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Voice Channel/i }));
    fireEvent.change(within(dialog).getByLabelText('Channel Name'), { target: { value: 'standup' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Channel' }));
    await waitFor(() =>
      expect(store.createChannel).toHaveBeenCalledWith(expect.objectContaining({ name: 'standup', channelType: 'VOICE' }))
    );

    fireEvent.click(screen.getByLabelText('Delete lounge'));
    const confirm = screen.getByRole('dialog', { name: 'Delete Channel' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete Channel' }));
    await waitFor(() => expect(store.deleteChannel).toHaveBeenCalledWith('ch-voice'));

    rerender(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write'])} project={null} />);
    expect(screen.queryByLabelText('New channel')).toBeNull();
    expect(screen.queryByLabelText('Delete standup')).toBeNull();
  });

  it('joins voice, toggles media controls and side chat, keeps Voice Connected dock in text view, and disconnects', async () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write'])} project={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'lounge' }));
    await waitFor(() => expect(store.joinVoiceSpy).toHaveBeenCalledWith('ch-voice'));
    expect(screen.getByText('VOICE CONNECTED')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deafen' }));
    expect(screen.getByRole('button', { name: 'Undeafen' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Camera On' }));
    expect(screen.getByRole('button', { name: 'Camera Off' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share Screen' }));
    expect(screen.getByText('LIVE SCREEN')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Toggle voice text chat'));
    expect(screen.getByLabelText('Voice room text chat')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'general' }));
    expect(screen.getByPlaceholderText('Message #general')).toBeTruthy();
    expect(screen.getByText('VOICE CONNECTED')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Open voice stage'));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(store.leaveVoiceSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Join Voice Channel' })).toBeTruthy();
  });

  it('validates attachments, sends replies, deletes messages, filters messages, and toggles Members panel', async () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write', 'chat.manage'])} project={null} />);

    fireEvent.click(screen.getByLabelText('Attach link'));
    fireEvent.change(screen.getByLabelText('Attachment URL'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bad link' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('alert').textContent).toContain('Attachment URL must start with');
    expect(store.sendMessage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Close attachment bar'));
    fireEvent.click(screen.getByLabelText('Reply to Bob Smith'));
    expect(screen.getByText('Replying to Bob Smith')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Shipping now' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(store.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'Shipping now', replyToId: 'm-1' }))
    );
    expect(screen.getByText('Shipping now')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'unmatched-term' } });
    expect(screen.getByText('No messages match your search.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Clear message search'));

    fireEvent.click(screen.getByLabelText('Delete message from Alice Chen'));
    await waitFor(() => expect(store.deleteMessage).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Shipping now')).toBeNull();

    expect(await screen.findByText(/OWNERS & ADMINS/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Toggle members panel'));
    expect(screen.queryByLabelText('Members panel')).toBeNull();
    fireEvent.click(screen.getByLabelText('Toggle members panel'));
    expect(screen.getByLabelText('Members panel')).toBeTruthy();
  });

  it('blocks protocol-relative attachments, enforces 64-char category maxLength, and binds delayed camera streams', () => {
    store.messages = [
      { id: 'm-bad', channelId: 'ch-text', senderId: 'u-2', senderName: 'Bob Smith', senderUsername: 'bob', content: 'Bad', attachmentName: 'evil', attachmentUrl: '//evil.example/x', createdAt: '2026-11-21T08:00:00Z' },
      { id: 'm-ok', channelId: 'ch-text', senderId: 'u-2', senderName: 'Bob Smith', senderUsername: 'bob', content: 'Good', attachmentName: 'spec.pdf', attachmentUrl: 'HTTPS://orbit.dev/spec.pdf', createdAt: '2026-11-21T08:01:00Z' },
    ];
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.manage'])} project={null} />);
    expect(screen.queryByRole('link', { name: /evil/i })).toBeNull();
    expect(screen.getByRole('link', { name: /spec\.pdf/i }).getAttribute('href')).toBe('HTTPS://orbit.dev/spec.pdf');

    fireEvent.click(screen.getByLabelText('New channel'));
    expect((screen.getByLabelText('Category') as HTMLInputElement).maxLength).toBe(64);

    const fakeStream = {} as MediaStream;
    const base = { userId: 'u-2', username: 'bob', displayName: 'Bob Smith', muted: false, deafened: false, cameraOn: false, screenSharing: false, speaking: false, joinedAt: '2026-11-21T08:00:00Z' };
    const { rerender } = render(<VoiceParticipantTile participant={base} isLocal={false} videoStream={fakeStream} isScreenSharing={false} />);
    expect(screen.queryByLabelText('Bob Smith camera feed')).toBeNull();
    rerender(<VoiceParticipantTile participant={{ ...base, cameraOn: true }} isLocal={false} videoStream={fakeStream} isScreenSharing={false} />);
    expect((screen.getByLabelText('Bob Smith camera feed') as HTMLVideoElement).srcObject).toBe(fakeStream);
  });
});
