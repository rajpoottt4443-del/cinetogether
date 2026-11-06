import React, { useState, useEffect } from 'react';
import { Tv, Play, Plus, Users, Search, Shield, ArrowRight, Film, Radio, Smartphone, Lock } from 'lucide-react';
import { Room, Friend } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRooms().then(r => setRooms(r.rooms)),
      user ? api.getFriends(user.id).then(f => setFriends(f.friends)) : Promise.resolve()
    ]).finally(() => setIsLoading(false));
  }, [user]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await api.getRoom(code);
      onNavigate('party', { roomId: res.room.id });
    } catch (err: any) {
      setJoinError('Invalid room code or party has ended.');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden glass-panel border border-[#B5D5ED]/20 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 cine-gradient-radial opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-[#B5D5ED] font-semibold">
                <span>Welcome back, {user?.displayName || 'Film Fan'}</span>
                {user && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-white">{user.userId}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Live Watch Parties & Screen Streams
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Join an existing cinema room, share your desktop screen, or stream legally licensed movies with friends in frame-accurate synchronization.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate(isAuthenticated ? 'create-room' : 'login')}
                className="glass-button-primary px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(57,124,184,0.3)] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Watch Party</span>
              </button>
              
              <button
                onClick={() => onNavigate('seo-screen-sharing')}
                className="glass-button-secondary px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
              >
                <Tv className="w-4 h-4 text-[#B5D5ED]" />
                <span>Screen Share Guide</span>
              </button>
            </div>
          </div>

          {/* Quick Join Bar */}
          <div className="mt-6 pt-6 border-t border-[#B5D5ED]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleJoinByCode} className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Room Code (e.g. PARTY-4029)"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="glass-input px-3.5 py-2 rounded-xl text-xs w-full sm:w-64 font-mono uppercase"
              />
              <button
                type="submit"
                className="glass-button-primary px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
              >
                Join
              </button>
            </form>

            {joinError && (
              <span className="text-xs text-cyan-300">{joinError}</span>
            )}

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#397CB8]" />
              <span>All rooms protected by authenticated WebRTC tokens</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Active Parties + Friends Panel */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Active Watch Parties (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#B5D5ED]" />
              <h2 className="text-base font-bold text-white">Active Watch Parties</h2>
            </div>
            <span className="text-xs text-slate-400">
              {rooms.length} room(s) streaming now
            </span>
          </div>

          {rooms.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
              <Film className="w-8 h-8 text-[#B5D5ED] mx-auto opacity-70" />
              <p className="text-sm font-semibold text-white">No active public rooms</p>
              <p className="text-xs text-slate-400">Be the first to create a party and invite your friends!</p>
              <button
                onClick={() => onNavigate('create-room')}
                className="glass-button-primary px-4 py-2 rounded-lg text-xs font-semibold mt-2"
              >
                Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="glass-panel rounded-2xl overflow-hidden border border-[#B5D5ED]/15 hover:border-[#397CB8]/50 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <img
                      src={room.videoSource.poster || '/src/assets/images/hero_watch_party_1793972645942.jpg'}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-[#B5D5ED] border border-[#B5D5ED]/20">
                      {room.code}
                    </div>
                    {room.isPrivate && (
                      <div className="absolute top-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#B5D5ED]" />
                        <span>Private</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[10px] text-white bg-black/75 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#397CB8] animate-pulse"></span>
                      <span>{room.participants.length} / {room.maxParticipants} watching</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#B5D5ED] transition-colors">
                        {room.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        Streaming: {room.videoSource.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#B5D5ED]/10 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="text-[11px]">Host: {room.hostName}</span>
                      </div>

                      <button
                        onClick={() => onNavigate('party', { roomId: room.id })}
                        className="glass-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Join</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Friends & Quick Actions (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Friends Widget */}
          <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B5D5ED]/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#B5D5ED]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Friends Online</h3>
              </div>
              <button
                onClick={() => onNavigate('friends')}
                className="text-[11px] text-[#B5D5ED] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {friends.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No friends connected yet. Search by User ID to add friends.</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-2 rounded-xl glass-panel-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img src={friend.avatar} alt={friend.displayName} className="w-8 h-8 rounded-full object-cover border border-[#397CB8]/30" />
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cyan-400 border border-black"></span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{friend.displayName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{friend.userId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('create-room')}
                      className="glass-button-secondary px-2.5 py-1 rounded text-[11px] font-semibold"
                    >
                      Invite
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigate('friends')}
              className="w-full glass-button-secondary py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search User ID</span>
            </button>
          </div>

          {/* Android Companion Banner */}
          <div className="glass-panel rounded-2xl p-5 border border-[#B5D5ED]/15 space-y-3">
            <div className="flex items-center gap-2.5 text-[#B5D5ED]">
              <Smartphone className="w-5 h-5 text-[#B5D5ED]" />
              <h3 className="text-sm font-bold text-white">Android Screen Sharing</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Use our native Kotlin companion app with MediaProjection API to cast games and apps directly from your phone.
            </p>
            <button
              onClick={() => onNavigate('seo-android')}
              className="w-full glass-button-primary py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>View Kotlin Architecture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
