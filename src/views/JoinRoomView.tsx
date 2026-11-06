import React, { useState } from 'react';
import { Film, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface JoinRoomViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const JoinRoomView: React.FC<JoinRoomViewProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a valid room code.');
      return;
    }

    if (!user) {
      setError('You must sign in before joining a watch party.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await api.getRoom(code);
      if (res.room.isPrivate && !password) {
        setIsPrivate(true);
        setError('This room is private. Please enter the room access password.');
        setIsJoining(false);
        return;
      }

      await api.joinRoom(res.room.id, {
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar
      }, password);

      onNavigate('party', { roomId: res.room.id });
    } catch (err: any) {
      setError(err.message || 'Unable to join room. Please check the code or password.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#07090E] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#102D55] via-[#397CB8] to-[#B5D5ED] p-0.5 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(57,124,184,0.4)]">
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
              <Film className="w-6 h-6 text-[#B5D5ED]" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Join Watch Party
          </h2>
          <p className="text-xs text-slate-400">
            Enter the 8-character invitation code to enter the synchronized cinema room.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-white/5 border border-cyan-400/30 text-cyan-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Room Code
            </label>
            <input
              type="text"
              required
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              placeholder="e.g. PARTY-4029"
              className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider text-center"
            />
          </div>

          {isPrivate && (
            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Room Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="w-full glass-button-primary py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,124,184,0.4)] disabled:opacity-50"
          >
            <span>{isJoining ? 'Connecting to Room...' : 'Enter Watch Party'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#397CB8]" />
            <span>WebRTC P2P Mesh</span>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="hover:text-white transition-colors"
          >
            Browse Public Rooms
          </button>
        </div>

      </div>
    </div>
  );
};
