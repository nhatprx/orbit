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

vi.mock('./useChatOnlineCount', () => ({ useChatOnlineCount: () => 3 }));
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
    fireEvent.click(within(dialog).getByRole('button', { name: /Voice/i }));
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

  it('joins voice, toggles media controls and side chat, leaves voice when switching to text, and disconnects', async () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write'])} project={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'lounge' }));
    await waitFor(() => expect(store.joinVoiceSpy).toHaveBeenCalledWith('ch-voice'));
    expect(screen.getByText('VOICE CONNECTED')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));
    expect(screen.getByRole('button', { name: 'Unmute microphone' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deafen audio' }));
    expect(screen.getByRole('button', { name: 'Undeafen audio' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Turn camera on' }));
    expect(screen.getByRole('button', { name: 'Turn camera off' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share screen' }));
    expect(screen.getByText('LIVE SCREEN')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Toggle voice text chat'));
    expect(screen.getByLabelText('Voice room text chat')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'general' }));
    expect(await screen.findByPlaceholderText('Message #general')).toBeTruthy();
    await waitFor(() => expect(store.leaveVoiceSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('VOICE CONNECTED')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'lounge' }));
    await waitFor(() => expect(store.joinVoiceSpy).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect voice' }));
    await waitFor(() => expect(store.leaveVoiceSpy).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Join Voice Channel' })).toBeTruthy();
  });

  it('validates attachments, sends replies, removes member/search controls, and deletes messages', async () => {
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

    expect(screen.getByLabelText('Channel info panel')).toBeTruthy();
    expect(screen.queryByLabelText('Search messages')).toBeNull();
    expect(screen.queryByLabelText('Members panel')).toBeNull();

    fireEvent.click(screen.getByLabelText('More actions for Alice Chen'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(store.deleteMessage).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Shipping now')).toBeNull();

  });

  it('blocks protocol-relative attachments, enforces 64-char category maxLength, and binds delayed camera streams', () => {
    store.messages = [
      { id: 'm-bad', channelId: 'ch-text', senderId: 'u-2', senderName: 'Bob Smith', senderUsername: 'bob', content: 'Bad', attachmentName: 'evil', attachmentUrl: '//evil.example/x', createdAt: '2026-11-21T08:00:00Z' },
      { id: 'm-ok', channelId: 'ch-text', senderId: 'u-2', senderName: 'Bob Smith', senderUsername: 'bob', content: 'Good', attachmentName: 'spec.pdf', attachmentUrl: 'HTTPS://orbit.dev/spec.pdf', createdAt: '2026-11-21T08:01:00Z' },
    ];
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.manage'])} project={null} />);
    expect(screen.queryByRole('link', { name: /evil/i })).toBeNull();
    const specLinks = screen.getAllByRole('link', { name: /spec\.pdf/i });
    expect(specLinks.length).toBeGreaterThan(0);
    expect(specLinks[0]?.getAttribute('href')).toBe('HTTPS://orbit.dev/spec.pdf');

    fireEvent.click(screen.getByLabelText('Edit category TEXT CHANNELS'));
    expect((screen.getByLabelText('Category title') as HTMLInputElement).maxLength).toBe(64);

    const fakeStream = {} as MediaStream;
    const base = { userId: 'u-2', username: 'bob', displayName: 'Bob Smith', muted: false, deafened: false, cameraOn: false, screenSharing: false, speaking: false, joinedAt: '2026-11-21T08:00:00Z' };
    const { rerender } = render(<VoiceParticipantTile participant={base} isLocal={false} videoStream={fakeStream} isScreenSharing={false} />);
    expect(screen.queryByLabelText('Bob Smith camera feed')).toBeNull();
    rerender(<VoiceParticipantTile participant={{ ...base, cameraOn: true }} isLocal={false} videoStream={fakeStream} isScreenSharing={false} />);
    expect((screen.getByLabelText('Bob Smith camera feed') as HTMLVideoElement).srcObject).toBe(fakeStream);
  });
});
