export interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

const NULL = '\u0000';
const UNESCAPE: Record<string, string> = { r: '\r', n: '\n', c: ':', '\\': '\\' };

function escapeHeader(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}

function unescapeHeader(value: string): string {
  return value.replace(/\\([rnc\\])/g, (_match, code: string) => UNESCAPE[code] ?? code);
}

/** Serializes a STOMP 1.2 frame (text mode). */
export function encodeFrame(frame: { command: string; headers?: Record<string, string>; body?: string }): string {
  const lines = [frame.command];
  for (const [key, value] of Object.entries(frame.headers ?? {})) {
    lines.push(`${escapeHeader(key)}:${escapeHeader(value)}`);
  }
  return `${lines.join('\n')}\n\n${frame.body ?? ''}${NULL}`;
}

/** Parses one WebSocket text message. Heart-beat messages (bare line feeds) return null. */
export function decodeFrame(raw: string): StompFrame | null {
  const text = raw.replace(/^[\r\n]+/, '');
  if (!text) return null;

  const end = text.indexOf(NULL);
  const frameText = end === -1 ? text : text.slice(0, end);
  const split = frameText.indexOf('\n\n');
  const head = split === -1 ? frameText : frameText.slice(0, split);
  const body = split === -1 ? '' : frameText.slice(split + 2);

  const [commandLine, ...headerLines] = head.split('\n');
  const command = commandLine?.trim();
  if (!command) return null;

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = unescapeHeader(line.slice(0, colon).replace(/\r$/, ''));
    // The STOMP spec says the first occurrence of a repeated header wins.
    if (!(key in headers)) headers[key] = unescapeHeader(line.slice(colon + 1).replace(/\r$/, ''));
  }
  return { command, headers, body };
}
