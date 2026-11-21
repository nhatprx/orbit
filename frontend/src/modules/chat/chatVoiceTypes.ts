import type { ChatChannelDto, VoiceParticipantDto } from '../../types/workspace.types';

export interface VoiceCurrentUser {
  id: string;
  username: string;
  displayName: string;
}

export interface VoiceRemoteMedia {
  userId: string;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  screenStream: MediaStream | null;
}

export interface VoiceSessionState {
  activeChannelId: string | null;
  activeChannel: ChatChannelDto | null;
  connectedAt: number | null;
  joining: boolean;
  mediaNotice: string | null;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
  localCameraStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  participantsByChannel: Record<string, VoiceParticipantDto[]>;
  remoteMedia: Record<string, VoiceRemoteMedia>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  clearNotice: () => void;
}
