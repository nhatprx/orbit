import { decodeFrame, encodeFrame, type StompFrame } from './frame';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';
type FrameHandler = (frame: StompFrame) => void;

export interface StompConnectionOptions {
  url: () => string;
  token: () => string | null;
  createSocket?: (url: string) => WebSocket;
  backoffMs?: number[];
  heartbeatMs?: number;
}

interface Subscription {
  destination: string;
  handler: FrameHandler;
}

const DEFAULT_BACKOFF = [1000, 2000, 5000, 10000, 30000];
const IDLE_CLOSE_DELAY_MS = 250;

/**
 * One shared STOMP-over-WebSocket session. Connects lazily on the first subscription,
 * reuses the warm socket across rapid channel switches, and auto-recovers on reconnect/visibility.
 */
export class StompConnection {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private attempt = 0;
  private nextId = 0;
  private lastActivity = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly listeners = new Set<(state: ConnectionState) => void>();

  constructor(private readonly options: StompConnectionOptions) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityOrOnline);
      window.addEventListener('online', this.handleVisibilityOrOnline);
      window.addEventListener('focus', this.handleVisibilityOrOnline);
    }
  }

  getState(): ConnectionState { return this.state; }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribe(destination: string, handler: FrameHandler): () => void {
    clearTimeout(this.closeTimer);
    const id = `sub-${this.nextId++}`;
    this.subscriptions.set(id, { destination, handler });
    if (this.state === 'idle') this.open();
    else if (this.state === 'connected') this.transmit('SUBSCRIBE', { id, destination });

    return () => {
      if (!this.subscriptions.delete(id)) return;
      if (this.state === 'connected') this.transmit('UNSUBSCRIBE', { id });
      if (this.subscriptions.size === 0) {
        clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(() => {
          if (this.subscriptions.size === 0) this.close();
        }, IDLE_CLOSE_DELAY_MS);
      }
    };
  }

  send(destination: string, body: unknown): void {
    if (this.state !== 'connected') throw new Error('Realtime connection is not ready.');
    this.transmit('SEND', { destination, 'content-type': 'application/json' }, JSON.stringify(body));
  }

  close(): void {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.closeTimer);
    clearInterval(this.heartbeatTimer);
    const socket = this.socket;
    this.socket = null;
    this.attempt = 0;
    this.setState('idle');
    socket?.close();
  }

  private readonly handleVisibilityOrOnline = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    this.lastActivity = Date.now();
    if (this.subscriptions.size === 0) return;
    const isBroken = this.state === 'connected' && this.socket?.readyState !== WebSocket.OPEN;
    if (isBroken) {
      this.socket?.close();
      return;
    }
    if (this.state !== 'connected' && this.state !== 'connecting') {
      clearTimeout(this.reconnectTimer);
      this.attempt = 0;
      this.open();
    }
  };

  private open(): void {
    const token = this.options.token();
    if (!token) return;
    clearTimeout(this.reconnectTimer);
    this.setState(this.attempt > 0 ? 'reconnecting' : 'connecting');
    const socket = (this.options.createSocket ?? ((u) => new WebSocket(u)))(this.options.url());
    this.socket = socket;
    socket.onopen = () => {
      this.lastActivity = Date.now();
      const beat = String(this.options.heartbeatMs ?? 10000);
      // Advertise 0 for client->server heartbeat so Chrome background-tab timer throttling never causes server disconnect.
      this.transmit('CONNECT', {
        'accept-version': '1.2',
        host: 'orbit',
        Authorization: `Bearer ${token}`,
        'heart-beat': `0,${beat}`,
      });
    };
    socket.onmessage = (event: MessageEvent) => this.handleMessage(String(event.data));
    socket.onclose = () => this.handleClose(socket);
    socket.onerror = () => socket.close();
  }

  private handleMessage(raw: string): void {
    this.lastActivity = Date.now();
    const frame = decodeFrame(raw);
    if (!frame) return;
    if (frame.command === 'CONNECTED') {
      this.attempt = 0;
      this.startHeartbeat();
      this.subscriptions.forEach((sub, id) =>
        this.transmit('SUBSCRIBE', { id, destination: sub.destination })
      );
      this.setState('connected');
    } else if (frame.command === 'MESSAGE') {
      this.subscriptions.get(frame.headers.subscription ?? '')?.handler(frame);
    } else if (frame.command === 'ERROR') {
      const msg = `${frame.headers.message ?? ''} ${frame.body}`.toLowerCase();
      const authRejected = msg.includes('invalid token') || msg.includes('session expired') || msg.includes('authentication required');
      if (this.state !== 'connected' && authRejected) {
        this.failPermanently();
      }
    }
  }

  private failPermanently(): void {
    const socket = this.socket;
    this.socket = null;
    clearInterval(this.heartbeatTimer);
    this.setState('idle');
    socket?.close();
  }

  private handleClose(closed: WebSocket): void {
    if (this.socket !== closed) return;
    this.socket = null;
    clearInterval(this.heartbeatTimer);
    if (this.subscriptions.size === 0) {
      this.setState('idle');
      return;
    }
    const delays = this.options.backoffMs ?? DEFAULT_BACKOFF;
    const delay = delays[Math.min(this.attempt, delays.length - 1)] ?? 30000;
    this.attempt += 1;
    this.setState('reconnecting');
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private startHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    const every = this.options.heartbeatMs ?? 10000;
    this.heartbeatTimer = setInterval(() => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (!hidden && Date.now() - this.lastActivity > every * 3) {
        this.socket?.close();
        return;
      }
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('\n');
      }
    }, every);
  }

  private transmit(command: string, headers: Record<string, string>, body = ''): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(encodeFrame({ command, headers, body }));
    }
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }
}
