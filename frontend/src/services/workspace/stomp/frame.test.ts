import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame } from './frame';

describe('encodeFrame', () => {
  it('serializes command, headers, blank line, body and NUL terminator', () => {
    const raw = encodeFrame({ command: 'SEND', headers: { destination: '/app/x' }, body: '{"a":1}' });
    expect(raw).toBe('SEND\ndestination:/app/x\n\n{"a":1}\u0000');
  });

  it('escapes colons, newlines and backslashes in header values', () => {
    const raw = encodeFrame({ command: 'SEND', headers: { note: 'a:b\nc\\d' } });
    expect(raw).toContain('note:a\\cb\\nc\\\\d');
  });

  it('defaults to an empty body and no headers', () => {
    expect(encodeFrame({ command: 'DISCONNECT' })).toBe('DISCONNECT\n\n\u0000');
  });
});

describe('decodeFrame', () => {
  it('round-trips encoded frames including escaped headers', () => {
    const original = { command: 'MESSAGE', headers: { subscription: 'sub-1', note: 'x:y\nz' }, body: 'line1\nline2' };
    expect(decodeFrame(encodeFrame(original))).toEqual(original);
  });

  it('treats heart-beats and empty input as no frame', () => {
    expect(decodeFrame('\n')).toBeNull();
    expect(decodeFrame('\r\n\n')).toBeNull();
    expect(decodeFrame('')).toBeNull();
  });

  it('keeps the first occurrence of a repeated header', () => {
    const frame = decodeFrame('MESSAGE\nsubscription:first\nsubscription:second\n\nbody\u0000');
    expect(frame?.headers.subscription).toBe('first');
  });

  it('accepts CRLF line endings from other brokers', () => {
    const frame = decodeFrame('CONNECTED\r\nversion:1.2\r\n\r\n\u0000');
    expect(frame).toEqual({ command: 'CONNECTED', headers: { version: '1.2' }, body: '' });
  });

  it('tolerates a missing NUL terminator and ignores malformed header lines', () => {
    const frame = decodeFrame('ERROR\nmessage:boom\nnot-a-header\n\ndetails');
    expect(frame?.command).toBe('ERROR');
    expect(frame?.headers).toEqual({ message: 'boom' });
    expect(frame?.body).toBe('details');
  });

  it('keeps a body that itself contains blank lines', () => {
    const frame = decodeFrame('MESSAGE\n\nfirst\n\nsecond\u0000');
    expect(frame?.body).toBe('first\n\nsecond');
  });
});
