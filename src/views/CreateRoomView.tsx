import React, { useState, useEffect, useRef } from 'react';
import { Tv, Lock, Globe, Film, Shield, Check, Monitor, ArrowRight, FolderPlus, HelpCircle } from 'lucide-react';
import { CatalogMovie, VideoSource } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CreateRoomViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CreateRoomView: React.FC<CreateRoomViewProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [sourceType, setSourceType] = useState<'catalog' | 'custom' | 'screenshare' | 'local_file'>('catalog');
  const [catalog, setCatalog] = useState<CatalogMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<CatalogMovie | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [localFileBlobUrl, setLocalFileBlobUrl] = useState<string | null>(null);
  const localFileRef = useRef<HTMLInputElement>(null);
  
  // Permissions
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowParticipantPlayPause, setAllowParticipantPlayPause] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCatalog().then(res => {
      setCatalog(res.catalog);
      if (res.catalog.length > 0) setSelectedMovie(res.catalog[0]);
    }).catch(() => {});
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Sign In Required</h3>
        <p className="text-xs text-slate-300">You must be logged in to host a private or public watch party.</p>
        <button
          onClick={() => onNavigate('login')}
          className="glass-button-primary px-5 py-2 rounded-xl text-xs font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleLocalFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFileName(file.name);
      const url = URL.createObjectURL(file);
      setLocalFileBlobUrl(url);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for your watch party.');
      return;
    }

    setIsCreating(true);
    setError(null);

    let videoSource: VideoSource;
    if (sourceType === 'catalog' && selectedMovie) {
      videoSource = {
        type: 'licensed',
        title: selectedMovie.title,
        url: selectedMovie.url,
        poster: selectedMovie.poster,
        duration: selectedMovie.duration,
        isHls: selectedMovie.isHls
      };
    } else if (sourceType === 'custom') {
      if (!customUrl.trim()) {
        setError('Please enter a valid video stream URL (.mp4, .m3u8, or .webm).');
        setIsCreating(false);
        return;
      }
      videoSource = {
        type: 'custom',
        title: customTitle.trim() || 'Custom Video Stream',
        url: customUrl.trim(),
        duration: 3600,
        isHls: customUrl.includes('.m3u8')
      };
    } else if (sourceType === 'local_file') {
      if (!localFileName || !localFileBlobUrl) {
        setError('Please select a local video file from your computer or phone.');
        setIsCreating(false);
        return;
      }
      videoSource = {
        type: 'local_file',
        title: `Local Movie: ${localFileName}`,
        url: localFileBlobUrl,
        fileName: localFileName,
        duration: 7200
      };
    } else {
      videoSource = {
        type: 'screenshare',
        title: 'Native WebRTC Screen Share Party',
        url: '',
        duration: 0
      };
    }

    try {
      const res = await api.createRoom({
        title: title.trim(),
        isPrivate,
        password: isPrivate && password ? password : undefined,
        maxParticipants,
        videoSource,
        hostUser: {
          id: user.id,
          displayName: user.displayName,
          avatar: user.avatar
        }
      });

      onNavigate('party', { roomId: res.room.id });
    } catch (err: any) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#07090E] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create a Watch Party Room
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a synchronized movie, play your local video file (zero server storage), or host native WebRTC screen sharing.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-white/5 border border-cyan-400/40 text-cyan-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          
          {/* Room Name */}
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
              Room Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Friday Night Sci-Fi Premiere"
              className="w-full glass-input px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Privacy & Max participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Room Privacy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    !isPrivate ? 'bg-[#397CB8] text-white border-white/30' : 'glass-button-secondary text-slate-400'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Public Party</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isPrivate ? 'bg-[#397CB8] text-white border-white/30' : 'glass-button-secondary text-slate-400'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Private Room</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Max Capacity
              </label>
              <select
                value={maxParticipants}
                onChange={e => setMaxParticipants(parseInt(e.target.value))}
                className="w-full glass-input px-3.5 py-3 rounded-xl text-xs"
              >
                <option value={5}>5 Participants (Intimate Mesh)</option>
                <option value={10}>10 Participants (Standard)</option>
                <option value={15}>15 Participants (Group)</option>
                <option value={25}>25 Participants (Full Theater)</option>
              </select>
            </div>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Room Access Password (SHA-256 Hashed on Client)
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank for invite-link only access"
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
              />
            </div>
          )}

          {/* Content Source Selection */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <label className="block text-xs font-semibold text-white uppercase tracking-wider">
              Media Stream Source
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('catalog')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  sourceType === 'catalog' ? 'bg-[#397CB8] text-white border-white/40 shadow-md' : 'glass-button-secondary text-slate-400'
                }`}
              >
                <Film className="w-4 h-4 mx-auto mb-1" />
                <span>Public Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('local_file')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  sourceType === 'local_file' ? 'bg-[#397CB8] text-white border-white/40 shadow-md' : 'glass-button-secondary text-slate-400'
                }`}
              >
                <FolderPlus className="w-4 h-4 mx-auto mb-1" />
                <span>Local File Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('custom')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  sourceType === 'custom' ? 'bg-[#397CB8] text-white border-white/40 shadow-md' : 'glass-button-secondary text-slate-400'
                }`}
              >
                <Tv className="w-4 h-4 mx-auto mb-1" />
                <span>Direct URL / HLS</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('screenshare')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  sourceType === 'screenshare' ? 'bg-[#397CB8] text-white border-white/40 shadow-md' : 'glass-button-secondary text-slate-400'
                }`}
              >
                <Monitor className="w-4 h-4 mx-auto mb-1" />
                <span>Screen Share</span>
              </button>
            </div>

            {/* Catalog film cards */}
            {sourceType === 'catalog' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {catalog.map(movie => (
                  <div
                    key={movie.id}
                    onClick={() => setSelectedMovie(movie)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      selectedMovie?.id === movie.id ? 'border-[#B5D5ED] bg-[#102D55]/60 shadow-[0_0_15px_rgba(57,124,184,0.3)]' : 'glass-panel-subtle hover:border-[#397CB8]/30'
                    }`}
                  >
                    <img src={movie.poster} alt={movie.title} className="w-16 h-12 rounded object-cover shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{movie.title}</h4>
                      <p className="text-[10px] text-[#B5D5ED]">{movie.genre} · {movie.durationFormatted}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{movie.license}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Local File Selector */}
            {sourceType === 'local_file' && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <input
                  type="file"
                  ref={localFileRef}
                  onChange={handleLocalFileChosen}
                  accept="video/mp4,video/webm,video/mkv,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => localFileRef.current?.click()}
                  className="w-full glass-button-secondary py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <FolderPlus className="w-4 h-4 text-[#B5D5ED]" />
                  <span>{localFileName ? `Selected: ${localFileName}` : 'Choose .mp4, .mkv, or .webm Video File'}</span>
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  CineTogether creates an in-memory HTML5 Blob Object URL. Video files stay on your device and are never sent to a server.
                </p>
              </div>
            )}

            {/* Custom URL Input */}
            {sourceType === 'custom' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stream Name</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g. Live HLS Stream or Independent Film"
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Direct Stream URL (.mp4 / .webm / .m3u8 HLS)</label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/stream.m3u8"
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {sourceType === 'screenshare' && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                You will share your desktop screen or Android companion app directly when entering the party room via native WebRTC <code className="text-cyan-300">getDisplayMedia</code>.
              </div>
            )}

          </div>

          {/* Permissions toggles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <label className="block text-xs font-semibold text-white uppercase tracking-wider">
              Room Permissions & Controls
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowScreenShare}
                  onChange={e => setAllowScreenShare(e.target.checked)}
                  className="w-4 h-4 accent-[#397CB8] rounded"
                />
                <span className="text-xs text-slate-300">Allow members to share desktop / mobile screens</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowParticipantPlayPause}
                  onChange={e => setAllowParticipantPlayPause(e.target.checked)}
                  className="w-4 h-4 accent-[#397CB8] rounded"
                />
                <span className="text-xs text-slate-300">Allow members to pause & play (Default: Host-only control)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="glass-button-primary px-8 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(57,124,184,0.4)] disabled:opacity-50"
            >
              <span>{isCreating ? 'Launching Theater...' : 'Launch Watch Party'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
