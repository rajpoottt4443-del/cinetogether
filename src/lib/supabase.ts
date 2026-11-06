import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (support both Vite and Next.js naming)
const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

/**
 * Validate URL strictly before initializing the client to prevent unhandled runtime errors
 */
function isValidSupabaseUrl(urlStr: string): boolean {
  if (!urlStr || urlStr.includes('your-project-id') || urlStr.includes('placeholder')) {
    return false;
  }
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidSupabaseKey(keyStr: string): boolean {
  return Boolean(
    keyStr &&
    !keyStr.includes('your-anon-public-key') &&
    !keyStr.includes('placeholder') &&
    keyStr.length > 20
  );
}

export const isSupabaseConfigured = Boolean(
  isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey)
);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    });
  } catch (err) {
    console.warn('[CineTogether] Supabase client initialization failed, falling back to local demo mode:', err);
    supabaseInstance = null;
  }
}

export const supabase = supabaseInstance;

// Free public Google STUN servers (Zero external paid API)
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

/**
 * Hash room password with Web Crypto API SHA-256 (Never store plaintext)
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Global Safe JSON Fetch Helper:
 * Replaces direct response.json() calls with safe text parsing to prevent
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input" errors.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    let data: any = {};
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawText: text };
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    console.warn('[CineTogether] Network fetch fallback:', err.message);
    return { ok: false, status: 0, data: { error: err.message } as any };
  }
}

/**
 * Universal Signaling & Broadcast Channel
 * Uses Supabase Realtime Broadcast if configured; otherwise seamlessly uses
 * browser BroadcastChannel for multi-tab zero-config local testing.
 */
export class RoomSignalingChannel {
  private roomCode: string;
  private localBroadcast: BroadcastChannel | null = null;
  private supabaseChannel: any = null;
  private onEventHandler: ((event: string, payload: any) => void) | null = null;
  private onPresenceHandler: ((presenceList: any[]) => void) | null = null;
  private currentPresence: Map<string, any> = new Map();

  constructor(roomCode: string) {
    this.roomCode = roomCode;

    if (isSupabaseConfigured && supabase) {
      try {
        // Connect to Supabase Realtime Broadcast + Presence
        this.supabaseChannel = supabase.channel(`room:${roomCode}`, {
          config: { broadcast: { self: false } }
        });

        this.supabaseChannel
          .on('broadcast', { event: '*' }, (payload: any) => {
            if (this.onEventHandler) {
              this.onEventHandler(payload.event, payload.payload);
            }
          })
          .on('presence', { event: 'sync' }, () => {
            if (this.onPresenceHandler && this.supabaseChannel) {
              const state = this.supabaseChannel.presenceState();
              const list: any[] = [];
              Object.keys(state).forEach(key => {
                state[key].forEach((p: any) => list.push(p));
              });
              this.onPresenceHandler(list);
            }
          })
          .subscribe((status: string) => {
            if (status !== 'SUBSCRIBED' && status !== 'CLOSED') {
              console.log(`[CineTogether] Supabase channel status: ${status}`);
            }
          });
      } catch (err) {
        console.warn('[CineTogether] Supabase channel subscribe failed, using BroadcastChannel:', err);
      }
    }

    // Always instantiate native BroadcastChannel for fallback or same-browser tab testing
    try {
      this.localBroadcast = new BroadcastChannel(`cinetogether_room_${roomCode}`);
      this.localBroadcast.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type && this.onEventHandler) {
          this.onEventHandler(type, payload);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }

  public onEvent(handler: (event: string, payload: any) => void) {
    this.onEventHandler = handler;
  }

  public onPresence(handler: (presenceList: any[]) => void) {
    this.onPresenceHandler = handler;
  }

  public broadcast(event: string, payload: any) {
    // 1. Send via Supabase Realtime if connected
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event,
          payload
        });
      } catch (e) {
        // quiet error
      }
    }

    // 2. Mirror via local BroadcastChannel for local tab testing
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({ type: event, payload });
      } catch (e) {
        // quiet error
      }
    }
  }

  public trackPresence(userState: any) {
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.track(userState);
      } catch (e) {}
    }
    // Also track in local map
    this.currentPresence.set(userState.userId || userState.id, userState);
    if (this.onPresenceHandler) {
      this.onPresenceHandler(Array.from(this.currentPresence.values()));
    }
  }

  public leavePresence(userId: string) {
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.untrack();
      } catch (e) {}
    }
    this.currentPresence.delete(userId);
    if (this.onPresenceHandler) {
      this.onPresenceHandler(Array.from(this.currentPresence.values()));
    }
  }

  public close() {
    if (this.supabaseChannel && supabase) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch (e) {}
      this.supabaseChannel = null;
    }
    if (this.localBroadcast) {
      try {
        this.localBroadcast.close();
      } catch (e) {}
      this.localBroadcast = null;
    }
  }
}
