import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MemberDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatImageLightbox } from './ChatImageLightbox';
import { applyMention, filterMentionCandidates, findActiveMention } from './ChatMentionMenu';
import { ChatMessageRow } from './ChatMessageRow';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const MEMBERS: MemberDto[] = [
  {
    userId: 'u-1',
    username: 'nhatprx',
    displayName: 'Minh Nhat',
    email: 'nhat@orbit.dev',
    roleId: 'r-1',
    roleName: 'Owner',
    isOwner: true,
    joinedAt: '2026-11-20T00:00:00Z',
  },
  {
    userId: 'u-2',
    username: 'duynn',
    displayName: 'Duy Nguyen',
    email: 'duy@orbit.dev',
    roleId: 'r-2',
    roleName: 'Member',
    isOwner: false,
    joinedAt: '2026-11-20T00:00:00Z',
  },
];

describe('@mention helpers & composer autocomplete', () => {
  it('detects active @mention query, filters @all and members, and inserts handle', () => {
    expect(findActiveMention('hello @du', 9)).toEqual({ start: 6, query: 'du' });
    expect(findActiveMention('email@test.com', 14)).toBeNull();

    const allMatches = filterMentionCandidates(MEMBERS, '');
    expect(allMatches[0]?.handle).toBe('all');
    expect(allMatches[1]?.handle).toBe('ai');
    expect(allMatches).toHaveLength(4);

    const duyMatches = filterMentionCandidates(MEMBERS, 'duy');
    expect(duyMatches.map((m) => m.handle)).toEqual(['duynn']);

    expect(applyMention('hi @du', 3, 6, 'duynn')).toEqual({ next: 'hi @duynn ', nextCursor: 10 });
  });

  it('opens mention menu on @ in ChatComposer and inserts @all via keyboard Enter', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatComposer
        channelId="ch-1"
        mentionMembers={MEMBERS}
        placeholder="Message #general"
        onSend={onSend}
      />
    );

    const input = screen.getByLabelText('Message') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '@', selectionStart: 1 } });

    expect(screen.getByRole('listbox', { name: 'Mention suggestions' })).toBeTruthy();
    expect(screen.getByText('@all')).toBeTruthy();
    expect(screen.getByText('Duy Nguyen')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('@all ');
  });

  it('uploads an image file and sends an image-only message', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: 'uploads/chat/ch-1/demo.png',
            uploadUrl: 'https://s3.example/put',
            attachmentUrl: '/api/v1/chat/images?key=uploads/chat/ch-1/demo.png',
            method: 'PUT',
            contentType: 'image/png',
            expiresAt: '2099-01-01T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<ChatComposer channelId="ch-1" placeholder="Message #general" onSend={onSend} />);
    const fileInput = screen.getByLabelText('Upload image') as HTMLInputElement;
    const png = new File(['abc'], 'demo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [png] } });

    expect(screen.getByAltText('demo.png')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith({
        content: '',
        replyToId: null,
        attachmentName: 'demo.png',
        attachmentUrl: '/api/v1/chat/images?key=uploads/chat/ch-1/demo.png',
      });
    });
  });

  it('renders inline image attachments and @all highlight in ChatMessageRow', () => {
    const onPreviewImage = vi.fn();
    render(
      <ChatMessageRow
        message={{
          id: 'm-img',
          channelId: 'ch-1',
          senderId: 'u-2',
          senderName: 'Duy Nguyen',
          senderUsername: 'duynn',
          content: '@all check this out',
          attachmentName: 'screen.png',
          attachmentUrl: 'https://s3.example/screen.png',
          createdAt: '2026-11-22T08:00:00Z',
        }}
        mine={false}
        canDelete={false}
        canWriteChat
        onReply={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onToggleReaction={vi.fn().mockResolvedValue(undefined)}
        onPreviewImage={onPreviewImage}
      />
    );

    expect(screen.getByText('@all')).toBeTruthy();
    const img = screen.getByAltText('screen.png') as HTMLImageElement;
    expect(img.src).toBe('https://s3.example/screen.png');
    fireEvent.click(screen.getByRole('button', { name: 'Preview image: screen.png' }));
    expect(onPreviewImage).toHaveBeenCalledWith({
      url: 'https://s3.example/screen.png',
      name: 'screen.png',
    });
  });

  it('opens in-page lightbox with zoom controls and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ChatImageLightbox
        image={{ url: 'https://s3.example/screen.png', name: 'screen.png' }}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Image preview: screen.png' })).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
