export type MediaAcquireResult =
  | { stream: MediaStream; error: null }
  | { stream: null; error: string };

type AudioContextCtor = typeof AudioContext;
type WindowWithWebkitAudio = Window & { webkitAudioContext?: AudioContextCtor };

function describeMediaError(kind: 'microphone' | 'camera' | 'screen share', err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return kind === 'screen share'
      ? 'Screen sharing was cancelled or blocked by browser permissions.'
      : `Permission to access ${kind} was denied.`;
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return `No ${kind} device was detected on this system.`;
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return `Your ${kind} is currently in use by another application.`;
  }
  if (name === 'AbortError') {
    return `${kind === 'screen share' ? 'Screen share' : 'Device capture'} was cancelled.`;
  }
  if (err instanceof Error && err.message) return err.message;
  return `Unable to start ${kind}.`;
}

export async function requestMicrophoneStream(): Promise<MediaAcquireResult> {
  const devices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!devices || typeof devices.getUserMedia !== 'function') {
    return { stream: null, error: 'Microphone capture is not supported in this browser.' };
  }
  try {
    const stream = await devices.getUserMedia({ audio: true });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: describeMediaError('microphone', err) };
  }
}

export async function requestCameraStream(): Promise<MediaAcquireResult> {
  const devices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!devices || typeof devices.getUserMedia !== 'function') {
    return { stream: null, error: 'Camera capture is not supported in this browser.' };
  }
  try {
    const stream = await devices.getUserMedia({ video: true });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: describeMediaError('camera', err) };
  }
}

export async function requestScreenShareStream(): Promise<MediaAcquireResult> {
  const devices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!devices || typeof devices.getDisplayMedia !== 'function') {
    return { stream: null, error: 'Screen sharing is not supported in this browser.' };
  }
  try {
    const stream = await devices.getDisplayMedia({ video: true, audio: true });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: describeMediaError('screen share', err) };
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore already-ended tracks during teardown.
    }
  }
}

export function setStreamAudioEnabled(stream: MediaStream | null | undefined, enabled: boolean): void {
  if (!stream) return;
  for (const track of stream.getAudioTracks()) {
    track.enabled = enabled;
  }
}

export function onPrimaryVideoTrackEnded(stream: MediaStream, handler: () => void): void {
  const track = stream.getVideoTracks()[0];
  if (track) track.onended = handler;
}

export interface VoiceActivityOptions {
  threshold?: number;
  holdMs?: number;
  intervalMs?: number;
}

/** Monitors mic amplitude via Web Audio AnalyserNode; safely no-ops when AudioContext is absent. */
export function startVoiceActivityMonitor(
  stream: MediaStream | null | undefined,
  onSpeakingChange: (speaking: boolean) => void,
  options: VoiceActivityOptions = {}
): () => void {
  if (!stream || typeof window === 'undefined' || stream.getAudioTracks().length === 0) {
    return () => {};
  }
  const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return () => {};

  let context: AudioContext;
  let source: MediaStreamAudioSourceNode;
  let analyser: AnalyserNode;
  try {
    context = new Ctor();
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
  } catch {
    return () => {};
  }

  const threshold = options.threshold ?? 0.03;
  const holdMs = options.holdMs ?? 450;
  const intervalMs = options.intervalMs ?? 120;
  const samples = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let lastLoudAt = 0;

  const timer = setInterval(() => {
    const anyEnabled = stream.getAudioTracks().some((t) => t.enabled && t.readyState === 'live');
    if (!anyEnabled) {
      if (speaking) {
        speaking = false;
        onSpeakingChange(false);
      }
      return;
    }
    analyser.getByteTimeDomainData(samples);
    let sumSq = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const normalized = ((samples[i] ?? 128) - 128) / 128;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / samples.length);
    const now = Date.now();
    if (rms >= threshold) {
      lastLoudAt = now;
      if (!speaking) {
        speaking = true;
        onSpeakingChange(true);
      }
    } else if (speaking && now - lastLoudAt >= holdMs) {
      speaking = false;
      onSpeakingChange(false);
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    if (speaking) onSpeakingChange(false);
    try {
      source.disconnect();
      analyser.disconnect();
      void context.close();
    } catch {
      // Ignore Web Audio teardown errors.
    }
  };
}
