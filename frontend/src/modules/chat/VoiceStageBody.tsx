import { useMemo, useState } from 'react';
import type { VoiceParticipantDto } from '../../types/workspace.types';
import type { VoiceSessionState } from './chatVoiceTypes';
import { VoiceCallToolbar } from './VoiceCallToolbar';
import { VoiceParticipantTile } from './VoiceParticipantTile';
import { VoiceScreenStage, type ActiveScreenShare } from './VoiceScreenStage';

interface VoiceStageBodyProps {
  participants: VoiceParticipantDto[];
  voice: VoiceSessionState;
  currentUserId: string | null;
  showSideChat: boolean;
  onToggleSideChat: () => void;
}

export function VoiceStageBody({
  participants,
  voice,
  currentUserId,
  showSideChat,
  onToggleSideChat,
}: VoiceStageBodyProps) {
  const [pinnedScreenId, setPinnedScreenId] = useState<string | null>(null);

  const screenShares = useMemo<ActiveScreenShare[]>(() => {
    const list: ActiveScreenShare[] = [];
    if (voice.screenSharing || voice.localScreenStream) {
      const localParticipant = participants.find((p) => p.userId === currentUserId);
      list.push({
        userId: currentUserId ?? 'local',
        presenterName: localParticipant?.displayName ?? 'You',
        isLocal: true,
        stream: voice.localScreenStream,
      });
    }
    for (const p of participants) {
      if (p.userId === currentUserId) continue;
      const remoteStream = voice.remoteMedia[p.userId]?.screenStream ?? null;
      if (p.screenSharing || remoteStream) {
        list.push({
          userId: p.userId,
          presenterName: p.displayName,
          isLocal: false,
          stream: remoteStream,
        });
      }
    }
    return list;
  }, [currentUserId, participants, voice.localScreenStream, voice.remoteMedia, voice.screenSharing]);

  const activeShare =
    screenShares.find((item) => item.userId === pinnedScreenId) ?? screenShares[0] ?? null;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {activeShare && (
          <VoiceScreenStage
            shares={screenShares}
            activeShare={activeShare}
            onSelectShare={setPinnedScreenId}
            onStopLocalShare={() => void voice.toggleScreenShare()}
          />
        )}
        <div
          className={`grid gap-3 ${
            activeShare
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {participants.map((participant) => {
            const isLocal = participant.userId === currentUserId;
            const media = voice.remoteMedia[participant.userId];
            const videoStream = isLocal ? voice.localCameraStream : (media?.videoStream ?? null);
            const sharing = isLocal
              ? voice.screenSharing
              : participant.screenSharing || Boolean(media?.screenStream);

            return (
              <VoiceParticipantTile
                key={participant.userId}
                participant={participant}
                isLocal={isLocal}
                videoStream={videoStream}
                isScreenSharing={sharing}
                compact={Boolean(activeShare)}
              />
            );
          })}
        </div>
      </div>

      <VoiceCallToolbar
        voice={voice}
        showSideChat={showSideChat}
        onToggleSideChat={onToggleSideChat}
      />
    </>
  );
}
