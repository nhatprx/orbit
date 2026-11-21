import { useEffect, useRef } from 'react';
import type { VoiceRemoteMedia } from './chatVoiceTypes';

interface VoiceAudioSinkProps {
  remoteMedia: Record<string, VoiceRemoteMedia>;
  deafened: boolean;
}

function RemoteAudioElement({ stream, deafened }: { stream: MediaStream; deafened: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = deafened;
    return () => {
      el.srcObject = null;
    };
  }, [stream, deafened]);

  return <audio ref={audioRef} autoPlay muted={deafened} className="hidden" />;
}

/** Keeps remote voice audio playing even while the user browses text channels. */
export function VoiceAudioSink({ remoteMedia, deafened }: VoiceAudioSinkProps) {
  return (
    <>
      {Object.values(remoteMedia).map((media) =>
        media.audioStream ? (
          <RemoteAudioElement key={media.userId} stream={media.audioStream} deafened={deafened} />
        ) : null
      )}
    </>
  );
}
