import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessageDto } from '../../types/workspace.types';
import { MAX_MESSAGE_LENGTH, checkDraft, mergeMessage, mergeOlder, removeMessage } from './chatMessages';
import {
  MockRTCPeerConnection, createDeferred, makeChannel, makeFakeStream, makeMessage,
  makeParticipant, makeSignalEvent,
} from './chatTestMocks';
import {
  requestCameraStream, requestMicrophoneStream, requestScreenShareStream,
  startVoiceActivityMonitor, stopMediaStream,
} from './mediaStreams';
import { useChatChannel } from './useChatChannel';
import { useChatChannels } from './useChatChannels';
import { useVoiceSession } from './useVoiceSession';
import { VoicePeerMesh } from './webrtcMesh';

const mockService = vi.hoisted(() => ({
  listWorkspaceChannels: vi.fn(), listProjectChannels: vi.fn(), createWorkspaceChannel: vi.fn(),
  createProjectChannel: vi.fn(), updateChannel: vi.fn(), deleteChannel: vi.fn(), listMessages: vi.fn(),
  sendMessage: vi.fn(), deleteMessage: vi.fn(), subscribeChannel: vi.fn(), listVoiceParticipants: vi.fn(),
  joinVoiceChannel: vi.fn(), updateVoiceState: vi.fn(), leaveVoiceChannel: vi.fn(),
  sendVoiceSignal: vi.fn(), subscribeVoice: vi.fn(),
}));
vi.mock('../../services/workspace/services', () => ({ chatService: mockService }));

const ME = { id: 'user-a', username: 'alice', displayName: 'Alice' };
const VOICE_CHANNELS = [makeChannel('t1', 'TEXT', 'general'), makeChannel('v1', 'VOICE', 'lounge'), makeChannel('v2', 'VOICE', 'war-room')];
const origMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const origRtc = globalThis.RTCPeerConnection;
const setMediaDevices = (value: unknown) => Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });

beforeEach(() => {
  vi.clearAllMocks();
  MockRTCPeerConnection.instances = [];
  mockService.subscribeChannel.mockReturnValue(() => {});
  mockService.subscribeVoice.mockReturnValue(() => {});
  mockService.listVoiceParticipants.mockResolvedValue([]);
  mockService.sendVoiceSignal.mockResolvedValue(undefined);
});

afterEach(() => {
  if (origMediaDevices) Object.defineProperty(navigator, 'mediaDevices', origMediaDevices);
  globalThis.RTCPeerConnection = origRtc;
});

describe('chatMessages and mediaStreams', () => {
  it('merges, prepends, deletes messages and validates drafts', () => {
    const [m1, m2, m3] = [makeMessage('m1', 't1'), makeMessage('m2', 't2'), makeMessage('m3', 't3')];
    const merged = mergeMessage([m1!, m3!], m2!);
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(mergeMessage(merged, m2!)).toBe(merged);
    expect(mergeOlder([m3!], [m1!, m3!]).map((m) => m.id)).toEqual(['m1', 'm3']);
    expect(removeMessage(merged, 'm2').map((m) => m.id)).toEqual(['m1', 'm3']);
    expect(removeMessage(merged, 'missing')).toBe(merged);
    expect([checkDraft('  ').ok, checkDraft(' hi '), checkDraft('a'.repeat(MAX_MESSAGE_LENGTH + 1)).ok]).toEqual([false, { ok: true, content: 'hi' }, false]);
  });

  it('handles missing or denied mediaDevices gracefully and stops tracks safely', async () => {
    setMediaDevices(undefined);
    expect((await requestMicrophoneStream()).stream).toBeNull();
    expect((await requestCameraStream()).error).toContain('not supported');
    expect((await requestScreenShareStream()).error).toContain('not supported');
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    setMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(denied), getDisplayMedia: vi.fn().mockRejectedValue(denied) });
    expect((await requestMicrophoneStream()).error).toContain('denied');
    expect((await requestScreenShareStream()).error).toContain('cancelled or blocked');
    const { stream, track } = makeFakeStream('audio');
    startVoiceActivityMonitor(stream, vi.fn())();
    stopMediaStream(stream);
    stopMediaStream(null);
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});

describe('VoicePeerMesh', () => {
  it('no-ops safely when RTCPeerConnection is unavailable', async () => {
    globalThis.RTCPeerConnection = undefined as unknown as typeof RTCPeerConnection;
    const onChange = vi.fn();
    const mesh = new VoicePeerMesh({ selfUserId: 'user-a', sendSignal: vi.fn(), onRemoteMediaChange: onChange });
    mesh.syncParticipants([makeParticipant('user-a'), makeParticipant('user-b')]);
    mesh.setLocalStreams({ audio: null, camera: null, screen: null });
    await mesh.handleSignal(makeSignalEvent('user-b', 'user-a', 'OFFER', 'v=0'));
    expect(mesh.getPeerCount()).toBe(0);
    mesh.destroy();
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('initiates offers deterministically, answers offers, renegotiates, and closes on destroy', async () => {
    globalThis.RTCPeerConnection = MockRTCPeerConnection as unknown as typeof RTCPeerConnection;
    const sendSignal = vi.fn();
    const mesh = new VoicePeerMesh({ selfUserId: 'user-b', sendSignal, onRemoteMediaChange: vi.fn() });
    mesh.syncParticipants([makeParticipant('user-a'), makeParticipant('user-b'), makeParticipant('user-c')]);
    await waitFor(() => expect(sendSignal).toHaveBeenCalledWith({ type: 'OFFER', targetUserId: 'user-c', sdp: 'v=0-offer' }));
    expect(sendSignal).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'OFFER', targetUserId: 'user-a' }));
    await mesh.handleSignal(makeSignalEvent('user-a', 'user-b', 'OFFER', 'remote-offer'));
    expect(sendSignal).toHaveBeenCalledWith({ type: 'ANSWER', targetUserId: 'user-a', sdp: 'v=0-answer' });
    mesh.setLocalStreams({ audio: makeFakeStream('audio').stream, camera: null, screen: null });
    mesh.destroy();
    expect(MockRTCPeerConnection.instances.every((pc) => pc.closed)).toBe(true);
  });
});

describe('useChatChannels and useChatChannel', () => {
  it('loads, mutates channels and handles messages send/live/delete', async () => {
    const [ch1, ch2] = [makeChannel('ch-1', 'TEXT', 'general'), makeChannel('ch-2', 'VOICE', 'lounge')];
    mockService.listWorkspaceChannels.mockResolvedValue([ch1]);
    mockService.createWorkspaceChannel.mockResolvedValue(ch2);
    mockService.updateChannel.mockResolvedValue({ ...ch2, name: 'standup' });
    mockService.deleteChannel.mockResolvedValue(undefined);
    const { result } = renderHook(() => useChatChannels('ws-1', null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.createChannel({ name: 'lounge', channelType: 'VOICE' }); });
    await act(async () => { await result.current.updateChannel('ch-2', { name: 'standup' }); });
    expect(result.current.channels[1]?.name).toBe('standup');
    await act(async () => { await result.current.deleteChannel('ch-2'); });
    expect(result.current.channels).toHaveLength(1);

    let onLive: ((m: ChatMessageDto) => void) | null = null;
    mockService.subscribeChannel.mockImplementation((_id, cb) => { onLive = cb; return () => {}; });
    mockService.listMessages.mockResolvedValue({ items: [makeMessage('m1', 't1')], nextCursor: null, hasMore: false, limit: 50 });
    mockService.sendMessage.mockResolvedValue(makeMessage('m2', 't2', 'reply'));
    mockService.deleteMessage.mockResolvedValue(undefined);
    const msgHook = renderHook(() => useChatChannel('ch-1'));
    await waitFor(() => expect(msgHook.result.current.loading).toBe(false));
    await act(async () => { await msgHook.result.current.send({ content: 'reply', replyToId: 'm1' }); });
    act(() => { onLive?.(makeMessage('m3', 't3', 'live')); });
    await act(async () => { await msgHook.result.current.deleteMessage('m2'); });
    expect(msgHook.result.current.messages.map((m) => m.id)).toEqual(['m1', 'm3']);
  });
});

describe('useVoiceSession', () => {
  it('handles join, mute, deafen-mutes-mic, screen share track ended, switch, and leave', async () => {
    const [mic, cam, screen] = [makeFakeStream('audio', 'mic'), makeFakeStream('video', 'cam'), makeFakeStream('video', 'scr')];
    setMediaDevices({
      getUserMedia: vi.fn().mockImplementation(async (c: MediaStreamConstraints) => (c.video ? cam.stream : mic.stream)),
      getDisplayMedia: vi.fn().mockResolvedValue(screen.stream),
    });
    mockService.joinVoiceChannel.mockImplementation(async (_id, st) => [makeParticipant(ME.id, st)]);
    mockService.updateVoiceState.mockImplementation(async (_id, st) => [makeParticipant(ME.id, st)]);
    mockService.leaveVoiceChannel.mockResolvedValue([]);

    const { result, unmount } = renderHook(() => useVoiceSession(VOICE_CHANNELS, ME));
    await waitFor(() => expect(mockService.subscribeVoice).toHaveBeenCalledTimes(2));
    await act(async () => { await result.current.joinChannel('v1'); await result.current.toggleMute(); });
    expect(result.current.muted).toBe(true);
    await act(async () => { await result.current.toggleMute(); await result.current.toggleDeafen(); });
    expect([result.current.deafened, result.current.muted, mic.track.enabled]).toEqual([true, true, false]);
    await act(async () => { await result.current.toggleDeafen(); await result.current.toggleCamera(); await result.current.toggleScreenShare(); });
    expect([result.current.cameraOn, result.current.screenSharing]).toEqual([true, true]);
    await act(async () => { screen.track.onended?.(); });
    await waitFor(() => expect(result.current.screenSharing).toBe(false));
    await act(async () => { await result.current.joinChannel('v2'); });
    expect(mockService.leaveVoiceChannel).toHaveBeenCalledWith('v1');
    await act(async () => { await result.current.leaveChannel(); });
    expect([result.current.activeChannelId, mic.track.stop.mock.calls.length > 0, cam.track.stop.mock.calls.length > 0]).toEqual([null, true, true]);
    unmount();
  });

  it('guards camera/screen capture when disconnected and cleans up streams on failed room switch', async () => {
    const [mic, cam, screen] = [makeFakeStream('audio', 'mic2'), makeFakeStream('video', 'cam2'), makeFakeStream('video', 'scr2')];
    const pendingScreen = createDeferred<MediaStream>();
    const getUserMedia = vi.fn().mockImplementation(async (c: MediaStreamConstraints) => (c.video ? cam.stream : mic.stream));
    const getDisplayMedia = vi.fn().mockReturnValue(pendingScreen.promise);
    setMediaDevices({ getUserMedia, getDisplayMedia });
    mockService.joinVoiceChannel.mockResolvedValueOnce([makeParticipant(ME.id)]).mockRejectedValueOnce(new Error('room full'));
    mockService.updateVoiceState.mockResolvedValue([makeParticipant(ME.id)]);
    mockService.leaveVoiceChannel.mockResolvedValue([]);

    const { result } = renderHook(() => useVoiceSession(VOICE_CHANNELS, ME));
    await act(async () => { await result.current.toggleCamera(); await result.current.toggleScreenShare(); });
    expect([getUserMedia.mock.calls.length, getDisplayMedia.mock.calls.length]).toEqual([0, 0]);

    await act(async () => { await result.current.joinChannel('v1'); await result.current.toggleCamera(); });
    const shareTask = result.current.toggleScreenShare();
    await act(async () => { await result.current.leaveChannel(); pendingScreen.resolve(screen.stream); await shareTask; });
    expect([screen.track.stop.mock.calls.length, result.current.screenSharing]).toEqual([1, false]);

    mockService.joinVoiceChannel.mockReset().mockResolvedValueOnce([makeParticipant(ME.id)]).mockRejectedValueOnce(new Error('switch failed'));
    const [mic3, cam3] = [makeFakeStream('audio', 'mic3'), makeFakeStream('video', 'cam3')];
    getUserMedia.mockImplementation(async (c: MediaStreamConstraints) => (c.video ? cam3.stream : mic3.stream));
    await act(async () => { await result.current.joinChannel('v1'); await result.current.toggleCamera(); await result.current.joinChannel('v2'); });
    expect([result.current.activeChannelId, result.current.cameraOn, result.current.localCameraStream]).toEqual([null, false, null]);
    expect([mic3.track.stop.mock.calls.length, cam3.track.stop.mock.calls.length]).toEqual([1, 1]);
  });
});
