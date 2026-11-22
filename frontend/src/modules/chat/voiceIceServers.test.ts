import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatConnection, httpChatService } from '../../services/workspace/httpChat.service';
import type { ChatMessageDeletedEvent, ChatMessageDto } from '../../types/workspace.types';
import { MockRTCPeerConnection, makeMessage, makeParticipant } from './chatTestMocks';
import { useChatChannel } from './useChatChannel';
import {
  DEFAULT_VOICE_ICE_SERVERS,
  loadVoiceIceServers,
  normalizeIceServers,
  parseEnvIceServers,
} from './voiceIceServers';
import { VoicePeerMesh } from './webrtcMesh';

const mockService = vi.hoisted(() => ({
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
  subscribeChannel: vi.fn(),
  getVoiceIceServers: vi.fn(),
}));

vi.mock('../../services/workspace/services', () => ({ chatService: mockService }));

const origRtc = globalThis.RTCPeerConnection;

beforeEach(() => {
  vi.clearAllMocks();
  MockRTCPeerConnection.instances = [];
});

afterEach(() => {
  globalThis.RTCPeerConnection = origRtc;
});

describe('voiceIceServers and WebRTC ICE config', () => {
  it('loads ICE/TURN servers from API and passes them to RTCPeerConnection', async () => {
    const apiServers = [
      { urls: ['stun:stun.orbit.dev:19302'] },
      { urls: ['turn:turn.orbit.dev:3478'], username: 'orbit', credential: 'secret' },
    ];
    mockService.getVoiceIceServers.mockResolvedValue(apiServers);

    const loaded = await loadVoiceIceServers();
    expect(loaded).toEqual(apiServers);

    globalThis.RTCPeerConnection = MockRTCPeerConnection as unknown as typeof RTCPeerConnection;
    const mesh = new VoicePeerMesh({
      selfUserId: 'user-a',
      iceServers: loaded,
      sendSignal: vi.fn(),
      onRemoteMediaChange: vi.fn(),
    });
    mesh.syncParticipants([makeParticipant('user-a'), makeParticipant('user-b')]);
    expect(MockRTCPeerConnection.instances[0]?.config?.iceServers).toEqual(apiServers);
    mesh.destroy();
  });

  it('falls back to VITE_VOICE_ICE_SERVERS (JSON or CSV) and then default STUN on API failure', async () => {
    mockService.getVoiceIceServers.mockRejectedValue(new Error('network error'));

    const fromJson = await loadVoiceIceServers(
      undefined,
      JSON.stringify([{ urls: 'turn:env.orbit.dev:3478', username: 'u', credential: 'p' }])
    );
    expect(fromJson).toEqual([{ urls: ['turn:env.orbit.dev:3478'], username: 'u', credential: 'p' }]);

    const fromCsv = await loadVoiceIceServers(
      undefined,
      'stun:a.orbit.dev:19302, http://ignored, turns:b.orbit.dev:5349'
    );
    expect(fromCsv).toEqual([{ urls: ['stun:a.orbit.dev:19302'] }, { urls: ['turns:b.orbit.dev:5349'] }]);

    expect(parseEnvIceServers('[bad-json')).toEqual(DEFAULT_VOICE_ICE_SERVERS);
    expect(parseEnvIceServers('')).toEqual(DEFAULT_VOICE_ICE_SERVERS);
    expect(normalizeIceServers([{ urls: ['javascript:bad'] }])).toEqual([]);
  });
});

describe('useChatChannel realtime MESSAGE_DELETED handling', () => {
  it('removes messages immediately when MESSAGE_DELETED arrives over STOMP', async () => {
    let onMessage: ((m: ChatMessageDto) => void) | null = null;
    let onDeleted: ((ev: ChatMessageDeletedEvent) => void) | null = null;
    mockService.subscribeChannel.mockImplementation((_id, msgCb, delCb) => {
      onMessage = msgCb;
      onDeleted = delCb;
      return () => {};
    });
    mockService.listMessages.mockResolvedValue({
      items: [makeMessage('m-1', '2026-11-21T08:00:00Z'), makeMessage('m-2', '2026-11-21T08:01:00Z')],
      nextCursor: null,
      hasMore: false,
      limit: 50,
    });

    const { result } = renderHook(() => useChatChannel('ch-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages.map((m) => m.id)).toEqual(['m-1', 'm-2']);

    act(() => {
      onMessage?.(makeMessage('m-3', '2026-11-21T08:02:00Z'));
    });
    expect(result.current.messages.map((m) => m.id)).toEqual(['m-1', 'm-2', 'm-3']);

    // Deletion for another channel is ignored.
    act(() => {
      onDeleted?.({ eventType: 'MESSAGE_DELETED', channelId: 'ch-other', messageId: 'm-2' });
    });
    expect(result.current.messages.map((m) => m.id)).toEqual(['m-1', 'm-2', 'm-3']);

    // Deletion for this channel soft-deletes the message in place for tombstone rendering.
    act(() => {
      onDeleted?.({ eventType: 'MESSAGE_DELETED', channelId: 'ch-1', messageId: 'm-2', deletedAt: '2026-11-21T08:05:00Z' });
    });
    expect(result.current.messages.map((m) => m.id)).toEqual(['m-1', 'm-2', 'm-3']);
    const deleted = result.current.messages.find((m) => m.id === 'm-2');
    expect(deleted?.deletedAt).toBe('2026-11-21T08:05:00Z');
    expect(deleted?.content).toBe('');
  });

  it('httpChatService.subscribeChannel dispatches MESSAGE_DELETED and regular messages cleanly', () => {
    const handlers: Array<(frame: { command: string; headers: Record<string, string>; body: string }) => void> = [];
    const subSpy = vi.spyOn(chatConnection, 'subscribe').mockImplementation((_dest, cb) => {
      handlers.push(cb);
      return () => {};
    });
    const onMessage = vi.fn();
    const onDeleted = vi.fn();
    httpChatService.subscribeChannel('ch-1', onMessage, onDeleted);
    const dispatch = handlers[0];
    expect(dispatch).toBeDefined();

    dispatch!({
      command: 'MESSAGE',
      headers: {},
      body: JSON.stringify({ eventType: 'MESSAGE_DELETED', channelId: 'ch-1', messageId: 'm-9' }),
    });
    expect(onDeleted).toHaveBeenCalledWith({
      eventType: 'MESSAGE_DELETED',
      channelId: 'ch-1',
      messageId: 'm-9',
      deletedAt: undefined,
    });
    expect(onMessage).not.toHaveBeenCalled();

    const msg = makeMessage('m-10', '2026-11-21T09:00:00Z');
    dispatch!({ command: 'MESSAGE', headers: {}, body: JSON.stringify(msg) });
    expect(onMessage).toHaveBeenCalledWith(msg);

    dispatch!({ command: 'MESSAGE', headers: {}, body: 'not-json' });
    subSpy.mockRestore();
  });
});
