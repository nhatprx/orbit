import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeFrame, encodeFrame } from './frame';
import { StompConnection } from './StompConnection';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = WebSocket.OPEN;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }

  open() {
    this.onopen?.();
  }

  receive(frame: { command: string; headers?: Record<string, string>; body?: string }) {
    this.onmessage?.({ data: encodeFrame(frame) } as MessageEvent);
  }

  commands() {
    return this.sent.map((raw) => decodeFrame(raw)).filter((f) => f !== null);
  }
}

function build(token: string | null = 'jwt-token') {
  return new StompConnection({
    url: () => 'ws://localhost:8080/ws',
    token: () => token,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    backoffMs: [100, 200],
    heartbeatMs: 1000,
  });
}

const latest = () => FakeSocket.instances[FakeSocket.instances.length - 1]!;

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StompConnection', () => {
  it('connects lazily with the bearer token and subscribes after CONNECTED', () => {
    const conn = build();
    const handler = vi.fn();
    conn.subscribe('/topic/chat.1', handler);
    expect(conn.getState()).toBe('connecting');

    latest().open();
    const connect = latest().commands()[0];
    expect(connect?.command).toBe('CONNECT');
    expect(connect?.headers.Authorization).toBe('Bearer jwt-token');
    expect(connect?.headers['heart-beat']).toBe('0,1000');

    latest().receive({ command: 'CONNECTED', headers: { version: '1.2' } });
    expect(conn.getState()).toBe('connected');
    const subscribe = latest().commands().find((f) => f.command === 'SUBSCRIBE');
    expect(subscribe?.headers.destination).toBe('/topic/chat.1');
  });

  it('routes MESSAGE frames to the matching subscription only', () => {
    const conn = build();
    const first = vi.fn();
    const second = vi.fn();
    conn.subscribe('/topic/chat.1', first);
    conn.subscribe('/topic/chat.2', second);
    latest().open();
    latest().receive({ command: 'CONNECTED' });
    const ids = latest().commands().filter((f) => f.command === 'SUBSCRIBE').map((f) => f.headers.id!);

    latest().receive({ command: 'MESSAGE', headers: { subscription: ids[1]! }, body: 'hi' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0]?.[0].body).toBe('hi');
  });

  it('unsubscribes and closes the socket after idle grace period when the last subscriber leaves', () => {
    const conn = build();
    const off = conn.subscribe('/topic/chat.1', vi.fn());
    latest().open();
    latest().receive({ command: 'CONNECTED' });

    off();

    expect(latest().commands().some((f) => f.command === 'UNSUBSCRIBE')).toBe(true);
    expect(latest().closed).toBe(false);
    vi.advanceTimersByTime(300);
    expect(latest().closed).toBe(true);
    expect(conn.getState()).toBe('idle');
  });

  it('does nothing without a token', () => {
    const conn = build(null);
    conn.subscribe('/topic/chat.1', vi.fn());
    expect(FakeSocket.instances).toHaveLength(0);
    expect(conn.getState()).toBe('idle');
  });

  it('reconnects with backoff after an unexpected close and re-subscribes', () => {
    const conn = build();
    const handler = vi.fn();
    conn.subscribe('/topic/chat.1', handler);
    latest().open();
    latest().receive({ command: 'CONNECTED' });

    latest().close();
    expect(conn.getState()).toBe('reconnecting');
    expect(FakeSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(100);
    expect(FakeSocket.instances).toHaveLength(2);
    latest().open();
    latest().receive({ command: 'CONNECTED' });
    expect(conn.getState()).toBe('connected');
    expect(latest().commands().some((f) => f.command === 'SUBSCRIBE')).toBe(true);
  });

  it('does not retry when the server rejects the credentials', () => {
    const conn = build();
    conn.subscribe('/topic/chat.1', vi.fn());
    latest().open();

    latest().receive({ command: 'ERROR', headers: { message: 'Authentication required.' } });
    vi.advanceTimersByTime(60_000);

    expect(conn.getState()).toBe('idle');
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('drops a silent connection after three missed heart-beats', () => {
    const conn = build();
    conn.subscribe('/topic/chat.1', vi.fn());
    latest().open();
    latest().receive({ command: 'CONNECTED' });

    vi.advanceTimersByTime(4000);

    expect(FakeSocket.instances[0]?.closed).toBe(true);
    expect(conn.getState()).toBe('reconnecting');
  });

  it('refuses to send before the session is established', () => {
    const conn = build();
    expect(() => conn.send('/app/chat.1.send', { content: 'x' })).toThrow();
    conn.subscribe('/topic/chat.1', vi.fn());
    latest().open();
    latest().receive({ command: 'CONNECTED' });
    conn.send('/app/chat.1.send', { content: 'x' });
    const sent = latest().commands().find((f) => f.command === 'SEND');
    expect(sent?.body).toBe('{"content":"x"}');
  });

  it('notifies state listeners and supports detaching', () => {
    const conn = build();
    const listener = vi.fn();
    const detach = conn.onStateChange(listener);
    conn.subscribe('/topic/chat.1', vi.fn());
    expect(listener).toHaveBeenCalledWith('connecting');
    detach();
    latest().open();
    latest().receive({ command: 'CONNECTED' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
