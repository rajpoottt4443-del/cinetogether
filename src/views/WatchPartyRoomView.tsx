import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Share2, 
  Video, VideoOff, Mic, MicOff, Monitor, Settings, Users, 
  MessageSquare, Send, Image as ImageIcon, Smile, Smartphone, 
  Shield, Check, Copy, AlertCircle, RefreshCw, Radio, Sparkles, FolderPlus,
  HelpCircle
} from 'lucide-react';
import Hls from 'hls.js';
import { Room, ChatMessage, CatalogMovie, SyncPayload, VideoSource } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoomSignalingChannel, ICE_SERVERS } from '../lib/supabase';
import { AndroidCompanionModal } from '../components/AndroidCompanionModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';

interface WatchPartyRoomViewProps {
  roomId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const WatchPartyRoomView: React.FC<WatchPartyRoomViewProps> = ({ roomId, onNavigate }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback & Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const userWebcamRef = useRef<HTMLVideoElement>(null);
  const hlsInstance = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'catalog' | 'local'>('chat');

  // WebRTC User Media State
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const localMediaStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Realtime Signaling Channel (Supabase Realtime Broadcast or Local BroadcastChannel)
  const signalingChannel = useRef<RoomSignalingChannel | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [lastSyncLag, setLastSyncLag] = useState<number>(0);

  // Chat State & Photo Upload in Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [isChatPhotoModalOpen, setIsChatPhotoModalOpen] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMovie[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Local File Video Playback
  const [localFileObjectUrl, setLocalFileObjectUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Load Room Data & Messages
  const fetchRoomData = async () => {
    try {
      const res = await api.getRoom(roomId);
      setRoom(res.room);
      setIsPlaying(res.room.playbackState.isPlaying);

      const msgRes = await api.getMessages(res.room.id);
      setMessages(msgRes.messages);

      // Initialize Signaling Channel
      initSignaling(res.room.code);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to room.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
    api.getCatalog().then(res => setCatalog(res.catalog)).catch(() => {});

    return () => {
      stopUserMedia();
      stopScreenShare();
      if (hlsInstance.current) {
        hlsInstance.current.destroy();
      }
      if (signalingChannel.current) {
        signalingChannel.current.close();
      }
    };
  }, [roomId]);

  // Load video source and setup HLS if applicable
  useEffect(() => {
    if (!room || !videoRef.current) return;

    const sourceUrl = localFileObjectUrl || room.videoSource.url;
    if (!sourceUrl) return;

    if (hlsInstance.current) {
      hlsInstance.current.destroy();
      hlsInstance.current = null;
    }

    const isHls = sourceUrl.includes('.m3u8') || room.videoSource.isHls;
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(sourceUrl);
      hls.attachMedia(videoRef.current);
      hlsInstance.current = hls;
    } else {
      videoRef.current.src = sourceUrl;
    }
  }, [room?.videoSource?.url, localFileObjectUrl]);

  // Scroll chat on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==============================================================
  // MATHEMATICAL PLAYBACK SYNCHRONIZATION LOGIC (CRITICAL FIX)
  // ==============================================================
  const initSignaling = (roomCode: string) => {
    if (signalingChannel.current) {
      signalingChannel.current.close();
    }

    const channel = new RoomSignalingChannel(roomCode);
    signalingChannel.current = channel;

    // Track presence
    if (user) {
      channel.trackPresence({
        userId: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        joinedAt: new Date().toISOString()
      });
    }

    channel.onPresence((presenceList) => {
      setConnectedPeers(presenceList.map(p => p.userId || p.id));
    });

    // Handle incoming broadcast events
    channel.onEvent((event, payload: any) => {
      if (event === 'playback_sync') {
        handleIncomingSync(payload);
      } else if (event === 'chat_message') {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      } else if (event === 'webrtc_offer') {
        handleWebRtcOffer(payload);
      } else if (event === 'webrtc_answer') {
        handleWebRtcAnswer(payload);
      } else if (event === 'webrtc_ice') {
        handleWebRtcIce(payload);
      }
    });
  };

  /**
   * Process Drift-Corrected Sync Payload from Host
   */
  const handleIncomingSync = (payload: SyncPayload) => {
    if (!videoRef.current || !room) return;
    const isHost = user?.id === room.hostId;
    if (isHost) return; // Host maintains authoritative clock

    // 1. Calculate network transit latency
    const networkLatencySec = Math.max(0, (Date.now() - payload.sentAt) / 1000);
    setLastSyncLag(Math.round(networkLatencySec * 1000));

    // 2. Compensate mathematically for ongoing playback
    const targetTime = payload.isPlaying
      ? payload.currentTime + (networkLatencySec * payload.playbackRate)
      : payload.currentTime;

    // 3. Drift Threshold Check: Only seek if absolute variance > 0.75 seconds to avoid micro-stutter
    const drift = Math.abs(videoRef.current.currentTime - targetTime);
    if (drift > 0.75) {
      videoRef.current.currentTime = targetTime;
    }

    // 4. Synchronize Play/Pause State
    if (payload.isPlaying !== isPlaying) {
      setIsPlaying(payload.isPlaying);
      if (payload.isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }

    // 5. Synchronize Playback Speed Rate
    if (payload.playbackRate && videoRef.current.playbackRate !== payload.playbackRate) {
      videoRef.current.playbackRate = payload.playbackRate;
      setPlaybackRate(payload.playbackRate);
    }

    // 6. Synchronize Media Source if changed by Host
    if (payload.videoSource && payload.videoSource.url !== room.videoSource.url) {
      setRoom(prev => prev ? { ...prev, videoSource: payload.videoSource! } : null);
    }
  };

  /**
   * 4-Second Host Heartbeat Sync
   */
  useEffect(() => {
    if (!room || user?.id !== room.hostId || !isPlaying) return;

    const heartbeatInterval = setInterval(() => {
      if (videoRef.current && signalingChannel.current) {
        const payload: SyncPayload = {
          isPlaying: true,
          currentTime: videoRef.current.currentTime,
          playbackRate: videoRef.current.playbackRate,
          sentAt: Date.now()
        };
        signalingChannel.current.broadcast('playback_sync', payload);
      }
    }, 4000);

    return () => clearInterval(heartbeatInterval);
  }, [room?.hostId, user?.id, isPlaying]);

  // Host Action: Broadcast Play / Pause
  const handleTogglePlay = () => {
    if (!room || !videoRef.current) return;
    const isHost = user?.id === room.hostId;
    if (!isHost && !room.permissions.allowParticipantPlayPause) {
      alert('Only the room host can pause or resume playback.');
      return;
    }

    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }

    // Broadcast immediate sync
    if (signalingChannel.current) {
      const payload: SyncPayload = {
        isPlaying: nextState,
        currentTime: videoRef.current.currentTime,
        playbackRate,
        sentAt: Date.now()
      };
      signalingChannel.current.broadcast('playback_sync', payload);
    }
  };

  // Host Action: Broadcast Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (!videoRef.current || !room) return;

    videoRef.current.currentTime = newTime;

    if (user?.id === room.hostId && signalingChannel.current) {
      const payload: SyncPayload = {
        isPlaying,
        currentTime: newTime,
        playbackRate,
        sentAt: Date.now()
      };
      signalingChannel.current.broadcast('playback_sync', payload);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Switch movie from catalog
  const handleSwitchMovie = async (movie: CatalogMovie) => {
    if (!room || user?.id !== room.hostId) {
      alert('Only the room host can change the playing movie.');
      return;
    }

    const newSource: VideoSource = {
      type: 'licensed',
      title: movie.title,
      url: movie.url,
      poster: movie.poster,
      duration: movie.duration,
      isHls: movie.isHls
    };

    setLocalFileObjectUrl(null);
    setLocalFileName(null);
    setRoom(prev => prev ? { ...prev, videoSource: newSource } : null);

    if (signalingChannel.current) {
      const payload: SyncPayload = {
        isPlaying: true,
        currentTime: 0,
        playbackRate: 1.0,
        sentAt: Date.now(),
        videoSource: newSource
      };
      signalingChannel.current.broadcast('playback_sync', payload);
    }

    setActiveTab('chat');
  };

  // Local File Picker (Zero-Server-Storage Movie Watching!)
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalFileObjectUrl(objectUrl);
    setLocalFileName(file.name);

    if (videoRef.current) {
      videoRef.current.src = objectUrl;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    // Broadcast file details so peers know what movie is selected
    if (signalingChannel.current && room && user?.id === room.hostId) {
      const newSource: VideoSource = {
        type: 'local_file',
        title: `Local File: ${file.name}`,
        url: '',
        fileName: file.name,
        duration: 7200
      };
      setRoom(prev => prev ? { ...prev, videoSource: newSource } : null);
      signalingChannel.current.broadcast('playback_sync', {
        isPlaying: true,
        currentTime: 0,
        playbackRate: 1.0,
        sentAt: Date.now(),
        videoSource: newSource
      });
    }

    setActiveTab('chat');
  };

  // ==============================================================
  // WEBRTC NATIVE SCREEN SHARING & VIDEO/VOICE CALLS (ZERO EXTERNAL API)
  // ==============================================================
  const toggleCamera = async () => {
    if (isCameraOn) {
      if (localMediaStream.current) {
        localMediaStream.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
        localMediaStream.current = stream;
        if (userWebcamRef.current) {
          userWebcamRef.current.srcObject = stream;
          userWebcamRef.current.play();
        }
        setIsCameraOn(true);
      } catch (err) {
        alert('Could not access camera device. Please verify browser permissions.');
      }
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (localMediaStream.current) {
        localMediaStream.current.getAudioTracks().forEach(track => track.enabled = false);
      }
      setIsMicOn(false);
    } else {
      try {
        if (!localMediaStream.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCameraOn });
          localMediaStream.current = stream;
        } else {
          localMediaStream.current.getAudioTracks().forEach(track => track.enabled = true);
        }
        setIsMicOn(true);
      } catch (err) {
        alert('Could not access microphone device.');
      }
    }
  };

  const stopUserMedia = () => {
    if (localMediaStream.current) {
      localMediaStream.current.getTracks().forEach(track => track.stop());
      localMediaStream.current = null;
    }
    setIsCameraOn(false);
    setIsMicOn(false);
  };

  // Desktop Screen Sharing via getDisplayMedia
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      // Check if getDisplayMedia is supported (desktop vs mobile browser)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setShowMobileWarning(true);
        return;
      }

      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true
        });
        screenStream.current = displayStream;
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
          screenVideoRef.current.play();
        }
        setIsScreenSharing(true);

        // Listen for user stopping share from browser UI
        displayStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.warn('Screen share canceled or denied.');
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    setIsScreenSharing(false);
  };

  // WebRTC Mesh Signaling Handlers
  const handleWebRtcOffer = async (payload: any) => {
    if (!user || payload.targetUserId !== user.id) return;
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnections.current.set(payload.senderUserId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate && signalingChannel.current) {
          signalingChannel.current.broadcast('webrtc_ice', {
            targetUserId: payload.senderUserId,
            senderUserId: user.id,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingChannel.current) {
        signalingChannel.current.broadcast('webrtc_answer', {
          targetUserId: payload.senderUserId,
          senderUserId: user.id,
          answer
        });
      }
    } catch (e) {
      console.warn('WebRTC Offer handling error:', e);
    }
  };

  const handleWebRtcAnswer = async (payload: any) => {
    if (!user || payload.targetUserId !== user.id) return;
    const pc = peerConnections.current.get(payload.senderUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    }
  };

  const handleWebRtcIce = async (payload: any) => {
    if (!user || payload.targetUserId !== user.id) return;
    const pc = peerConnections.current.get(payload.senderUserId);
    if (pc && payload.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  };

  // ==============================================================
  // CHAT & PHOTO SHARING
  // ==============================================================
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!room || !user || (!chatInput.trim() && !attachedPhoto)) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      roomId: room.id,
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatar,
      text: chatInput.trim(),
      photoUrl: attachedPhoto || undefined,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setAttachedPhoto(null);

    // Broadcast message instantly across room
    if (signalingChannel.current) {
      signalingChannel.current.broadcast('chat_message', newMsg);
    }
  };

  const copyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/?party=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#07090E]">
        <RefreshCw className="w-8 h-8 text-[#397CB8] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-300">Connecting to Supabase Realtime & WebRTC Mesh...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-cyan-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Party Not Found</h3>
        <p className="text-xs text-slate-300">{error || 'This watch party has ended or the link is invalid.'}</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="glass-button-primary px-5 py-2 rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isHost = user?.id === room.hostId;

  return (
    <div className={`w-full min-h-[calc(100vh-4rem)] bg-[#07090E] flex flex-col ${theaterMode ? 'p-0' : 'p-3 sm:p-5'}`}>
      
      {/* Top Party Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#397CB8] animate-pulse"></span>
            <span className="font-bold text-white text-sm sm:text-base">{room.title}</span>
          </div>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-[#B5D5ED] bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
            {room.code}
          </span>
          <span className="hidden sm:inline text-slate-400">Host: {room.hostName}</span>
          {localFileName && (
            <span className="px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-200 border border-cyan-500/30 text-[11px]">
              Local File Sync Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Android Companion Launcher */}
          <button
            onClick={() => setShowAndroidModal(true)}
            className="glass-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#B5D5ED]"
            title="Open Native Android Companion Source & Screen Sharing Guide"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Android Companion</span>
          </button>

          {/* Invite Link */}
          <button
            onClick={copyInviteLink}
            className="glass-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-cyan-200" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Invite Friends'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Cinema Player + Interactive Side Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Player & Stream Area */}
        <div className={`space-y-3 ${theaterMode ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-9'}`}>
          
          {/* Main Video Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-video flex items-center justify-center group">
            
            {/* If Screen Sharing is active, show the screen stream! */}
            {isScreenSharing ? (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <video
                ref={videoRef}
                poster={room.videoSource.poster}
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration);
                }}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Screen sharing overlay badge */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4 bg-[#07090E]/90 border border-[#397CB8] px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>WebRTC Native Desktop Screen Share Active</span>
              </div>
            )}

            {/* Webcam Picture-in-Picture Preview if Camera is Active */}
            {isCameraOn && (
              <div className="absolute bottom-16 right-4 w-36 sm:w-48 aspect-video rounded-xl overflow-hidden border-2 border-[#397CB8] shadow-2xl bg-black z-20">
                <video
                  ref={userWebcamRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                <span className="absolute bottom-1 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white font-medium">
                  You (Live WebRTC)
                </span>
              </div>
            )}

            {/* Hover Floating Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
              
              {/* Scrubbing Bar */}
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.5"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-[#397CB8] cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
                <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between">
                
                {/* Left Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePlay}
                    className="w-9 h-9 rounded-full bg-[#397CB8] hover:bg-[#468ecf] flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
                    title={isPlaying ? 'Pause for all' : 'Play for all'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button onClick={handleToggleMute} className="text-slate-300 hover:text-white">
                      {isMuted ? <VolumeX className="w-4 h-4 text-cyan-300" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-20 accent-[#397CB8] h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <span className="hidden sm:inline text-xs text-slate-400 font-medium truncate max-w-[200px]">
                    {localFileName || room.videoSource.title}
                  </span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheaterMode(!theaterMode)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold"
                    title="Toggle Cinema Theater Mode"
                  >
                    {theaterMode ? 'Exit Theater' : 'Theater Mode'}
                  </button>

                  <button
                    onClick={() => {
                      if (!document.fullscreenElement) {
                        videoRef.current?.requestFullscreen();
                        setIsFullscreen(true);
                      } else {
                        document.exitFullscreen();
                        setIsFullscreen(false);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* Stream Bottom Bar: Video, Mic & Screen Share Controls */}
          <div className="glass-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Live Media Toggles */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleMic}
                className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  isMicOn ? 'bg-[#397CB8] text-white shadow-[0_0_12px_rgba(57,124,184,0.4)]' : 'glass-button-secondary text-slate-400 hover:text-white'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicOn ? 'Mute Mic' : 'Unmute Mic'}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  isCameraOn ? 'bg-[#397CB8] text-white shadow-[0_0_12px_rgba(57,124,184,0.4)]' : 'glass-button-secondary text-slate-400 hover:text-white'
                }`}
              >
                {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span>{isCameraOn ? 'Stop Camera' : 'Start Camera'}</span>
              </button>

              <button
                onClick={toggleScreenShare}
                className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  isScreenSharing ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'glass-button-secondary text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</span>
              </button>
            </div>

            {/* WebRTC & Stream Telemetry */}
            <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#397CB8]"></span>
                Signaling: Supabase Realtime / Broadcast
              </span>
              <span>Sync Drift: {lastSyncLag}ms</span>
              <span>Peers: {connectedPeers.length + 1}</span>
            </div>

          </div>

        </div>

        {/* Right Column: Interactive Sidebar (Chat, Participants, Catalog, Local Files) */}
        {!theaterMode && (
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden h-[620px] lg:h-auto">
            
            {/* Sidebar Tab Header */}
            <div className="flex items-center border-b border-white/10 p-2 gap-1 bg-[#0F1420]/70">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'chat' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'participants' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Peers ({connectedPeers.length + 1})</span>
              </button>

              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'catalog' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>

              <button
                onClick={() => setActiveTab('local')}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'local' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Synchronized Local File Player"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Local</span>
              </button>
            </div>

            {/* TAB 1: REAL-TIME CHAT WITH PHOTO UPLOADS */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-black/40">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="w-5 h-5 rounded-full object-cover border border-[#397CB8]/30"
                        />
                        <span className="text-xs font-bold text-slate-200">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="pl-7">
                        {msg.text && (
                          <p className="text-xs text-slate-300 leading-relaxed bg-[#102D55]/30 p-2.5 rounded-xl border border-white/5 inline-block">
                            {msg.text}
                          </p>
                        )}

                        {msg.photoUrl && (
                          <div className="mt-1.5 max-w-[240px] rounded-xl overflow-hidden border border-[#397CB8]/40 shadow-lg">
                            <img
                              src={msg.photoUrl}
                              alt="Shared photo"
                              className="w-full h-auto object-cover hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                {/* Attached Photo Preview */}
                {attachedPhoto && (
                  <div className="p-2 border-t border-white/10 bg-[#0F1420] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={attachedPhoto} alt="Attachment" className="w-10 h-10 rounded-lg object-cover border border-[#397CB8]" />
                      <span className="text-[11px] text-slate-300">Image attached for chat</span>
                    </div>
                    <button
                      onClick={() => setAttachedPhoto(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Chat input box */}
                <form onSubmit={handleSendMessage} className="p-2.5 border-t border-white/10 bg-[#0F1420]/90 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsChatPhotoModalOpen(true)}
                    className="p-2 rounded-lg text-[#B5D5ED] hover:text-white hover:bg-white/10 transition-colors"
                    title="Upload Photo to Party Chat"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 glass-input px-3 py-2 rounded-lg text-xs"
                  />

                  <button
                    type="submit"
                    disabled={!chatInput.trim() && !attachedPhoto}
                    className="p-2 rounded-lg bg-[#397CB8] hover:bg-[#468ecf] text-white disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: PARTICIPANTS & HOST CONTROLS */}
            {activeTab === 'participants' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/40">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  Connected Peers in WebRTC Room ({connectedPeers.length + 1})
                </div>

                {/* Host Card */}
                <div className="flex items-center justify-between p-2 rounded-xl glass-panel-subtle border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                        alt={user?.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover border border-[#397CB8]/40"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black"></span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{user?.displayName || 'You'}</span>
                        <span className="text-[10px] bg-[#397CB8] text-white px-1.5 py-0.2 rounded font-semibold">
                          {isHost ? 'Host' : 'Participant'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Signaling: Active</span>
                    </div>
                  </div>
                </div>

                {/* Other Peers */}
                {connectedPeers.filter(id => id !== user?.id).map((peerId, i) => (
                  <div
                    key={peerId || i}
                    className="flex items-center justify-between p-2 rounded-xl glass-panel-subtle border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${peerId}`}
                          alt="Peer"
                          className="w-8 h-8 rounded-full object-cover border border-[#397CB8]/40"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black"></span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white">Peer {peerId.substring(0, 6)}</span>
                        <p className="text-[10px] text-slate-400 font-mono">WebRTC P2P Mesh</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: LICENSED MOVIES CATALOG */}
            {activeTab === 'catalog' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/40">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                  Legal Public Domain & HLS Library
                </div>
                {catalog.map(movie => (
                  <div
                    key={movie.id}
                    className="p-2.5 rounded-xl glass-panel-subtle border border-white/10 space-y-2 hover:border-[#397CB8]/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <img src={movie.poster} alt={movie.title} className="w-16 h-10 rounded object-cover shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{movie.title}</p>
                        <p className="text-[10px] text-[#B5D5ED]">{movie.genre} · {movie.durationFormatted}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">{movie.license}</span>
                      {isHost ? (
                        <button
                          onClick={() => handleSwitchMovie(movie)}
                          className="glass-button-primary px-3 py-1 rounded-md text-[11px] font-semibold"
                        >
                          Stream This
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Host only</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: LOCAL FILE PLAYBACK (ZERO SERVER STORAGE) */}
            {activeTab === 'local' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Local File Synchronization</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Stream a video file stored directly on your computer or phone (<code className="text-cyan-300">.mp4</code>, <code className="text-cyan-300">.mkv</code>, <code className="text-cyan-300">.webm</code>). CineTogether uses native HTML5 Blob Object URLs so <strong>no video file is ever uploaded to a server</strong>.
                  </p>
                </div>

                <input
                  type="file"
                  ref={localFileInputRef}
                  onChange={handleLocalFileSelect}
                  accept="video/mp4,video/webm,video/mkv,video/*"
                  className="hidden"
                />

                <button
                  onClick={() => localFileInputRef.current?.click()}
                  className="w-full glass-button-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Choose Local Video File</span>
                </button>

                {localFileName && (
                  <div className="p-3 rounded-xl bg-white/5 border border-cyan-500/30 text-cyan-200">
                    <p className="font-bold text-white">Current Local Stream:</p>
                    <p className="font-mono text-[11px] truncate mt-0.5">{localFileName}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-300">How Friends Watch Local Files:</p>
                  <p>1. <strong>Screen Sharing:</strong> The host shares their screen directly via the "Share Screen" button.</p>
                  <p>2. <strong>Direct Sync:</strong> Friends with the same movie file select it locally and enjoy synchronized play/pause!</p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Mobile Screen Share Warning Modal */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/20 p-6 space-y-4">
            <div className="flex items-center gap-3 text-cyan-300">
              <Smartphone className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Mobile Screen Sharing Notice</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mobile operating system security policies (iOS & standard Android browsers) restrict browser tabs from sharing the full device screen.
            </p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
              <p><strong>What you can do on mobile:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Watch the host's screen share stream in real time.</li>
                <li>Turn on your camera and microphone.</li>
                <li>Use our native Kotlin companion app for full Android OS streaming.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMobileWarning(false)}
                className="glass-button-primary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Companion Modal */}
      <AndroidCompanionModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
        roomCode={room.code}
      />

      {/* Photo Upload in Chat Modal */}
      <PhotoUploadModal
        isOpen={isChatPhotoModalOpen}
        onClose={() => setIsChatPhotoModalOpen(false)}
        onUpload={(dataUrl) => {
          setAttachedPhoto(dataUrl);
          setIsChatPhotoModalOpen(false);
        }}
        title="Upload Photo to Room Chat"
        description="Share a snapshot, movie poster, or photo with watch-party members."
      />

    </div>
  );
};
