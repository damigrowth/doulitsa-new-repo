/**
 * Django Channels WebSocket helpers.
 *
 * Connects to the backend's Daphne ASGI server at `/ws/chat/<chatId>/` and
 * `/ws/presence/`. The JWT access token is read from the `dj_access` cookie
 * (set by the auth flow) and appended as `?token=<jwt>` because browsers
 * cannot attach custom headers to a WebSocket handshake.
 *
 * Consumer event envelopes (from `apps/messaging/consumers.py`):
 *   { type: 'message'         , payload: { id, content, authorUid, ... } }
 *   { type: 'message_edited'  , payload: { id, content, edited, editedAt } }
 *   { type: 'message_deleted' , payload: { id } }
 *   { type: 'reaction'        , payload: { messageId, reactions } }
 *   { type: 'presence'        , payload: { userId, online, lastSeen } }
 *   { type: 'typing'          , payload: { userId } }
 */

'use client';

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30_000;

type EventHandler = (payload: any) => void;

export interface ChannelsSocket {
  send: (msg: unknown) => void;
  close: () => void;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Fetch the Django access JWT from our own Next.js helper route. We cache it
 * for ~1 minute so a reconnect loop doesn't hammer the API.
 */
async function fetchAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  try {
    const res = await fetch('/api/auth/ws-token', { credentials: 'include' });
    if (!res.ok) return null;
    const { token } = (await res.json()) as { token: string | null };
    if (!token) return null;
    cachedToken = { value: token, expiresAt: Date.now() + 60_000 };
    return token;
  } catch {
    return null;
  }
}

function wsBaseUrl(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
  // Strip trailing /api and rewrite http(s) → ws(s)
  return apiBase
    .replace(/\/api\/?$/, '')
    .replace(/^http:/, 'ws:')
    .replace(/^https:/, 'wss:');
}

/**
 * Open a reconnecting WebSocket to a Channels consumer.
 * Returns a controller you can `.send()` messages on and `.close()` when done.
 */
export function openChannelsSocket(
  path: string,
  handlers: Record<string, EventHandler>,
): ChannelsSocket {
  let socket: WebSocket | null = null;
  let closed = false;
  let reconnectDelay = RECONNECT_DELAY_MS;
  let pending: unknown[] = [];

  const connect = async () => {
    if (closed) return;
    const token = await fetchAccessToken();
    const url = `${wsBaseUrl()}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      reconnectDelay = RECONNECT_DELAY_MS;
      // Flush queued sends.
      for (const msg of pending) socket?.send(JSON.stringify(msg));
      pending = [];
    };

    socket.onmessage = (ev) => {
      let parsed: { type?: string; payload?: any };
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!parsed?.type) return;
      const handler = handlers[parsed.type];
      if (handler) handler(parsed.payload);
    };

    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };

    socket.onerror = () => {
      try {
        socket?.close();
      } catch {
        /* noop */
      }
    };
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    setTimeout(() => {
      void connect();
    }, delay);
  };

  void connect();

  return {
    send: (msg: unknown) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      } else {
        pending.push(msg);
      }
    },
    close: () => {
      closed = true;
      try {
        socket?.close();
      } catch {
        /* noop */
      }
      socket = null;
      pending = [];
    },
  };
}
