import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { chatService } from '../../services/workspace/services';
import type { VoiceParticipantDto, VoiceStateRequest } from '../../types/workspace.types';
import {
  onPrimaryVideoTrackEnded, requestCameraStream, requestMicrophoneStream,
  requestScreenShareStream, setStreamAudioEnabled, startVoiceActivityMonitor, stopMediaStream,
} from './mediaStreams';
import type { VoicePeerMesh } from './webrtcMesh';

export const INITIAL_VOICE_CONTROLS: VoiceStateRequest = {
  muted: false, deafened: false, cameraOn: false, screenSharing: false, speaking: false,
};

interface MediaControlDeps {
  activeIdRef: MutableRefObject<string | null>;
  meshRef: MutableRefObject<VoicePeerMesh | null>;
  setMediaNotice: (notice: string | null) => void;
  onParticipantsUpdated: (channelId: string, list: VoiceParticipantDto[]) => void;
}

/** Manages local mic/camera/screen streams, VAD speaking detection, and voice toggle controls. */
export function useVoiceMediaControls(deps: MediaControlDeps) {
  const { activeIdRef, meshRef, setMediaNotice, onParticipantsUpdated } = deps;
  const [controls, setControls] = useState<VoiceStateRequest>(INITIAL_VOICE_CONTROLS);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  const controlsRef = useRef<VoiceStateRequest>(INITIAL_VOICE_CONTROLS);
  const mutedBeforeDeafenRef = useRef(false);
  const streamsRef = useRef<{ mic: MediaStream | null; camera: MediaStream | null; screen: MediaStream | null }>({
    mic: null, camera: null, screen: null,
  });
  const vadStopRef = useRef<(() => void) | null>(null);

  const syncMeshStreams = useCallback(() => {
    const { mic, camera, screen } = streamsRef.current;
    meshRef.current?.setLocalStreams({ audio: mic, camera, screen });
  }, [meshRef]);

  const applyControls = useCallback((next: VoiceStateRequest) => {
    controlsRef.current = next;
    setControls(next);
  }, []);

  const pushState = useCallback(async (patch: Partial<VoiceStateRequest>) => {
    const next: VoiceStateRequest = { ...controlsRef.current, ...patch };
    if (next.deafened) {
      next.muted = true;
      next.speaking = false;
    }
    applyControls(next);
    const chId = activeIdRef.current;
    if (!chId) return;
    try {
      const updated = await chatService.updateVoiceState(chId, next);
      onParticipantsUpdated(chId, updated);
      meshRef.current?.syncParticipants(updated);
    } catch {
      // Keep local controls responsive if a transient network error occurs.
    }
  }, [activeIdRef, applyControls, meshRef, onParticipantsUpdated]);

  const startVad = useCallback(() => {
    vadStopRef.current?.();
    vadStopRef.current = startVoiceActivityMonitor(streamsRef.current.mic, (isSpeaking) => {
      const allowed = isSpeaking && !controlsRef.current.muted && !controlsRef.current.deafened;
      if (allowed !== controlsRef.current.speaking) void pushState({ speaking: allowed });
    });
  }, [pushState]);

  const ensureMicForJoin = useCallback(async (): Promise<VoiceStateRequest> => {
    let nextMuted = controlsRef.current.muted || controlsRef.current.deafened;
    if (!streamsRef.current.mic) {
      const mic = await requestMicrophoneStream();
      if (mic.stream) {
        streamsRef.current.mic = mic.stream;
        setStreamAudioEnabled(mic.stream, !nextMuted);
      } else {
        nextMuted = true;
        setMediaNotice(`${mic.error} Joined in listen-only mode.`);
      }
    }
    return { ...controlsRef.current, muted: nextMuted, speaking: false };
  }, [setMediaNotice]);

  const teardownMedia = useCallback(() => {
    vadStopRef.current?.();
    vadStopRef.current = null;
    stopMediaStream(streamsRef.current.mic);
    stopMediaStream(streamsRef.current.camera);
    stopMediaStream(streamsRef.current.screen);
    streamsRef.current = { mic: null, camera: null, screen: null };
  }, []);

  const resetAll = useCallback(() => {
    applyControls(INITIAL_VOICE_CONTROLS);
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    teardownMedia();
  }, [applyControls, teardownMedia]);

  const stopScreenShare = useCallback(async () => {
    stopMediaStream(streamsRef.current.screen);
    streamsRef.current.screen = null;
    setLocalScreenStream(null);
    syncMeshStreams();
    const chId = activeIdRef.current;
    if (chId) void chatService.sendVoiceSignal(chId, { type: 'SCREEN_SHARE_STOPPED' }).catch(() => {});
    await pushState({ screenSharing: false });
  }, [activeIdRef, pushState, syncMeshStreams]);

  const toggleMute = useCallback(async () => {
    const wantMuted = !controlsRef.current.muted;
    if (!wantMuted && !streamsRef.current.mic) {
      const mic = await requestMicrophoneStream();
      if (!mic.stream) { setMediaNotice(mic.error); return; }
      if (!activeIdRef.current) { stopMediaStream(mic.stream); return; }
      streamsRef.current.mic = mic.stream;
      syncMeshStreams();
      startVad();
    }
    setStreamAudioEnabled(streamsRef.current.mic, !wantMuted);
    await pushState({
      muted: wantMuted,
      deafened: wantMuted ? controlsRef.current.deafened : false,
      speaking: wantMuted ? false : controlsRef.current.speaking,
    });
  }, [pushState, setMediaNotice, startVad, syncMeshStreams]);

  const toggleDeafen = useCallback(async () => {
    const wantDeafened = !controlsRef.current.deafened;
    if (wantDeafened) {
      mutedBeforeDeafenRef.current = controlsRef.current.muted;
      setStreamAudioEnabled(streamsRef.current.mic, false);
      await pushState({ deafened: true, muted: true, speaking: false });
      return;
    }
    const restoredMuted = streamsRef.current.mic ? mutedBeforeDeafenRef.current : true;
    setStreamAudioEnabled(streamsRef.current.mic, !restoredMuted);
    await pushState({ deafened: false, muted: restoredMuted });
  }, [pushState]);

  const stopCamera = useCallback(async () => {
    stopMediaStream(streamsRef.current.camera);
    streamsRef.current.camera = null;
    setLocalCameraStream(null);
    syncMeshStreams();
    await pushState({ cameraOn: false });
  }, [pushState, syncMeshStreams]);

  const toggleCamera = useCallback(async () => {
    if (controlsRef.current.cameraOn) { await stopCamera(); return; }
    if (!activeIdRef.current) return;
    const res = await requestCameraStream();
    if (!res.stream) { setMediaNotice(res.error); return; }
    if (!activeIdRef.current) { stopMediaStream(res.stream); return; }
    streamsRef.current.camera = res.stream;
    setLocalCameraStream(res.stream);
    onPrimaryVideoTrackEnded(res.stream, () => {
      if (streamsRef.current.camera === res.stream) void stopCamera();
    });
    syncMeshStreams();
    await pushState({ cameraOn: true });
  }, [activeIdRef, pushState, setMediaNotice, stopCamera, syncMeshStreams]);

  const toggleScreenShare = useCallback(async () => {
    if (controlsRef.current.screenSharing) { await stopScreenShare(); return; }
    if (!activeIdRef.current) return;
    const res = await requestScreenShareStream();
    if (!res.stream) { setMediaNotice(res.error); return; }
    if (!activeIdRef.current) { stopMediaStream(res.stream); return; }
    streamsRef.current.screen = res.stream;
    setLocalScreenStream(res.stream);
    onPrimaryVideoTrackEnded(res.stream, () => {
      if (streamsRef.current.screen === res.stream) void stopScreenShare();
    });
    syncMeshStreams();
    const chId = activeIdRef.current;
    if (chId) void chatService.sendVoiceSignal(chId, { type: 'SCREEN_SHARE_STARTED' }).catch(() => {});
    await pushState({ screenSharing: true });
  }, [activeIdRef, pushState, setMediaNotice, stopScreenShare, syncMeshStreams]);

  return {
    controls, localCameraStream, localScreenStream, applyControls, syncMeshStreams,
    ensureMicForJoin, startVad, teardownMedia, resetAll,
    toggleMute, toggleDeafen, toggleCamera, toggleScreenShare,
  };
}
