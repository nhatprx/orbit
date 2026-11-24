import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type { VoiceParticipantDto } from '../../types/workspace.types';
import type { VoiceSessionState } from './chatVoiceTypes';
import { VoiceParticipantTile } from './VoiceParticipantTile';
import { VoiceScreenStage, type ActiveScreenShare } from './VoiceScreenStage';

const MAX_VISIBLE_TILES = 5;

interface VoiceStageBodyProps {
  participants: VoiceParticipantDto[];
  voice: VoiceSessionState;
  currentUserId: string | null;
}

function resolveGridClass(tileCount: number, hasScreenShare: boolean): string {
  if (hasScreenShare) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
  if (tileCount <= 1) return 'h-full grid-cols-1 grid-rows-1';
  if (tileCount === 2) return 'h-full grid-cols-1 md:grid-cols-2 md:grid-rows-1';
  if (tileCount === 3) return 'h-full grid-cols-1 md:grid-cols-3 md:grid-rows-1';
  if (tileCount === 4) return 'h-full grid-cols-2 grid-rows-2';
  return 'h-full grid-cols-2 md:grid-cols-3 grid-rows-2';
}

export function VoiceStageBody({
  participants,
  voice,
  currentUserId,
}: VoiceStageBodyProps) {
  const [pinnedScreenId, setPinnedScreenId] = useState<string | null>(null);
  const [showAllParticipants, setShowAllParticipants] = useState(false);

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

  const hasOverflow = !showAllParticipants && participants.length > MAX_VISIBLE_TILES;
  const visibleParticipants = hasOverflow ? participants.slice(0, MAX_VISIBLE_TILES) : participants;
  const overflowParticipants = hasOverflow ? participants.slice(MAX_VISIBLE_TILES) : [];
  const totalSlots = visibleParticipants.length + (hasOverflow ? 1 : 0);
  const isSolo = !activeShare && totalSlots === 1;

  return (
    <>
      <div
        className={
          activeShare && !showAllParticipants
            ? 'flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-3 lg:flex-row lg:items-stretch'
            : showAllParticipants
              ? 'min-h-0 flex-1 space-y-4 overflow-y-auto p-4'
              : 'flex min-h-0 flex-1 flex-col p-4'
        }
      >
        {activeShare && (
          <div
            className={
              showAllParticipants
                ? 'flex h-[55vh] items-center justify-center border border-[#30363D] bg-[#090C10] p-2'
                : 'flex min-h-0 min-w-0 flex-1 items-center justify-center border border-[#30363D] bg-[#090C10] p-2'
            }
          >
            <VoiceScreenStage
              shares={screenShares}
              activeShare={activeShare}
              onSelectShare={setPinnedScreenId}
            />
          </div>
        )}

        {showAllParticipants && participants.length > MAX_VISIBLE_TILES && (
          <div className="flex items-center justify-between border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-xs">
            <span className="font-mono text-[#8B949E]">Showing all {participants.length} participants</span>
            <button
              type="button"
              onClick={() => setShowAllParticipants(false)}
              className="font-mono text-[#22C55E] hover:underline"
            >
              Collapse grid
            </button>
          </div>
        )}

        <div
          className={
            activeShare && !showAllParticipants
              ? 'flex shrink-0 flex-row gap-2 overflow-x-auto border border-[#30363D] bg-[#0B0F14] p-2 lg:w-52 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto'
              : `grid min-h-0 flex-1 gap-3 ${
                  showAllParticipants
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    : resolveGridClass(totalSlots, false)
                }`
          }
        >
          {visibleParticipants.map((participant) => {
            const isLocal = participant.userId === currentUserId;
            const media = voice.remoteMedia[participant.userId];
            const videoStream = isLocal ? voice.localCameraStream : (media?.videoStream ?? null);
            const sharing = isLocal
              ? voice.screenSharing
              : participant.screenSharing || Boolean(media?.screenStream);

            return (
              <div
                key={participant.userId}
                className={activeShare && !showAllParticipants ? 'w-40 shrink-0 lg:w-full' : 'min-h-0'}
              >
                <VoiceParticipantTile
                  participant={participant}
                  isLocal={isLocal}
                  videoStream={videoStream}
                  isScreenSharing={sharing}
                  compact={Boolean(activeShare)}
                  solo={isSolo}
                />
              </div>
            );
          })}

          {hasOverflow && (
            <button
              type="button"
              onClick={() => setShowAllParticipants(true)}
              aria-label={`Show ${overflowParticipants.length} more participants`}
              title={overflowParticipants.map((p) => p.displayName).join(', ')}
              className={`flex h-full min-h-0 flex-col items-center justify-center gap-2 border border-[#30363D] bg-[#161B22] text-center transition-colors hover:border-[#22C55E] hover:bg-[#052E16]/40 ${
                activeShare ? 'min-h-[120px]' : 'min-h-[180px]'
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xl font-bold text-[#4ADE80]">
                +{overflowParticipants.length}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8B949E]">
                <Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                {overflowParticipants.length} more in call
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
