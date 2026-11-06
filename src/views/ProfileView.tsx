import React, { useState } from 'react';
import { Camera, Copy, Check, Shield, Mail, Calendar, User as UserIcon, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PhotoUploadModal } from '../components/PhotoUploadModal';

interface ProfileViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, updateUser, uploadAvatar } = useAuth();
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Sign In Required</h3>
        <p className="text-xs text-slate-300">You must be logged in to view your CineTogether profile.</p>
        <button
          onClick={() => onNavigate('login')}
          className="glass-button-primary px-5 py-2 rounded-xl text-xs font-semibold"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const copyUserId = () => {
    navigator.clipboard.writeText(user.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({ displayName, bio });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#B5D5ED]/10 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              User Profile & Identity
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your personal CineTogether permanent ID, avatar photo, and party preferences.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="glass-button-secondary px-4 py-2 rounded-lg text-xs font-semibold"
          >
            Go to Parties
          </button>
        </div>

        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#B5D5ED]/20 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#B5D5ED]/10">
            
            {/* Avatar & Photo Upload Option ("or is ma user ko photo upload krna ka option b dalna") */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#397CB8] shadow-[0_0_25px_rgba(57,124,184,0.35)] bg-[#071426]">
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Camera upload overlay button */}
              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-xs"
                title="Upload custom photo or take snapshot"
              >
                <Camera className="w-6 h-6 text-[#B5D5ED] mb-1" />
                <span className="text-[10px] font-semibold text-white">Change Photo</span>
              </button>

              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="sm:hidden mt-2 w-full glass-button-secondary py-1 text-[11px] rounded-lg font-medium"
              >
                Upload Photo
              </button>
            </div>

            {/* Identity details */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{user.displayName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#102D55] text-[#B5D5ED] border border-[#397CB8]/30">
                  {user.role.toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Online
                </span>
              </div>

              {/* PERMANENT UNIQUE USER ID (CT-XXXXXXXX) */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-[#B5D5ED]/20 font-mono text-xs text-[#B5D5ED]">
                <span className="text-slate-400">Unique ID:</span>
                <strong className="text-white tracking-widest">{user.userId}</strong>
                <button
                  onClick={copyUserId}
                  className="p-1 hover:text-white transition-colors"
                  title="Copy permanent ID to share with friends"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-xs text-slate-300 max-w-xl">
                {user.bio || 'Film enthusiast streaming licensed movies and sharing live experiences.'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#397CB8]" />
                  <span>18+ Verified</span>
                </div>
              </div>

            </div>

          </div>

          {/* Edit Form */}
          <form onSubmit={handleSaveProfile} className="mt-8 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Profile Customization
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Permanent CineTogether User ID (Immutable)
                </label>
                <input
                  type="text"
                  disabled
                  value={user.userId}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                About / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="What kinds of movies or parties do you love?"
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="glass-button-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Camera className="w-4 h-4 text-[#B5D5ED]" />
                <span>Upload Custom Photo</span>
              </button>

              <div className="flex items-center gap-3">
                {isSaved && (
                  <span className="text-xs text-cyan-300 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Saved successfully
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="glass-button-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
                >
                  {isSaving ? 'Updating...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>

      {/* Photo Upload Modal ("or is ma user ko photo upload krna ka option b dalna") */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onUpload={async (dataUrl) => {
          await uploadAvatar(dataUrl);
          setIsPhotoModalOpen(false);
        }}
        title="Upload Profile Picture"
        description="Choose a photo from your computer/mobile or capture a webcam snapshot."
      />

    </div>
  );
};
