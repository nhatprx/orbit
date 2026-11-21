import { vi } from 'vitest';
import type {
  ChatChannelDto,
  ChatMessageDto,
  VoiceEventDto,
  VoiceParticipantDto,
  VoiceSignalType,
} from '../../types/workspace.types';

export interface FakeTrack {
  kind: 'audio' | 'video';
  id: string;
  enabled: boolean;
  readyState: 'live' | 'ended';
  onended: (() => void) | null;
  stop: ReturnType<typeof vi.fn>;
}

export function makeChannel(
  id: string,
  channelType: 'TEXT' | 'VOICE' = 'TEXT',
  name = id
): ChatChannelDto {
  return {
    id,
    scopeType: 'WORKSPACE',
    scopeId: 'ws-1',
    name,
    description: `${name} desc`,
    channelType,
    category: channelType === 'VOICE' ? 'VOICE CHANNELS' : 'TEXT CHANNELS',
    participantCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

export function makeMessage(id: string, createdAt: string, content = id): ChatMessageDto {
  return {
    id,
    channelId: 'ch-1',
    senderId: 'u-1',
    senderName: 'Alice',
    senderUsername: 'alice',
    content,
    createdAt,
  };
}

export function makeParticipant(
  userId: string,
  overrides: Partial<VoiceParticipantDto> = {}
): VoiceParticipantDto {
  return {
    userId,
    username: userId,
    displayName: userId.toUpperCase(),
    muted: false,
    deafened: false,
    cameraOn: false,
    screenSharing: false,
    speaking: false,
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeFakeStream(kind: 'audio' | 'video', id = `${kind}-1`) {
  const track: FakeTrack = {
    kind,
    id: `track-${id}`,
    enabled: true,
    readyState: 'live',
    onended: null,
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
  };
  const stream = {
    id,
    getTracks: () => [track],
    getAudioTracks: () => (kind === 'audio' ? [track] : []),
    getVideoTracks: () => (kind === 'video' ? [track] : []),
  } as unknown as MediaStream;
  return { stream, track };
}

export function makeSignalEvent(
  senderId: string,
  targetUserId: string | null,
  signalType: VoiceSignalType,
  sdp: string | null = null
): VoiceEventDto {
  return {
    eventType: 'SIGNAL',
    channelId: 'v1',
    senderId,
    senderName: senderId,
    senderUsername: senderId,
    targetUserId,
    signalType,
    sdp,
    candidate: null,
    sdpMid: null,
    sdpMLineIndex: null,
    participants: null,
    timestamp: '2026-01-01T00:00:00Z',
  };
}

export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

export class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];
  signalingState: RTCSignalingState = 'stable';
  remoteDescription: RTCSessionDescription | null = null;
  localDescription: RTCSessionDescription | null = null;
  onicecandidate: ((e: { candidate: RTCIceCandidate | null }) => void) | null = null;
  ontrack: ((e: RTCTrackEvent) => void) | null = null;
  closed = false;
  senders: Array<{ track: MediaStreamTrack | null }> = [];
  iceCandidates: RTCIceCandidateInit[] = [];

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }
  getSenders() {
    return this.senders;
  }
  addTrack(track: MediaStreamTrack) {
    const sender = { track };
    this.senders.push(sender);
    return sender;
  }
  removeTrack(sender: { track: MediaStreamTrack | null }) {
    this.senders = this.senders.filter((s) => s !== sender);
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: 'v=0-offer' };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: 'v=0-answer' };
  }
  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = desc as RTCSessionDescription;
    this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
  }
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    this.remoteDescription = desc as RTCSessionDescription;
    this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable';
  }
  async addIceCandidate(init: RTCIceCandidateInit) {
    this.iceCandidates.push(init);
  }
  close() {
    this.closed = true;
  }
}
