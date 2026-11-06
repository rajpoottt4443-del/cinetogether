import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes('your-project-id') &&
  !envKey.includes('your-anon-public-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envUrl, envKey, {
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    })
  : null;

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
        .subscribe();
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
      this.supabaseChannel.send({
        type: 'broadcast',
        event,
        payload
      });
    }

    // 2. Mirror via local BroadcastChannel for local tab testing
    if (this.localBroadcast) {
      this.localBroadcast.postMessage({ type: event, payload });
    }
  }

  public trackPresence(userState: any) {
    if (this.supabaseChannel) {
      this.supabaseChannel.track(userState);
    }
    // Also track in local map
    this.currentPresence.set(userState.userId || userState.id, userState);
    if (this.onPresenceHandler) {
      this.onPresenceHandler(Array.from(this.currentPresence.values()));
    }
  }

  public leavePresence(userId: string) {
    if (this.supabaseChannel) {
      this.supabaseChannel.untrack();
    }
    this.currentPresence.delete(userId);
    if (this.onPresenceHandler) {
      this.onPresenceHandler(Array.from(this.currentPresence.values()));
    }
  }

  public close() {
    if (this.supabaseChannel && supabase) {
      supabase.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
    }
    if (this.localBroadcast) {
      this.localBroadcast.close();
      this.localBroadcast = null;
    }
  }
}
