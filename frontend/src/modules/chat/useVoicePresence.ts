import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../../services/workspace/services';
import type { ChatChannelDto, VoiceEventDto, VoiceParticipantDto } from '../../types/workspace.types';

interface VoicePresenceCallbacks {
  onParticipants: (channelId: string, participants: VoiceParticipantDto[]) => void;
  onSignal: (event: VoiceEventDto) => void;
}

/** Fetches initial participants and subscribes to live voice events for every VOICE channel. */
export function useVoicePresence(channels: ChatChannelDto[], callbacks: VoicePresenceCallbacks) {
  const [participantsByChannel, setParticipantsByChannel] = useState<
    Record<string, VoiceParticipantDto[]>
  >({});
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const voiceKey = useMemo(
    () =>
      channels
        .filter((c) => c.channelType === 'VOICE')
        .map((c) => c.id)
        .sort()
        .join(','),
    [channels]
  );

  const setChannelParticipants = useCallback(
    (channelId: string, participants: VoiceParticipantDto[]) => {
      setParticipantsByChannel((prev) => ({ ...prev, [channelId]: participants }));
    },
    []
  );

  useEffect(() => {
    if (!voiceKey) return;
    let active = true;
    const ids = voiceKey.split(',');

    const unsubs = ids.map((id) => {
      chatService
        .listVoiceParticipants(id)
        .then((list) => {
          if (!active) return;
          setParticipantsByChannel((prev) => ({ ...prev, [id]: list }));
          callbacksRef.current.onParticipants(id, list);
        })
        .catch(() => {
          // Presence will populate on the next live event or join.
        });

      return chatService.subscribeVoice(id, (event) => {
        if (!active) return;
        if (event.eventType === 'PARTICIPANTS' && event.participants) {
          const list = event.participants;
          setParticipantsByChannel((prev) => ({ ...prev, [event.channelId]: list }));
          callbacksRef.current.onParticipants(event.channelId, list);
        } else if (event.eventType === 'SIGNAL') {
          callbacksRef.current.onSignal(event);
        }
      });
    });

    return () => {
      active = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, [voiceKey]);

  return { participantsByChannel, setChannelParticipants };
}
