import type { VoiceSignalRequest } from '../../types/workspace.types';
import type { VoiceRemoteMedia } from './chatVoiceTypes';

export interface LocalVoiceStreams {
  audio: MediaStream | null;
  camera: MediaStream | null;
  screen: MediaStream | null;
}

export interface PeerMediaFlags {
  cameraOn: boolean;
  screenSharing: boolean;
}

export interface PeerEntry {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  media: VoiceRemoteMedia;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/** Reconciles RTCRtpSenders on a peer connection with the active local streams. */
export function syncPeerTracks(pc: RTCPeerConnection, local: LocalVoiceStreams): boolean {
  const desired = new Map<MediaStreamTrack, MediaStream>();
  for (const stream of [local.audio, local.camera, local.screen]) {
    if (!stream) continue;
    for (const track of stream.getTracks()) desired.set(track, stream);
  }
  let changed = false;
  const attached = new Set<MediaStreamTrack>();
  for (const sender of pc.getSenders()) {
    if (sender.track && !desired.has(sender.track)) {
      pc.removeTrack(sender);
      changed = true;
    } else if (sender.track) {
      attached.add(sender.track);
    }
  }
  for (const [track, stream] of desired) {
    if (!attached.has(track)) {
      pc.addTrack(track, stream);
      changed = true;
    }
  }
  return changed;
}

/** Maps an incoming remote track to audio, camera video, or screen stream based on peer state. */
export function applyIncomingTrack(
  media: VoiceRemoteMedia,
  event: RTCTrackEvent,
  flags: PeerMediaFlags | undefined,
  onEnded: () => void
): boolean {
  const stream =
    event.streams[0] ?? (typeof MediaStream !== 'undefined' ? new MediaStream([event.track]) : null);
  if (!stream) return false;

  if (event.track.kind === 'audio') {
    media.audioStream = stream;
  } else if (event.track.kind === 'video') {
    const isScreen =
      Boolean(flags?.screenSharing) &&
      (!flags?.cameraOn || (media.videoStream !== null && media.videoStream.id !== stream.id));
    if (isScreen) media.screenStream = stream;
    else media.videoStream = stream;
  }

  event.track.onended = () => {
    if (media.audioStream === stream) media.audioStream = null;
    if (media.videoStream === stream) media.videoStream = null;
    if (media.screenStream === stream) media.screenStream = null;
    onEnded();
  };
  return true;
}

/** Aligns cached remote media slots when participant flags toggle camera or screen sharing. */
export function reconcileRemoteMedia(media: VoiceRemoteMedia, flags: PeerMediaFlags): boolean {
  let changed = false;
  if (!flags.screenSharing && media.screenStream) {
    media.screenStream = null;
    changed = true;
  }
  if (!flags.cameraOn && media.videoStream) {
    if (flags.screenSharing && !media.screenStream) media.screenStream = media.videoStream;
    media.videoStream = null;
    changed = true;
  }
  return changed;
}

export function createPeerEntry(
  peerId: string,
  localStreams: LocalVoiceStreams,
  hooks: {
    isDestroyed: () => boolean;
    getFlags: () => PeerMediaFlags | undefined;
    sendSignal: (signal: VoiceSignalRequest) => Promise<void> | void;
    onMediaChange: () => void;
  }
): PeerEntry {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const entry: PeerEntry = {
    pc,
    pendingIce: [],
    media: { userId: peerId, audioStream: null, videoStream: null, screenStream: null },
  };
  syncPeerTracks(pc, localStreams);

  pc.onicecandidate = (e) => {
    if (!e.candidate || hooks.isDestroyed()) return;
    void hooks.sendSignal({
      type: 'ICE_CANDIDATE',
      targetUserId: peerId,
      candidate: e.candidate.candidate,
      sdpMid: e.candidate.sdpMid,
      sdpMLineIndex: e.candidate.sdpMLineIndex,
    });
  };

  pc.ontrack = (e) => {
    if (applyIncomingTrack(entry.media, e, hooks.getFlags(), hooks.onMediaChange)) {
      hooks.onMediaChange();
    }
  };
  return entry;
}

export async function flushPendingIce(entry: PeerEntry): Promise<void> {
  while (entry.pendingIce.length > 0) {
    const candidate = entry.pendingIce.shift();
    if (candidate) await entry.pc.addIceCandidate(candidate);
  }
}

export function closePeerEntry(entry: PeerEntry): void {
  entry.pc.onicecandidate = null;
  entry.pc.ontrack = null;
  try {
    entry.pc.close();
  } catch {
    // Ignore already-closed connections.
  }
}
