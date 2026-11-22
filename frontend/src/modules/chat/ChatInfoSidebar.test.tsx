import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { extractChannelMedia } from './chatInfoExtractors';
import { ChatInfoSidebar } from './ChatInfoSidebar';

afterEach(() => {
  cleanup();
});

const CHANNEL: ChatChannelDto = {
  id: 'ch-1',
  scopeType: 'WORKSPACE',
  scopeId: 'ws-1',
  name: 'faaps-sp',
  description: 'Sprint planning group',
  channelType: 'TEXT',
  category: 'TEXT CHANNELS',
  participantCount: 0,
  createdAt: '2026-11-20T00:00:00Z',
};

const MEMBERS: MemberDto[] = [
  { userId: 'u-1', username: 'nhatprx', displayName: 'Minh Nhat', email: 'n@orbit.dev', roleId: 'r-1', roleName: 'Owner', isOwner: true, joinedAt: '2026-11-20T00:00:00Z' },
  { userId: 'u-2', username: 'duynn', displayName: 'Duy Nguyen', email: 'd@orbit.dev', roleId: 'r-2', roleName: 'Member', isOwner: false, joinedAt: '2026-11-20T00:00:00Z' },
];

const MESSAGES: ChatMessageDto[] = [
  {
    id: 'm-1',
    channelId: 'ch-1',
    senderId: 'u-1',
    senderName: 'Minh Nhat',
    senderUsername: 'nhatprx',
    content: 'Join call at https://meet.google.com/abc-defg-hij',
    createdAt: '2026-11-22T08:00:00Z',
  },
  {
    id: 'm-2',
    channelId: 'ch-1',
    senderId: 'u-2',
    senderName: 'Duy Nguyen',
    senderUsername: 'duynn',
    content: 'Architecture diagram',
    attachmentName: 'arch.png',
    attachmentUrl: 'https://s3.example/arch.png',
    pinned: true,
    pinnedAt: '2026-11-22T08:02:00Z',
    createdAt: '2026-11-22T08:01:00Z',
  },
  {
    id: 'm-3',
    channelId: 'ch-1',
    senderId: 'u-2',
    senderName: 'Duy Nguyen',
    senderUsername: 'duynn',
    content: 'Spec document',
    attachmentName: 'spec.pdf',
    attachmentUrl: 'https://s3.example/spec.pdf',
    createdAt: '2026-11-22T08:03:00Z',
  },
];

describe('ChatInfoSidebar & extractChannelMedia', () => {
  it('extracts images, files, and links cleanly from channel messages', () => {
    const media = extractChannelMedia(MESSAGES);
    expect(media.images).toHaveLength(1);
    expect(media.images[0]?.name).toBe('arch.png');
    expect(media.files).toHaveLength(1);
    expect(media.files[0]?.name).toBe('spec.pdf');
    expect(media.links).toHaveLength(1);
    expect(media.links[0]?.host).toBe('meet.google.com');
  });

  it('renders members, pinned messages, media gallery, files, and links in right sidebar', () => {
    const onClose = vi.fn();
    const onUnpin = vi.fn().mockResolvedValue(undefined);
    const onChangeSearch = vi.fn();

    render(
      <ChatInfoSidebar
        channel={CHANNEL}
        scopeLabel="Orbit"
        members={MEMBERS}
        messages={MESSAGES}
        pinnedMessages={[MESSAGES[1]!]}
        canManageChannels
        canWriteChat
        searchQuery=""
        onChangeSearch={onChangeSearch}
        onUnpin={onUnpin}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Channel Info')).toBeTruthy();
    expect(screen.getByText('Members (2)')).toBeTruthy();
    expect(screen.getByText('Pinned Messages (1)')).toBeTruthy();
    expect(screen.getByText('Photos & Media (1)')).toBeTruthy();
    expect(screen.getByText('Files (1)')).toBeTruthy();
    expect(screen.getByText('Links (1)')).toBeTruthy();
    expect(screen.getByAltText('arch.png')).toBeTruthy();
    expect(screen.getByText('spec.pdf')).toBeTruthy();
    expect(screen.getByText('meet.google.com')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.change(screen.getByLabelText('Filter channel messages'), { target: { value: 'spec' } });
    expect(onChangeSearch).toHaveBeenCalledWith('spec');

    fireEvent.click(screen.getByLabelText('Close channel info'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
