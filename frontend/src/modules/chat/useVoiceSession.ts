import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { chatService } from '../../services/workspace/services';
import type { ChatChannelDto } from '../../types/workspace.types';
import type { VoiceCurrentUser, VoiceRemoteMedia, VoiceSessionState } from './chatVoiceTypes';
import { useVoiceMediaControls } from './useVoiceMediaControls';
import { useVoicePresence } from './useVoicePresence';
import { loadVoiceIceServers } from './voiceIceServers';
import { VoicePeerMesh } from './webrtcMesh';

/** Coordinates voice presence, WebRTC mesh peers, and local media controls across voice channels. */
export function useVoiceSession(
  channels: ChatChannelDto[],
  currentUser: VoiceCurrentUser | null
): VoiceSessionState {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [remoteMedia, setRemoteMedia] = useState<Record<string, VoiceRemoteMedia>>({});

  const activeIdRef = useRef<string | null>(null);
  const joiningRef = useRef(false);
  const meshRef = useRef<VoicePeerMesh | null>(null);

  const { participantsByChannel, setChannelParticipants } = useVoicePresence(channels, {
    onParticipants: (channelId, list) => {
      if (activeIdRef.current === channelId) meshRef.current?.syncParticipants(list);
    },
    onSignal: (event) => {
      if (activeIdRef.current === event.channelId) void meshRef.current?.handleSignal(event);
    },
  });

  const media = useVoiceMediaControls({
    activeIdRef,
    meshRef,
    setMediaNotice,
    onParticipantsUpdated: setChannelParticipants,
  });

  const destroyMesh = useCallback(() => {
    meshRef.current?.destroy();
    meshRef.current = null;
    setRemoteMedia({});
  }, []);

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!currentUser || joiningRef.current || activeIdRef.current === channelId) return;
      joiningRef.current = true;
      setJoining(true);
      setMediaNotice(null);

      const previousId = activeIdRef.current;
      if (previousId) {
        destroyMesh();
        try {
          const remaining = await chatService.leaveVoiceChannel(previousId);
          setChannelParticipants(previousId, remaining);
        } catch {
          // Continue into the target voice channel.
        }
      }

      const nextControls = await media.ensureMicForJoin();
      try {
        const [participants, iceServers] = await Promise.all([
          chatService.joinVoiceChannel(channelId, nextControls),
          loadVoiceIceServers(),
        ]);
        activeIdRef.current = channelId;
        media.applyControls(nextControls);
        setActiveChannelId(channelId);
        setConnectedAt(Date.now());
        setChannelParticipants(channelId, participants);

        const mesh = new VoicePeerMesh({
          selfUserId: currentUser.id,
          iceServers,
          sendSignal: (signal) => chatService.sendVoiceSignal(channelId, signal),
          onRemoteMediaChange: setRemoteMedia,
        });
        meshRef.current = mesh;
        media.syncMeshStreams();
        mesh.syncParticipants(participants);
        media.startVad();
      } catch (err) {
        activeIdRef.current = null;
        setActiveChannelId(null);
        setConnectedAt(null);
        destroyMesh();
        media.resetAll();
        setMediaNotice(errorMessage(err, 'Could not join voice channel.'));
      } finally {
        joiningRef.current = false;
        setJoining(false);
      }
    },
    [currentUser, destroyMesh, media, setChannelParticipants]
  );

  const leaveChannel = useCallback(async () => {
    const chId = activeIdRef.current;
    if (!chId) return;
    activeIdRef.current = null;
    setActiveChannelId(null);
    setConnectedAt(null);
    destroyMesh();
    media.resetAll();
    try {
      const remaining = await chatService.leaveVoiceChannel(chId);
      setChannelParticipants(chId, remaining);
    } catch {
      // Local state is already disconnected.
    }
  }, [destroyMesh, media, setChannelParticipants]);

  useEffect(() => {
    if (activeChannelId && channels.length > 0 && !channels.some((c) => c.id === activeChannelId)) {
      activeIdRef.current = null;
      setActiveChannelId(null);
      setConnectedAt(null);
      destroyMesh();
      media.resetAll();
    }
  }, [activeChannelId, channels, destroyMesh, media]);

  const teardownRef = useRef(media.teardownMedia);
  teardownRef.current = media.teardownMedia;

  useEffect(() => {
    const cleanup = () => {
      const chId = activeIdRef.current;
      activeIdRef.current = null;
      meshRef.current?.destroy();
      meshRef.current = null;
      teardownRef.current();
      if (chId) void chatService.leaveVoiceChannel(chId).catch(() => {});
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  const activeChannel = useMemo(
    () => (activeChannelId ? channels.find((c) => c.id === activeChannelId) ?? null : null),
    [channels, activeChannelId]
  );

  const clearNotice = useCallback(() => setMediaNotice(null), []);

  return {
    activeChannelId,
    activeChannel,
    connectedAt,
    joining,
    mediaNotice,
    muted: media.controls.muted,
    deafened: media.controls.deafened,
    cameraOn: media.controls.cameraOn,
    screenSharing: media.controls.screenSharing,
    speaking: media.controls.speaking,
    localCameraStream: media.localCameraStream,
    localScreenStream: media.localScreenStream,
    participantsByChannel,
    remoteMedia,
    joinChannel,
    leaveChannel,
    toggleMute: media.toggleMute,
    toggleDeafen: media.toggleDeafen,
    toggleCamera: media.toggleCamera,
    toggleScreenShare: media.toggleScreenShare,
    clearNotice,
  };
}
