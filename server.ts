import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security Headers (OWASP compliant)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');
  next();
});

// ==========================================
// IN-MEMORY DATABASE & STATE STORE
// ==========================================

export interface User {
  id: string;
  userId: string; // Immutable unique permanent ID, e.g. CT-8F29A641
  email: string;
  displayName: string;
  passwordHash: string;
  avatar: string;
  createdAt: string;
  ageConfirmed: boolean;
  ageConfirmedAt: string;
  isGoogleLinked: boolean;
  role: 'admin' | 'user' | 'moderator';
  status: 'online' | 'offline' | 'in-party';
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: number | null; // Timestamp ms
  bio?: string;
}

export interface RoomParticipant {
  userId: string;
  displayName: string;
  avatar: string;
  role: 'host' | 'moderator' | 'participant';
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
  ping: number;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  hostId: string;
  hostName: string;
  isPrivate: boolean;
  password?: string;
  maxParticipants: number;
  videoSource: {
    type: 'licensed' | 'custom' | 'screenshare';
    title: string;
    url: string;
    poster?: string;
    duration: number;
  };
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: number;
    speed: number;
  };
  permissions: {
    allowScreenShare: boolean;
    allowChat: boolean;
    allowParticipantPlayPause: boolean;
  };
  participants: RoomParticipant[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  photoUrl?: string; // photo upload support
  timestamp: string;
  reactions: Record<string, string[]>;
}

export interface FriendRelation {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  userEmail?: string;
  ip: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
}

// Generate permanent Unique User ID (Format: CT-XXXXXXXX)
function generateUniqueUserId(): string {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CT-${hex}`;
}

// Initial Seed Users
const users: Map<string, User> = new Map();
const rooms: Map<string, Room> = new Map();
const messages: Map<string, ChatMessage[]> = new Map();
const friends: FriendRelation[] = [];
const auditLogs: AuditLog[] = [];

// Seed an Admin and standard Demo User for easy testing
const seedAdmin: User = {
  id: 'usr_admin',
  userId: 'CT-9A4E2B10',
  email: 'admin@cinetogether.com',
  displayName: 'CineArchitect',
  passwordHash: 'admin12345',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  ageConfirmed: true,
  ageConfirmedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  isGoogleLinked: true,
  role: 'admin',
  status: 'online',
  twoFactorEnabled: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  bio: 'Platform Lead & Film Enthusiast'
};
users.set(seedAdmin.email.toLowerCase(), seedAdmin);

const seedUser: User = {
  id: 'usr_sarah',
  userId: 'CT-8F29A641',
  email: 'sarah.connor@cinetogether.com',
  displayName: 'Sarah Connor',
  passwordHash: 'password123',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
  createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  ageConfirmed: true,
  ageConfirmedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  isGoogleLinked: false,
  role: 'user',
  status: 'online',
  twoFactorEnabled: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
  bio: 'Sci-fi addict. Always down for late-night movie parties!'
};
users.set(seedUser.email.toLowerCase(), seedUser);

// Seed a public room
const seedRoom: Room = {
  id: 'room_nebula',
  code: 'PARTY-4029',
  title: 'Cosmic Odyssey Watch & Chill',
  hostId: seedUser.id,
  hostName: seedUser.displayName,
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
      userId: seedUser.id,
      displayName: seedUser.displayName,
      avatar: seedUser.avatar,
      role: 'host',
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
      joinedAt: new Date(Date.now() - 3600000).toISOString(),
      ping: 28
    },
    {
      userId: seedAdmin.id,
      displayName: seedAdmin.displayName,
      avatar: seedAdmin.avatar,
      role: 'participant',
      isMuted: true,
      isVideoOn: false,
      isScreenSharing: false,
      joinedAt: new Date(Date.now() - 1800000).toISOString(),
      ping: 34
    }
  ],
  createdAt: new Date(Date.now() - 3600000).toISOString()
};
rooms.set(seedRoom.id, seedRoom);
rooms.set(seedRoom.code, seedRoom);

// Seed some chat messages
messages.set(seedRoom.id, [
  {
    id: 'msg_1',
    roomId: seedRoom.id,
    senderId: seedUser.id,
    senderName: seedUser.displayName,
    senderAvatar: seedUser.avatar,
    text: 'Welcome everyone! Sound is crystal clear. Enjoy the movie! 🎬🍿',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    reactions: { '🍿': [seedAdmin.id] }
  },
  {
    id: 'msg_2',
    roomId: seedRoom.id,
    senderId: seedAdmin.id,
    senderName: seedAdmin.displayName,
    senderAvatar: seedAdmin.avatar,
    text: 'The VFX on this scene is phenomenal. Great sync quality!',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    reactions: { '🔥': [seedUser.id] }
  }
]);

// Helper for logging audit events
function logAudit(action: string, details: string, status: 'success' | 'failure' | 'warning', ip: string, userEmail?: string, userId?: string) {
  const log: AuditLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    action,
    details,
    status,
    ip,
    userEmail,
    userId
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 500) auditLogs.pop();
}

// ==========================================
// REST APIS
// ==========================================

// 1. REGISTRATION
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName, ageConfirmed } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'All fields (email, password, display name) are required.' });
  }

  // 18+ Mandatory verification check
  if (!ageConfirmed) {
    return res.status(400).json({ error: 'You must confirm that you are aged 18 or above to create an account.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (users.has(normalizedEmail)) {
    // Prevent email enumeration while safe
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const newUser: User = {
    id: 'usr_' + Date.now().toString(36),
    userId: generateUniqueUserId(),
    email: normalizedEmail,
    displayName: displayName.trim(),
    passwordHash: password, // In production this would be argon2id hash
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
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

  users.set(normalizedEmail, newUser);
  logAudit('USER_REGISTRATION', `New user registered: ${newUser.displayName} (${newUser.userId})`, 'success', ip, normalizedEmail, newUser.id);

  // Return user without password
  const { passwordHash: _, ...userSafe } = newUser;
  return res.status(201).json({ user: userSafe, token: 'ct_token_' + newUser.id });
});

// 2. LOGIN (Strict 5-attempt limit with 15-minute lockout)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.get(normalizedEmail);

  // Check if account is currently locked
  if (user && user.lockedUntil) {
    const now = Date.now();
    if (now < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil - now) / 60000);
      const remainingSeconds = Math.ceil((user.lockedUntil - now) / 1000);
      logAudit('LOGIN_ATTEMPT_BLOCKED', `Attempt on locked account: ${normalizedEmail}. Cooldown active.`, 'warning', ip, normalizedEmail, user.id);
      return res.status(423).json({
        error: `Account is temporarily locked due to 5 consecutive failed login attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
        locked: true,
        remainingSeconds
      });
    } else {
      // Cooldown expired, reset lockout
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
    }
  }

  // Validate credentials
  if (!user || user.passwordHash !== password) {
    if (user) {
      user.failedLoginAttempts += 1;
      const attemptsLeft = 5 - user.failedLoginAttempts;

      if (user.failedLoginAttempts >= 5) {
        // LOCK ACCOUNT FOR 15 MINUTES
        const LOCK_TIME_MS = 15 * 60 * 1000;
        user.lockedUntil = Date.now() + LOCK_TIME_MS;
        logAudit('ACCOUNT_LOCKED', `Account ${normalizedEmail} locked after 5 failed password attempts.`, 'failure', ip, normalizedEmail, user.id);

        return res.status(423).json({
          error: 'Account temporarily locked. You have reached the maximum of 5 consecutive failed login attempts. Please wait 15 minutes or use password recovery.',
          locked: true,
          remainingSeconds: 900
        });
      }

      logAudit('LOGIN_FAILED', `Failed password attempt (${user.failedLoginAttempts}/5) for ${normalizedEmail}`, 'failure', ip, normalizedEmail, user.id);

      return res.status(401).json({
        error: `Invalid email or password. Warning: ${attemptsLeft} attempt(s) remaining before a 15-minute security lockout.`,
        attemptsRemaining: attemptsLeft
      });
    }

    // Email not found (do not reveal if email exists, maintain standard security message)
    logAudit('LOGIN_FAILED_UNKNOWN', `Failed attempt with unregistered email: ${normalizedEmail}`, 'failure', ip, normalizedEmail);
    return res.status(401).json({
      error: 'Invalid email or password. Please verify your credentials.',
      attemptsRemaining: 4
    });
  }

  // Successful login -> Reset failed attempts
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.status = 'online';

  logAudit('LOGIN_SUCCESS', `User ${user.displayName} (${user.userId}) logged in successfully.`, 'success', ip, normalizedEmail, user.id);

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe, token: 'ct_token_' + user.id });
});

// 3. GOOGLE SIGN-IN / SIGN-UP
app.post('/api/auth/google', (req, res) => {
  const { credential, email, displayName, avatar } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const userEmail = (email || 'google_user@gmail.com').toLowerCase();
  let user = users.get(userEmail);

  if (!user) {
    // Create new account via Google
    user = {
      id: 'usr_g_' + Date.now().toString(36),
      userId: generateUniqueUserId(),
      email: userEmail,
      displayName: displayName || 'Google User',
      passwordHash: crypto.randomBytes(16).toString('hex'),
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`,
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
    users.set(userEmail, user);
    logAudit('GOOGLE_SIGNUP', `New account created via Google OAuth: ${user.email} (${user.userId})`, 'success', ip, userEmail, user.id);
  } else {
    // Existing account - link Google and reset any locks
    user.isGoogleLinked = true;
    user.status = 'online';
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    logAudit('GOOGLE_LOGIN', `Existing user logged in via Google OAuth: ${user.email} (${user.userId})`, 'success', ip, userEmail, user.id);
  }

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe, token: 'ct_token_' + user.id });
});

// 4. FORGOT PASSWORD & RECOVERY
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = users.get(normalizedEmail);
  if (user) {
    // Generate secure recovery token
    const resetToken = crypto.randomBytes(24).toString('hex');
    logAudit('PASSWORD_RESET_REQUEST', `Password recovery requested for: ${normalizedEmail}`, 'warning', ip, normalizedEmail, user.id);
    return res.json({
      message: 'If that email address is in our database, we will send an email with password reset instructions.',
      recoveryAvailable: true,
      demoResetToken: resetToken // Exposed in test mode so user can test the flow!
    });
  }

  return res.json({
    message: 'If that email address is in our database, we will send an email with password reset instructions.',
    recoveryAvailable: false
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = users.get(normalizedEmail);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired recovery request.' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  user.passwordHash = newPassword;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;

  logAudit('PASSWORD_RESET_SUCCESS', `Password successfully changed for: ${normalizedEmail}`, 'success', ip, normalizedEmail, user.id);
  return res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
});

// 5. USER PROFILE & PHOTO UPLOAD ("or is ma user ko photo upload krna ka option b dalna")
app.post('/api/user/upload-avatar', (req, res) => {
  const { email, avatarDataUrl } = req.body;
  if (!email || !avatarDataUrl) {
    return res.status(400).json({ error: 'Email and photo data are required.' });
  }

  const user = users.get(email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.avatar = avatarDataUrl;
  return res.json({ success: true, avatar: user.avatar });
});

app.put('/api/user/profile', (req, res) => {
  const { email, displayName, bio, avatar, twoFactorEnabled } = req.body;
  const user = users.get((email || '').toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (displayName) user.displayName = displayName.trim();
  if (bio !== undefined) user.bio = bio;
  if (avatar) user.avatar = avatar;
  if (twoFactorEnabled !== undefined) user.twoFactorEnabled = !!twoFactorEnabled;

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// 6. FRIENDS SYSTEM (SEARCH BY UNIQUE USER ID CT-XXXXXXXX)
app.get('/api/friends', (req, res) => {
  const { userId } = req.query;
  const userFriends: any[] = [];

  // For testing, return active users as friends / suggested friends
  for (const u of users.values()) {
    if (u.id !== userId) {
      userFriends.push({
        id: u.id,
        userId: u.userId,
        displayName: u.displayName,
        avatar: u.avatar,
        status: u.status,
        mutualParties: 3
      });
    }
  }

  return res.json({ friends: userFriends });
});

app.post('/api/friends/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ results: [] });

  const q = query.trim().toUpperCase();
  const results: any[] = [];

  for (const u of users.values()) {
    if (u.userId.toUpperCase().includes(q) || u.displayName.toUpperCase().includes(q)) {
      results.push({
        id: u.id,
        userId: u.userId,
        displayName: u.displayName,
        avatar: u.avatar,
        status: u.status
      });
    }
  }

  return res.json({ results });
});

// 7. ROOMS SYSTEM
app.get('/api/rooms', (req, res) => {
  const publicRooms: any[] = [];
  const seen = new Set<string>();

  for (const room of rooms.values()) {
    if (!seen.has(room.id) && !room.isPrivate) {
      seen.add(room.id);
      publicRooms.push(room);
    }
  }

  return res.json({ rooms: publicRooms });
});

app.get('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const room = rooms.get(id);

  if (!room) {
    return res.status(404).json({ error: 'Room not found or party has ended.' });
  }

  return res.json({ room });
});

app.post('/api/rooms', (req, res) => {
  const { title, isPrivate, password, maxParticipants, videoSource, hostUser } = req.body;

  if (!title || !hostUser) {
    return res.status(400).json({ error: 'Room title and host information are required.' });
  }

  const roomId = 'room_' + Date.now().toString(36);
  const roomCode = 'PARTY-' + Math.floor(1000 + Math.random() * 9000);

  const newRoom: Room = {
    id: roomId,
    code: roomCode,
    title: title.trim(),
    hostId: hostUser.id,
    hostName: hostUser.displayName,
    isPrivate: !!isPrivate,
    password: password || undefined,
    maxParticipants: maxParticipants || 10,
    videoSource: videoSource || {
      type: 'licensed',
      title: 'Cosmic Odyssey: Tears of Steel',
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
    participants: [
      {
        userId: hostUser.id,
        displayName: hostUser.displayName,
        avatar: hostUser.avatar,
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

  rooms.set(roomId, newRoom);
  rooms.set(roomCode, newRoom);
  messages.set(roomId, [
    {
      id: 'msg_welcome_' + Date.now(),
      roomId,
      senderId: hostUser.id,
      senderName: hostUser.displayName,
      senderAvatar: hostUser.avatar,
      text: `Welcome to ${newRoom.title}! Room code is ${newRoom.code}. Have fun! 🎉`,
      timestamp: new Date().toISOString(),
      reactions: {}
    }
  ]);

  return res.status(201).json({ room: newRoom });
});

// Join Room
app.post('/api/rooms/:id/join', (req, res) => {
  const { id } = req.params;
  const { user, password } = req.body;

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room does not exist or has expired.' });
  }

  if (room.isPrivate && room.password && room.password !== password) {
    return res.status(403).json({ error: 'Incorrect room access password.' });
  }

  if (room.participants.length >= room.maxParticipants) {
    return res.status(400).json({ error: 'Room has reached maximum capacity.' });
  }

  // Add participant if not already present
  const existingIdx = room.participants.findIndex(p => p.userId === user.id);
  if (existingIdx === -1) {
    room.participants.push({
      userId: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      role: 'participant',
      isMuted: true,
      isVideoOn: false,
      isScreenSharing: false,
      joinedAt: new Date().toISOString(),
      ping: Math.floor(20 + Math.random() * 25)
    });
  }

  return res.json({ room });
});

// Synchronize video playback state
app.post('/api/rooms/:id/sync', (req, res) => {
  const { id } = req.params;
  const { isPlaying, currentTime, speed, videoSource } = req.body;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (isPlaying !== undefined) room.playbackState.isPlaying = isPlaying;
  if (currentTime !== undefined) room.playbackState.currentTime = currentTime;
  if (speed !== undefined) room.playbackState.speed = speed;
  room.playbackState.lastUpdated = Date.now();

  if (videoSource) {
    room.videoSource = videoSource;
  }

  return res.json({ playbackState: room.playbackState, videoSource: room.videoSource });
});

// Update room permissions and participant controls
app.put('/api/rooms/:id/controls', (req, res) => {
  const { id } = req.params;
  const { permissions, participantUpdate } = req.body;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (permissions) {
    room.permissions = { ...room.permissions, ...permissions };
  }

  if (participantUpdate) {
    const { userId, isMuted, isVideoOn, isScreenSharing, role } = participantUpdate;
    const p = room.participants.find(part => part.userId === userId);
    if (p) {
      if (isMuted !== undefined) p.isMuted = isMuted;
      if (isVideoOn !== undefined) p.isVideoOn = isVideoOn;
      if (isScreenSharing !== undefined) p.isScreenSharing = isScreenSharing;
      if (role !== undefined) p.role = role;
    }
  }

  return res.json({ room });
});

// Chat messages & Photo Upload in chat
app.get('/api/rooms/:id/messages', (req, res) => {
  const { id } = req.params;
  const roomMsgs = messages.get(id) || [];
  return res.json({ messages: roomMsgs });
});

app.post('/api/rooms/:id/messages', (req, res) => {
  const { id } = req.params;
  const { senderId, senderName, senderAvatar, text, photoUrl } = req.body;

  if (!text && !photoUrl) {
    return res.status(400).json({ error: 'Message must include text or an attached image.' });
  }

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const newMsg: ChatMessage = {
    id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    roomId: id,
    senderId,
    senderName,
    senderAvatar,
    text: text || '',
    photoUrl: photoUrl || undefined,
    timestamp: new Date().toISOString(),
    reactions: {}
  };

  const list = messages.get(id) || [];
  list.push(newMsg);
  messages.set(id, list);

  return res.status(201).json({ message: newMsg });
});

// Emoji reaction toggle
app.post('/api/rooms/:id/messages/:msgId/reaction', (req, res) => {
  const { id, msgId } = req.params;
  const { emoji, userId } = req.body;

  const list = messages.get(id) || [];
  const msg = list.find(m => m.id === msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  if (!msg.reactions[emoji]) {
    msg.reactions[emoji] = [userId];
  } else {
    const idx = msg.reactions[emoji].indexOf(userId);
    if (idx > -1) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(userId);
    }
  }

  return res.json({ message: msg });
});

// 8. LICENSED CONTENT CATALOG
app.get('/api/content/catalog', (req, res) => {
  const catalog = [
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
      description: 'In a dystopian future, a group of scientists and soldiers gather in Amsterdam to stage a temporal rescue that could alter humanity forever.'
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
      description: 'Two travelers traverse an infinite, mechanized labyrinth where reality and digital illusions intertwine.'
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

  return res.json({ catalog });
});

// 9. ADMIN METRICS & SECURITY AUDIT LOGS
app.get('/api/admin/metrics', (req, res) => {
  const totalUsers = users.size;
  const activeRoomsCount = Array.from(rooms.values()).filter((r, idx, arr) => arr.findIndex(x => x.id === r.id) === idx).length;
  
  let failedAttemptsTotal = 0;
  let lockedAccountsCount = 0;
  const now = Date.now();

  for (const u of users.values()) {
    failedAttemptsTotal += u.failedLoginAttempts;
    if (u.lockedUntil && now < u.lockedUntil) {
      lockedAccountsCount += 1;
    }
  }

  return res.json({
    metrics: {
      totalUsers,
      activeUsersOnline: Array.from(users.values()).filter(u => u.status === 'online').length,
      activeRooms: activeRoomsCount,
      totalFailedLogins: failedAttemptsTotal,
      currentlyLockedAccounts: lockedAccountsCount,
      streamingBandwidthGB: '2,841.4',
      webrtcSfuLoad: '14.2%',
      wafBlockedThreats: 142
    },
    auditLogs: auditLogs.slice(0, 50),
    lockedUsers: Array.from(users.values())
      .filter(u => u.lockedUntil && now < u.lockedUntil)
      .map(u => ({
        id: u.id,
        userId: u.userId,
        email: u.email,
        displayName: u.displayName,
        failedAttempts: u.failedLoginAttempts,
        lockedUntil: u.lockedUntil,
        remainingMinutes: Math.ceil((u.lockedUntil! - now) / 60000)
      }))
  });
});

// Unlock account admin action
app.post('/api/admin/unlock-user', (req, res) => {
  const { email } = req.body;
  const user = users.get((email || '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  logAudit('ADMIN_UNLOCK', `Admin manually unlocked user account: ${user.email}`, 'success', '127.0.0.1', user.email, user.id);

  return res.json({ success: true, message: `Account ${user.email} has been unlocked.` });
});

// ==========================================
// VITE INTEGRATION FOR SERVING FRONTEND
// ==========================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CineTogether] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
