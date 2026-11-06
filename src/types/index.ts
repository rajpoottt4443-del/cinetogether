export interface User {
  id: string;
  userId: string; // Permanent Unique ID e.g. CT-8F29A641
  email: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  ageConfirmed: boolean;
  ageConfirmedAt: string;
  isGoogleLinked: boolean;
  role: 'admin' | 'user' | 'moderator';
  status: 'online' | 'offline' | 'in-party';
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: number | null;
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

export interface VideoSource {
  type: 'licensed' | 'custom' | 'screenshare' | 'local_file';
  title: string;
  url: string;
  poster?: string;
  duration: number;
  fileName?: string;
  isHls?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  speed: number;
}

export interface SyncPayload {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  sentAt: number;
  videoSource?: VideoSource;
}

export interface RoomPermissions {
  allowScreenShare: boolean;
  allowChat: boolean;
  allowParticipantPlayPause: boolean;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  hostId: string;
  hostName: string;
  isPrivate: boolean;
  password?: string;
  passwordHash?: string;
  maxParticipants: number;
  videoSource: VideoSource;
  playbackState: PlaybackState;
  permissions: RoomPermissions;
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

export interface Friend {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'offline' | 'in-party';
  mutualParties: number;
}

export interface CatalogMovie {
  id: string;
  title: string;
  year: number;
  duration: number;
  durationFormatted: string;
  genre: string;
  rating: string;
  license: string;
  poster: string;
  url: string;
  description: string;
  isHls?: boolean;
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

export interface AdminMetrics {
  totalUsers: number;
  activeUsersOnline: number;
  activeRooms: number;
  totalFailedLogins: number;
  currentlyLockedAccounts: number;
  streamingBandwidthGB: string;
  webrtcSfuLoad: string;
  wafBlockedThreats: number;
}
