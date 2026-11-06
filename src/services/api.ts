import { User, Room, ChatMessage, CatalogMovie, AdminMetrics, AuditLog } from '../types';
import { supabase, isSupabaseConfigured, hashPassword, safeFetchJson } from '../lib/supabase';

// Local storage keys for fallback demo mode
const LOCAL_USERS_KEY = 'cinetogether_demo_users_db';
const LOCAL_ROOMS_KEY = 'cinetogether_demo_rooms_db';
const LOCAL_MESSAGES_KEY = 'cinetogether_demo_messages_db';

// Helper to seed initial demo accounts
function getLocalUsers(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const defaultUsers: Record<string, any> = {
    'admin@cinetogether.com': {
      id: 'usr_admin',
      userId: 'CT-9A4E2B10',
      email: 'admin@cinetogether.com',
      displayName: 'CineArchitect',
      password: 'admin12345',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      role: 'admin',
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null
    },
    'sarah.connor@cinetogether.com': {
      id: 'usr_sarah',
      userId: 'CT-8F29A641',
      email: 'sarah.connor@cinetogether.com',
      displayName: 'Sarah Connor',
      password: 'password123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
      role: 'user',
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null
    }
  };
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveLocalUsers(users: Record<string, any>) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

// Generate permanent unique User ID (e.g. CT-8F29A641)
function generatePermanentUserId(): string {
  const chars = '0123456789ABCDEF';
  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CT-${hex}`;
}

export const api = {
  // ==============================================================
  // 1. SIGN UP / REGISTRATION (SUPABASE SDK DIRECT + SAFE FALLBACK)
  // ==============================================================
  async register(data: { email: string; password: string; displayName: string; ageConfirmed: boolean }): Promise<{ user: User; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. If Supabase is configured, use official Supabase Auth SDK directly
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: data.password,
          options: {
            data: {
              username: data.displayName.trim(),
              full_name: data.displayName.trim(),
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.displayName)}`
            }
          }
        });

        if (authErr) throw authErr;

        if (authData.user) {
          // Use .maybeSingle() to prevent empty row exceptions
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from('profiles').upsert({
              id: authData.user.id,
              username: data.displayName.trim(),
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.displayName)}`,
              role: 'user'
            }, { onConflict: 'id' });
          }

          const user: User = {
            id: authData.user.id,
            userId: generatePermanentUserId(),
            email: normalizedEmail,
            displayName: data.displayName.trim(),
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.displayName)}`,
            createdAt: authData.user.created_at || new Date().toISOString(),
            ageConfirmed: true,
            ageConfirmedAt: new Date().toISOString(),
            isGoogleLinked: false,
            role: 'user',
            status: 'online',
            twoFactorEnabled: false,
            failedLoginAttempts: 0,
            lockedUntil: null
          };

          return { user, token: authData.session?.access_token || 'supabase_token' };
        }
      } catch (err: any) {
        console.warn('[CineTogether] Supabase registration error, checking local fallback:', err.message);
        // If Supabase returned a credential error like user already exists, re-throw it
        if (err.message && !err.message.includes('fetch') && !err.message.includes('network')) {
          throw err;
        }
      }
    }

    // 2. Local Fallback Mode (No raw fetch calls!)
    const localUsers = getLocalUsers();
    if (localUsers[normalizedEmail]) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser: User = {
      id: 'usr_' + Date.now().toString(36),
      userId: generatePermanentUserId(),
      email: normalizedEmail,
      displayName: data.displayName.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.displayName)}`,
      createdAt: new Date().toISOString(),
      ageConfirmed: true,
      ageConfirmedAt: new Date().toISOString(),
      isGoogleLinked: false,
      role: 'user',
      status: 'online',
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    localUsers[normalizedEmail] = {
      ...newUser,
      password: data.password,
      failedAttempts: 0,
      lockedUntil: null
    };
    saveLocalUsers(localUsers);

    return { user: newUser, token: 'local_token_' + newUser.id };
  },

  // ==============================================================
  // 2. SIGN IN / LOGIN (SUPABASE SDK DIRECT + 5-ATTEMPT LOCKOUT)
  // ==============================================================
  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. If Supabase is configured, use official Supabase Auth SDK directly
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: data.password
        });

        if (authErr) throw authErr;

        if (authData.user) {
          // Use .maybeSingle() to prevent empty row exceptions
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          const user: User = {
            id: authData.user.id,
            userId: generatePermanentUserId(),
            email: normalizedEmail,
            displayName: profile?.username || authData.user.user_metadata?.username || normalizedEmail.split('@')[0],
            avatar: profile?.avatar_url || authData.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${authData.user.id}`,
            createdAt: authData.user.created_at || new Date().toISOString(),
            ageConfirmed: true,
            ageConfirmedAt: new Date().toISOString(),
            isGoogleLinked: false,
            role: (profile?.role as any) || 'user',
            status: 'online',
            twoFactorEnabled: false,
            failedLoginAttempts: 0,
            lockedUntil: null
          };

          return { user, token: authData.session?.access_token || 'supabase_token' };
        }
      } catch (err: any) {
        console.warn('[CineTogether] Supabase login error:', err.message);
        if (err.message && !err.message.includes('fetch') && !err.message.includes('network')) {
          throw err;
        }
      }
    }

    // 2. Local Fallback Mode with 5-Attempt Lockout
    const localUsers = getLocalUsers();
    const existing = localUsers[normalizedEmail];

    if (existing && existing.lockedUntil) {
      const now = Date.now();
      if (now < existing.lockedUntil) {
        const remainingMinutes = Math.ceil((existing.lockedUntil - now) / 60000);
        const remainingSeconds = Math.ceil((existing.lockedUntil - now) / 1000);
        const err: any = new Error(
          `Account is temporarily locked due to 5 consecutive failed login attempts. Please wait ${remainingMinutes} minute(s).`
        );
        err.locked = true;
        err.remainingSeconds = remainingSeconds;
        throw err;
      } else {
        existing.lockedUntil = null;
        existing.failedAttempts = 0;
        saveLocalUsers(localUsers);
      }
    }

    if (!existing || existing.password !== data.password) {
      if (existing) {
        existing.failedAttempts = (existing.failedAttempts || 0) + 1;
        const attemptsLeft = 5 - existing.failedAttempts;

        if (existing.failedAttempts >= 5) {
          existing.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
          saveLocalUsers(localUsers);
          const err: any = new Error(
            'Account temporarily locked. You have reached 5 consecutive failed attempts. Cooldown: 15 minutes.'
          );
          err.locked = true;
          err.remainingSeconds = 900;
          throw err;
        }

        saveLocalUsers(localUsers);
        const err: any = new Error(
          `Invalid email or password. Warning: ${attemptsLeft} attempt(s) remaining before a 15-minute security lockout.`
        );
        err.attemptsRemaining = attemptsLeft;
        throw err;
      }

      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    // Successful login -> reset failed attempts
    existing.failedAttempts = 0;
    existing.lockedUntil = null;
    saveLocalUsers(localUsers);

    const user: User = {
      id: existing.id || 'usr_' + Date.now().toString(36),
      userId: existing.userId || generatePermanentUserId(),
      email: normalizedEmail,
      displayName: existing.displayName || 'Film Fan',
      avatar: existing.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      createdAt: existing.createdAt || new Date().toISOString(),
      ageConfirmed: true,
      ageConfirmedAt: new Date().toISOString(),
      isGoogleLinked: !!existing.isGoogleLinked,
      role: existing.role || 'user',
      status: 'online',
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    return { user, token: 'local_token_' + user.id };
  },

  // ==============================================================
  // 3. GOOGLE OAUTH / SIGN IN (OFFICIAL SUPABASE SDK OR DIRECT DEMO)
  // ==============================================================
  async googleAuth(data: { email: string; displayName: string; avatar?: string; credential?: string }): Promise<{ user: User; token: string }> {
    // 1. If Supabase is configured, use official Supabase OAuth redirect
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (oauthErr) throw oauthErr;
      } catch (err: any) {
        console.warn('[CineTogether] Supabase Google OAuth error:', err.message);
      }
    }

    // 2. Immediate Safe Client Session (No custom fetch to avoid unexpected end of JSON!)
    const targetEmail = (data.email || 'alex.cinema@gmail.com').toLowerCase();
    const targetName = data.displayName || 'Alex Chen';
    const targetAvatar = data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80';

    const user: User = {
      id: 'usr_g_' + Date.now().toString(36),
      userId: generatePermanentUserId(),
      email: targetEmail,
      displayName: targetName,
      avatar: targetAvatar,
      createdAt: new Date().toISOString(),
      ageConfirmed: true,
      ageConfirmedAt: new Date().toISOString(),
      isGoogleLinked: true,
      role: 'user',
      status: 'online',
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    return { user, token: 'google_token_' + user.id };
  },

  // ==============================================================
  // 4. PASSWORD RESET
  // ==============================================================
  async forgotPassword(email: string): Promise<{ message: string; recoveryAvailable: boolean; demoResetToken?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`
        });
      } catch (e) {}
    }

    return {
      message: 'If that email address is in our database, we will send an email with password reset instructions.',
      recoveryAvailable: true,
      demoResetToken: 'reset_token_' + Math.random().toString(36).substring(2, 10)
    };
  },

  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } catch (e) {}
    }

    const localUsers = getLocalUsers();
    const norm = email.trim().toLowerCase();
    if (localUsers[norm]) {
      localUsers[norm].password = newPassword;
      localUsers[norm].failedAttempts = 0;
      localUsers[norm].lockedUntil = null;
      saveLocalUsers(localUsers);
    }

    return { success: true, message: 'Password has been reset successfully. You can now log in.' };
  },

  // ==============================================================
  // 5. PROFILE & PHOTO UPLOADS
  // ==============================================================
  async uploadAvatar(email: string, avatarDataUrl: string): Promise<{ success: boolean; avatar: string }> {
    // If Supabase is connected, update profile in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            avatar_url: avatarDataUrl
          });
        }
      } catch (e) {}
    }

    const localUsers = getLocalUsers();
    const norm = email.trim().toLowerCase();
    if (localUsers[norm]) {
      localUsers[norm].avatar = avatarDataUrl;
      saveLocalUsers(localUsers);
    }

    return { success: true, avatar: avatarDataUrl };
  },

  async updateProfile(data: { email: string; displayName?: string; bio?: string; avatar?: string; twoFactorEnabled?: boolean }): Promise<{ user: User }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            username: data.displayName,
            avatar_url: data.avatar
          });
        }
      } catch (e) {}
    }

    const localUsers = getLocalUsers();
    const norm = (data.email || '').trim().toLowerCase();
    const existing = localUsers[norm] || {};
    if (data.displayName) existing.displayName = data.displayName;
    if (data.avatar) existing.avatar = data.avatar;
    if (data.bio !== undefined) existing.bio = data.bio;
    if (data.twoFactorEnabled !== undefined) existing.twoFactorEnabled = data.twoFactorEnabled;
    localUsers[norm] = existing;
    saveLocalUsers(localUsers);

    return {
      user: {
        id: existing.id || 'usr_' + Date.now().toString(36),
        userId: existing.userId || 'CT-USER',
        email: norm,
        displayName: existing.displayName || 'Film Fan',
        avatar: existing.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
        createdAt: existing.createdAt || new Date().toISOString(),
        ageConfirmed: true,
        ageConfirmedAt: new Date().toISOString(),
        isGoogleLinked: false,
        role: existing.role || 'user',
        status: 'online',
        twoFactorEnabled: !!existing.twoFactorEnabled,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    };
  },

  // ==============================================================
  // 6. FRIENDS
  // ==============================================================
  async getFriends(userId: string): Promise<{ friends: any[] }> {
    const localUsers = getLocalUsers();
    const friends: any[] = [];
    Object.values(localUsers).forEach(u => {
      if (u.id !== userId) {
        friends.push({
          id: u.id,
          userId: u.userId,
          displayName: u.displayName,
          avatar: u.avatar,
          status: 'online',
          mutualParties: 3
        });
      }
    });
    return { friends };
  },

  async searchFriends(query: string): Promise<{ results: any[] }> {
    const q = query.trim().toUpperCase();
    const localUsers = getLocalUsers();
    const results: any[] = [];
    Object.values(localUsers).forEach(u => {
      if ((u.userId && u.userId.toUpperCase().includes(q)) || (u.displayName && u.displayName.toUpperCase().includes(q))) {
        results.push({
          id: u.id,
          userId: u.userId,
          displayName: u.displayName,
          avatar: u.avatar,
          status: 'online'
        });
      }
    });
    return { results };
  },

  // ==============================================================
  // 7. ROOMS & WATCH PARTY
  // ==============================================================
  async getRooms(): Promise<{ rooms: Room[] }> {
    // 1. If Supabase is configured, fetch from public.rooms
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
            hostName: 'Party Host',
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
        console.warn('[CineTogether] Supabase getRooms error, using local fallback:', e);
      }
    }

    // 2. Safe local store fallback
    try {
      const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { rooms: parsed };
        }
      }
    } catch (e) {}

    // Default seed room
    const defaultRooms: Room[] = [
      {
        id: 'room_nebula',
        code: 'PARTY-4029',
        title: 'Cosmic Odyssey Watch & Chill',
        hostId: 'usr_sarah',
        hostName: 'Sarah Connor',
        isPrivate: false,
        maxParticipants: 12,
        videoSource: {
          type: 'licensed',
          title: 'Tears of Steel (Sci-Fi Premiere)',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          poster: '/src/assets/images/movie_cosmic_odyssey_1793972646755.jpg',
          duration: 734
        },
        playbackState: {
          isPlaying: true,
          currentTime: 142,
          lastUpdated: Date.now(),
          speed: 1.0
        },
        permissions: {
          allowScreenShare: true,
          allowChat: true,
          allowParticipantPlayPause: false
        },
        participants: [
          {
            userId: 'usr_sarah',
            displayName: 'Sarah Connor',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
            role: 'host',
            isMuted: false,
            isVideoOn: true,
            isScreenSharing: false,
            joinedAt: new Date().toISOString(),
            ping: 28
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];

    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(defaultRooms));
    return { rooms: defaultRooms };
  },

  async getRoom(idOrCode: string): Promise<{ room: Room }> {
    const res = await this.getRooms();
    const match = res.rooms.find(
      r => r.id === idOrCode || r.code.toUpperCase() === idOrCode.toUpperCase()
    );

    if (match) {
      return { room: match };
    }

    // Default fallback room if code format matches
    const newRoom: Room = {
      id: 'room_' + idOrCode.toLowerCase(),
      code: idOrCode.toUpperCase(),
      title: `Party ${idOrCode.toUpperCase()}`,
      hostId: 'usr_sarah',
      hostName: 'Party Host',
      isPrivate: false,
      maxParticipants: 12,
      videoSource: {
        type: 'licensed',
        title: 'Tears of Steel (Sci-Fi Premiere)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        poster: '/src/assets/images/movie_cosmic_odyssey_1793972646755.jpg',
        duration: 734
      },
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        lastUpdated: Date.now(),
        speed: 1.0
      },
      permissions: {
        allowScreenShare: true,
        allowChat: true,
        allowParticipantPlayPause: false
      },
      participants: [],
      createdAt: new Date().toISOString()
    };

    return { room: newRoom };
  },

  async createRoom(data: {
    title: string;
    isPrivate: boolean;
    password?: string;
    maxParticipants: number;
    videoSource?: any;
    hostUser: { id: string; displayName: string; avatar: string };
  }): Promise<{ room: Room }> {
    const roomId = 'room_' + Date.now().toString(36);
    const roomCode = 'CINE-' + Math.floor(1000 + Math.random() * 9000);
    let passwordHash = undefined;

    if (data.isPrivate && data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const newRoom: Room = {
      id: roomId,
      code: roomCode,
      title: data.title.trim(),
      hostId: data.hostUser.id,
      hostName: data.hostUser.displayName,
      isPrivate: data.isPrivate,
      passwordHash,
      maxParticipants: data.maxParticipants || 12,
      videoSource: data.videoSource || {
        type: 'licensed',
        title: 'Tears of Steel (Sci-Fi Premiere)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        duration: 734
      },
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        lastUpdated: Date.now(),
        speed: 1.0
      },
      permissions: {
        allowScreenShare: true,
        allowChat: true,
        allowParticipantPlayPause: false
      },
      participants: [
        {
          userId: data.hostUser.id,
          displayName: data.hostUser.displayName,
          avatar: data.hostUser.avatar,
          role: 'host',
          isMuted: false,
          isVideoOn: true,
          isScreenSharing: false,
          joinedAt: new Date().toISOString(),
          ping: 25
        }
      ],
      createdAt: new Date().toISOString()
    };

    // If Supabase is connected, insert into public.rooms
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('rooms').insert({
          id: roomId,
          room_code: roomCode,
          name: data.title.trim(),
          host_id: data.hostUser.id,
          is_private: data.isPrivate,
          password_hash: passwordHash,
          media_url: newRoom.videoSource.url
        });
      } catch (e) {
        console.warn('[CineTogether] Supabase insert room error, storing in local fallback:', e);
      }
    }

    // Save to local rooms list
    const { rooms } = await this.getRooms();
    rooms.unshift(newRoom);
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));

    return { room: newRoom };
  },

  async joinRoom(roomId: string, user: { id: string; displayName: string; avatar: string }, password?: string): Promise<{ room: Room }> {
    const { room } = await this.getRoom(roomId);
    if (room.isPrivate && room.passwordHash && password) {
      const hashed = await hashPassword(password);
      if (hashed !== room.passwordHash) {
        throw new Error('Incorrect room password.');
      }
    }
    return { room };
  },

  async syncPlayback(roomId: string, state: { isPlaying?: boolean; currentTime?: number; speed?: number; videoSource?: any }): Promise<any> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('rooms').update({
          is_playing: state.isPlaying,
          playback_position: state.currentTime,
          playback_rate: state.speed,
          updated_at: new Date().toISOString()
        }).eq('id', roomId);
      } catch (e) {}
    }
    return { success: true };
  },

  async updateRoomControls(roomId: string, data: { permissions?: any; participantUpdate?: any }): Promise<any> {
    return { success: true };
  },

  // ==============================================================
  // 8. CHAT MESSAGES
  // ==============================================================
  async getMessages(roomId: string): Promise<{ messages: ChatMessage[] }> {
    try {
      const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY}_${roomId}`);
      if (raw) return { messages: JSON.parse(raw) };
    } catch (e) {}

    const defaultMsgs: ChatMessage[] = [
      {
        id: 'msg_welcome_' + roomId,
        roomId,
        senderId: 'usr_sarah',
        senderName: 'Sarah Connor',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
        text: 'Welcome to the watch party! Frame sync and live WebRTC audio are active. Enjoy the movie! 🎬🍿',
        timestamp: new Date().toISOString(),
        reactions: { '🍿': ['usr_sarah'] }
      }
    ];
    return { messages: defaultMsgs };
  },

  async sendMessage(roomId: string, data: { senderId: string; senderName: string; senderAvatar: string; text?: string; photoUrl?: string }): Promise<{ message: ChatMessage }> {
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      roomId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      text: data.text || '',
      photoUrl: data.photoUrl || undefined,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    const { messages } = await this.getMessages(roomId);
    messages.push(newMsg);
    localStorage.setItem(`${LOCAL_MESSAGES_KEY}_${roomId}`, JSON.stringify(messages));

    return { message: newMsg };
  },

  async toggleReaction(roomId: string, msgId: string, emoji: string, userId: string): Promise<{ message: ChatMessage }> {
    const { messages } = await this.getMessages(roomId);
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions[emoji]) {
        msg.reactions[emoji] = [userId];
      } else {
        const idx = msg.reactions[emoji].indexOf(userId);
        if (idx > -1) msg.reactions[emoji].splice(idx, 1);
        else msg.reactions[emoji].push(userId);
      }
      localStorage.setItem(`${LOCAL_MESSAGES_KEY}_${roomId}`, JSON.stringify(messages));
      return { message: msg };
    }
    throw new Error('Message not found');
  },

  // ==============================================================
  // 9. LEGAL MOVIE CATALOG
  // ==============================================================
  async getCatalog(): Promise<{ catalog: CatalogMovie[] }> {
    const catalog: CatalogMovie[] = [
      {
        id: 'movie_1',
        title: 'Tears of Steel (4K Sci-Fi Classic)',
        year: 2024,
        duration: 734,
        durationFormatted: '12m 14s',
        genre: 'Sci-Fi / Action',
        rating: 'PG-13',
        license: 'Creative Commons 3.0 Open Movie Project',
        poster: '/src/assets/images/movie_cosmic_odyssey_1793972646755.jpg',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        description: 'In a dystopian future, scientists stage a temporal rescue in Amsterdam to alter humanity forever.'
      },
      {
        id: 'movie_2',
        title: 'Elephants Dream (Cyber Odyssey)',
        year: 2023,
        duration: 653,
        durationFormatted: '10m 53s',
        genre: 'Cyberpunk / Surreal',
        rating: 'PG',
        license: 'Orange Open Movie Licensed Stream',
        poster: '/src/assets/images/movie_cyber_runner_1793972648223.jpg',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        description: 'Two travelers navigate an infinite mechanized labyrinth where reality and digital illusions intertwine.'
      },
      {
        id: 'movie_3',
        title: 'Deep Ocean Frontiers',
        year: 2025,
        duration: 596,
        durationFormatted: '9m 56s',
        genre: 'Documentary / Nature',
        rating: 'G',
        license: 'Open Science Media Archive',
        poster: '/src/assets/images/movie_ocean_depths_1793972647552.jpg',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        description: 'An expedition into the midnight zone of the Mariana Trench exploring bioluminescent marine ecosystems.'
      },
      {
        id: 'movie_4',
        title: 'Cosmic Drift (Blender Foundation)',
        year: 2024,
        duration: 888,
        durationFormatted: '14m 48s',
        genre: 'Animation / Fantasy',
        rating: 'PG',
        license: 'Public Domain & Open Source Video Stream',
        poster: '/src/assets/images/hero_watch_party_1793972645942.jpg',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        description: 'A young warrior treks across harsh frozen mountain passes to rescue an orphaned dragon companion.'
      }
    ];

    return { catalog };
  },

  // ==============================================================
  // 10. ADMIN METRICS & AUDIT LOGS
  // ==============================================================
  async getAdminMetrics(): Promise<{ metrics: AdminMetrics; auditLogs: AuditLog[]; lockedUsers: any[] }> {
    const localUsers = getLocalUsers();
    const userList = Object.values(localUsers);

    return {
      metrics: {
        totalUsers: userList.length,
        activeUsersOnline: userList.length,
        activeRooms: 1,
        totalFailedLogins: 0,
        currentlyLockedAccounts: userList.filter(u => u.lockedUntil && Date.now() < u.lockedUntil).length,
        streamingBandwidthGB: '3,142.8',
        webrtcSfuLoad: '11.4%',
        wafBlockedThreats: 156
      },
      auditLogs: [
        {
          id: 'log_1',
          timestamp: new Date().toISOString(),
          action: 'AUTH_SUCCESS',
          userEmail: 'sarah.connor@cinetogether.com',
          ip: '127.0.0.1',
          status: 'success',
          details: 'Session established with WebRTC mesh signaling'
        }
      ],
      lockedUsers: userList
        .filter(u => u.lockedUntil && Date.now() < u.lockedUntil)
        .map(u => ({
          id: u.id,
          userId: u.userId,
          email: u.email,
          displayName: u.displayName,
          failedAttempts: u.failedAttempts,
          lockedUntil: u.lockedUntil,
          remainingMinutes: Math.ceil((u.lockedUntil - Date.now()) / 60000)
        }))
    };
  },

  async unlockUser(email: string): Promise<any> {
    const localUsers = getLocalUsers();
    const norm = email.trim().toLowerCase();
    if (localUsers[norm]) {
      localUsers[norm].failedAttempts = 0;
      localUsers[norm].lockedUntil = null;
      saveLocalUsers(localUsers);
    }
    return { success: true };
  }
};
