import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatChannelDto, ProjectDto } from '../../types/workspace.types';
import { ChatPage } from './ChatPage';
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
      user: { id: 'u-1', name: 'Alice Chen', username: 'alice', email: 'alice@orbit.dev', role: 'member', workspaceId: 'ws-1' },
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

function makeProject(permissions: string[]): ProjectDto {
  return {
    id: 'p-1',
    workspaceId: 'ws-1',
    workspaceName: 'Orbit Core',
    name: 'Apollo',
    slug: 'apollo',
    description: null,
    memberCount: 2,
    enabledModules: ['chat'],
    myPermissions: permissions,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  };
}

describe('ChatPage read-only RBAC enforcement', () => {
  it('disables composer, reply, and voice join with read-only notices when lacking chat.write', () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read'])} project={null} />);

    expect(screen.getByText('READ-ONLY')).toBeTruthy();
    expect(screen.getByText(/Read-only access: you do not have permission to send messages/i)).toBeTruthy();
    expect((screen.getByLabelText('Message') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Attach link') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Reply to Bob Smith') as HTMLButtonElement).disabled).toBe(true);

    // Selecting a voice channel opens the pre-join view without auto-joining and disables join buttons.
    fireEvent.click(screen.getByRole('button', { name: 'lounge' }));
    expect(store.joinVoiceSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Read-only access: you do not have permission to join voice channels/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Join Voice Channel' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Join & Share Screen/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('enforces pchat.write in project scope', () => {
    render(<ChatPage workspace={makeTestWorkspace(['chat.read', 'chat.write'])} project={makeProject(['pchat.read'])} />);

    expect(screen.getByText('READ-ONLY')).toBeTruthy();
    expect((screen.getByLabelText('Message') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'lounge' }));
    expect(store.joinVoiceSpy).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Join Voice Channel' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
