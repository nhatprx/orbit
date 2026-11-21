import type { VoiceEventDto, VoiceParticipantDto, VoiceSignalRequest } from '../../types/workspace.types';
import type { VoiceRemoteMedia } from './chatVoiceTypes';
import {
  closePeerEntry, createPeerEntry, flushPendingIce, reconcileRemoteMedia, syncPeerTracks,
  type LocalVoiceStreams, type PeerEntry, type PeerMediaFlags,
} from './webrtcPeerTracks';

export type { LocalVoiceStreams };

export interface VoicePeerMeshOptions {
  selfUserId: string;
  sendSignal: (signal: VoiceSignalRequest) => Promise<void> | void;
  onRemoteMediaChange: (media: Record<string, VoiceRemoteMedia>) => void;
}

/** Full-mesh WebRTC peer manager with deterministic offer initiation and safe jsdom fallback. */
export class VoicePeerMesh {
  private destroyed = false;
  private readonly peers = new Map<string, PeerEntry>();
  private readonly meta = new Map<string, PeerMediaFlags>();
  private localStreams: LocalVoiceStreams = { audio: null, camera: null, screen: null };

  constructor(private readonly options: VoicePeerMeshOptions) {}

  private isSupported(): boolean {
    return typeof RTCPeerConnection !== 'undefined';
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  setLocalStreams(streams: LocalVoiceStreams): void {
    this.localStreams = streams;
    if (this.destroyed || !this.isSupported()) return;
    for (const [peerId, entry] of this.peers) {
      if (syncPeerTracks(entry.pc, this.localStreams) && entry.pc.signalingState === 'stable') {
        void this.sendOffer(peerId, entry.pc);
      }
    }
  }

  syncParticipants(participants: VoiceParticipantDto[]): void {
    if (this.destroyed) return;
    const activeIds = new Set<string>();
    let changed = false;

    for (const p of participants) {
      if (p.userId === this.options.selfUserId) continue;
      activeIds.add(p.userId);
      const flags: PeerMediaFlags = { cameraOn: p.cameraOn, screenSharing: p.screenSharing };
      this.meta.set(p.userId, flags);
      const existing = this.peers.get(p.userId);
      if (existing && reconcileRemoteMedia(existing.media, flags)) changed = true;
    }

    for (const peerId of [...this.peers.keys()]) {
      if (!activeIds.has(peerId)) {
        this.removePeer(peerId);
        changed = true;
      }
    }

    if (this.isSupported()) {
      for (const peerId of activeIds) {
        if (!this.peers.has(peerId)) {
          const entry = this.ensurePeer(peerId);
          if (this.options.selfUserId.localeCompare(peerId) < 0) {
            void this.sendOffer(peerId, entry.pc);
          }
        }
      }
    }
    if (changed) this.emitRemoteMedia();
  }

  async handleSignal(event: VoiceEventDto): Promise<void> {
    if (this.destroyed || event.eventType !== 'SIGNAL' || !event.senderId) return;
    if (event.senderId === this.options.selfUserId) return;
    if (event.targetUserId && event.targetUserId !== this.options.selfUserId) return;
    const peerId = event.senderId;

    if (event.signalType === 'SCREEN_SHARE_STOPPED') {
      const entry = this.peers.get(peerId);
      if (entry?.media.screenStream) {
        entry.media.screenStream = null;
        this.emitRemoteMedia();
      }
      return;
    }
    if (!this.isSupported()) return;

    try {
      if (event.signalType === 'OFFER' && event.sdp) {
        await this.applyOffer(peerId, event.sdp);
      } else if (event.signalType === 'ANSWER' && event.sdp) {
        const entry = this.peers.get(peerId);
        if (entry && entry.pc.signalingState === 'have-local-offer') {
          await entry.pc.setRemoteDescription({ type: 'answer', sdp: event.sdp });
          await flushPendingIce(entry);
        }
      } else if (event.signalType === 'ICE_CANDIDATE' && event.candidate) {
        const entry = this.ensurePeer(peerId);
        const init: RTCIceCandidateInit = {
          candidate: event.candidate,
          sdpMid: event.sdpMid ?? undefined,
          sdpMLineIndex: event.sdpMLineIndex ?? undefined,
        };
        if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(init);
        else entry.pendingIce.push(init);
      }
    } catch {
      // Ignore transient signaling race errors while peers reconnect.
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const peerId of [...this.peers.keys()]) this.removePeer(peerId);
    this.meta.clear();
    this.options.onRemoteMediaChange({});
  }

  private async applyOffer(peerId: string, sdp: string): Promise<void> {
    const entry = this.ensurePeer(peerId);
    if (entry.pc.signalingState !== 'stable') {
      if (this.options.selfUserId.localeCompare(peerId) < 0) return;
      await entry.pc.setLocalDescription({ type: 'rollback' });
    }
    await entry.pc.setRemoteDescription({ type: 'offer', sdp });
    await flushPendingIce(entry);
    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);
    await this.options.sendSignal({ type: 'ANSWER', targetUserId: peerId, sdp: answer.sdp ?? '' });
  }

  private ensurePeer(peerId: string): PeerEntry {
    const existing = this.peers.get(peerId);
    if (existing) return existing;
    const entry = createPeerEntry(peerId, this.localStreams, {
      isDestroyed: () => this.destroyed,
      getFlags: () => this.meta.get(peerId),
      sendSignal: (sig) => this.options.sendSignal(sig),
      onMediaChange: () => this.emitRemoteMedia(),
    });
    this.peers.set(peerId, entry);
    return entry;
  }

  private async sendOffer(peerId: string, pc: RTCPeerConnection): Promise<void> {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.options.sendSignal({ type: 'OFFER', targetUserId: peerId, sdp: offer.sdp ?? '' });
    } catch {
      // Peer may have disconnected mid-negotiation.
    }
  }

  private removePeer(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    closePeerEntry(entry);
    this.peers.delete(peerId);
    this.meta.delete(peerId);
  }

  private emitRemoteMedia(): void {
    const snapshot: Record<string, VoiceRemoteMedia> = {};
    for (const [peerId, entry] of this.peers) snapshot[peerId] = { ...entry.media };
    this.options.onRemoteMediaChange(snapshot);
  }
}
