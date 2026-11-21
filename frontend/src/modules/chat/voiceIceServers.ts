import { chatService } from '../../services/workspace/services';
import type { VoiceIceServerDto } from '../../types/workspace.types';

export const DEFAULT_VOICE_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

function isIceUrl(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return (
    lower.startsWith('stun:') ||
    lower.startsWith('stuns:') ||
    lower.startsWith('turn:') ||
    lower.startsWith('turns:')
  );
}

function toRtcServer(entry: { urls: string | string[]; username?: string; credential?: string }): RTCIceServer | null {
  const rawList = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
  const urls = rawList.map((u) => u.trim()).filter((u) => u.length > 0 && isIceUrl(u));
  if (urls.length === 0) return null;
  const server: RTCIceServer = { urls };
  if (entry.username?.trim()) server.username = entry.username.trim();
  if (entry.credential?.trim()) server.credential = entry.credential.trim();
  return server;
}

/** Normalizes ICE server entries returned by the backend into valid RTCIceServer records. */
export function normalizeIceServers(entries: VoiceIceServerDto[] | null | undefined): RTCIceServer[] {
  if (!Array.isArray(entries)) return [];
  const servers: RTCIceServer[] = [];
  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.urls)) continue;
    const normalized = toRtcServer(entry);
    if (normalized) servers.push(normalized);
  }
  return servers;
}

/** Parses VITE_VOICE_ICE_SERVERS (JSON array or comma-separated URLs) with a default STUN fallback. */
export function parseEnvIceServers(raw: string | undefined): RTCIceServer[] {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_VOICE_ICE_SERVERS;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const result: RTCIceServer[] = [];
        for (const item of parsed) {
          if (typeof item === 'string') {
            const server = toRtcServer({ urls: item });
            if (server) result.push(server);
          } else if (item && typeof item === 'object' && 'urls' in item) {
            const obj = item as { urls: unknown; username?: unknown; credential?: unknown };
            if (typeof obj.urls === 'string' || Array.isArray(obj.urls)) {
              const server = toRtcServer({
                urls: obj.urls as string | string[],
                username: typeof obj.username === 'string' ? obj.username : undefined,
                credential: typeof obj.credential === 'string' ? obj.credential : undefined,
              });
              if (server) result.push(server);
            }
          }
        }
        if (result.length > 0) return result;
      }
    } catch {
      return DEFAULT_VOICE_ICE_SERVERS;
    }
    return DEFAULT_VOICE_ICE_SERVERS;
  }

  const csv = trimmed
    .split(',')
    .map((u) => toRtcServer({ urls: u }))
    .filter((entry): entry is RTCIceServer => entry !== null);
  return csv.length > 0 ? csv : DEFAULT_VOICE_ICE_SERVERS;
}

/** Loads ICE/TURN servers from API, falling back to VITE_VOICE_ICE_SERVERS or default STUN. */
export async function loadVoiceIceServers(
  fetcher?: () => Promise<VoiceIceServerDto[]>,
  envRaw: string | undefined = import.meta.env.VITE_VOICE_ICE_SERVERS
): Promise<RTCIceServer[]> {
  try {
    const load =
      fetcher ??
      (typeof chatService.getVoiceIceServers === 'function'
        ? () => chatService.getVoiceIceServers()
        : null);
    if (load) {
      const remote = normalizeIceServers(await load());
      if (remote.length > 0) return remote;
    }
  } catch {
    // Fall back to build-time env or default STUN server.
  }
  return parseEnvIceServers(envRaw);
}
