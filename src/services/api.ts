import { User, Room, ChatMessage, CatalogMovie, AdminMetrics, AuditLog } from '../types';
import { supabase, isSupabaseConfigured, hashPassword } from '../lib/supabase';

export const api = {
  // Auth
  async register(data: { email: string; password: string; displayName: string; ageConfirmed: boolean }): Promise<{ user: User; token: string }> {
    // If Supabase is connected, register via Supabase Auth
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.displayName,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.displayName)}`
          }
        }
      });
      if (authErr) throw authErr;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    // If Supabase is connected, verify with Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
      } catch (e) {
        // Fall back to local check with 5-attempt rate limit protection
      }
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      const err: any = new Error(json.error || 'Login failed');
      err.locked = json.locked;
      err.remainingSeconds = json.remainingSeconds;
      err.attemptsRemaining = json.attemptsRemaining;
      throw err;
    }
    return json;
  },

  async googleAuth(data: { email: string; displayName: string; avatar?: string; credential?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Google authentication failed');
    return json;
  },

  async forgotPassword(email: string): Promise<{ message: string; recoveryAvailable: boolean; demoResetToken?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
      } catch (e) {}
    }

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Password reset failed');
    return json;
  },

  // User Profile & Photo Upload
  async uploadAvatar(email: string, avatarDataUrl: string): Promise<{ success: boolean; avatar: string }> {
    const res = await fetch('/api/user/upload-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, avatarDataUrl })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to upload photo');
    return json;
  },

  async updateProfile(data: { email: string; displayName?: string; bio?: string; avatar?: string; twoFactorEnabled?: boolean }): Promise<{ user: User }> {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update profile');
    return json;
  },

  // Friends
  async getFriends(userId: string): Promise<{ friends: any[] }> {
    const res = await fetch(`/api/friends?userId=${encodeURIComponent(userId)}`);
    return res.json();
  },

  async searchFriends(query: string): Promise<{ results: any[] }> {
    const res = await fetch('/api/friends/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Rooms
  async getRooms(): Promise<{ rooms: Room[] }> {
    // If Supabase is configured, also query rooms from PostgreSQL table
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbRooms } = await supabase
          .from('rooms')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .order('updated_at', { ascending: false });

        if (dbRooms && dbRooms.length > 0) {
          const mappedRooms: Room[] = dbRooms.map(r => ({
            id: r.id,
            code: r.room_code,
            title: r.name,
            hostId: r.host_id,
            hostName: 'Host',
            isPrivate: r.is_private,
            passwordHash: r.password_hash,
            maxParticipants: 15,
            videoSource: {
              type: 'licensed',
              title: r.name,
              url: r.media_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              duration: 734
            },
            playbackState: {
              isPlaying: r.is_playing,
              currentTime: r.playback_position,
              speed: r.playback_rate,
              lastUpdated: Date.now()
            },
            permissions: {
              allowScreenShare: true,
              allowChat: true,
              allowParticipantPlayPause: false
            },
            participants: [],
            createdAt: r.updated_at
          }));
          return { rooms: mappedRooms };
        }
      } catch (e) {
        console.warn('Failed to fetch rooms from Supabase, falling back to local store', e);
      }
    }

    const res = await fetch('/api/rooms');
    return res.json();
  },

  async getRoom(id: string): Promise<{ room: Room }> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Room not found');
    return json;
  },

  async createRoom(data: {
    title: string;
    isPrivate: boolean;
    password?: string;
    maxParticipants: number;
    videoSource?: any;
    hostUser: { id: string; displayName: string; avatar: string };
  }): Promise<{ room: Room }> {
    // Hash password using Web Crypto SHA-256 if room is private
    let passwordHash = undefined;
    if (data.isPrivate && data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const payload = {
      ...data,
      password: passwordHash
    };

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create room');
    return json;
  },

  async joinRoom(roomId: string, user: { id: string; displayName: string; avatar: string }, password?: string): Promise<{ room: Room }> {
    let passwordHash = undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password: passwordHash })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to join room');
    return json;
  },

  async syncPlayback(roomId: string, state: { isPlaying?: boolean; currentTime?: number; speed?: number; videoSource?: any }): Promise<any> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    return res.json();
  },

  async updateRoomControls(roomId: string, data: { permissions?: any; participantUpdate?: any }): Promise<any> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/controls`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Messages & Chat Photo Upload
  async getMessages(roomId: string): Promise<{ messages: ChatMessage[] }> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`);
    return res.json();
  },

  async sendMessage(roomId: string, data: { senderId: string; senderName: string; senderAvatar: string; text?: string; photoUrl?: string }): Promise<{ message: ChatMessage }> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to send message');
    return json;
  },

  async toggleReaction(roomId: string, msgId: string, emoji: string, userId: string): Promise<{ message: ChatMessage }> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(msgId)}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId })
    });
    return res.json();
  },

  // Catalog
  async getCatalog(): Promise<{ catalog: CatalogMovie[] }> {
    const res = await fetch('/api/content/catalog');
    return res.json();
  },

  // Admin
  async getAdminMetrics(): Promise<{ metrics: AdminMetrics; auditLogs: AuditLog[]; lockedUsers: any[] }> {
    const res = await fetch('/api/admin/metrics');
    return res.json();
  },

  async unlockUser(email: string): Promise<any> {
    const res = await fetch('/api/admin/unlock-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  }
};
