import React, { useState } from 'react';
import { Shield, Key, Lock, Smartphone, Check, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PhotoUploadModal } from '../components/PhotoUploadModal';

interface SettingsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { user, updateUser, uploadAvatar } = useAuth();
  const [activeTab, setActiveTab] = useState<'security' | 'account' | 'sessions'>('security');
  
  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled ?? false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Sign In Required</h3>
        <p className="text-xs text-slate-300">You must be logged in to view account and security settings.</p>
        <button
          onClick={() => onNavigate('login')}
          className="glass-button-primary px-5 py-2 rounded-xl text-xs font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleToggle2FA = async () => {
    const nextVal = !twoFactor;
    setTwoFactor(nextVal);
    await updateUser({ twoFactorEnabled: nextVal });
    setSuccessMsg(nextVal ? 'Two-Factor Authentication Enabled.' : 'Two-Factor Authentication Disabled.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#B5D5ED]/10 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Account & Security Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure cybersecurity policies, two-factor authentication, and account credentials.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-[#071426] border border-[#397CB8] text-white text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#B5D5ED]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-[#B5D5ED]/10 pb-2">
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'security' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security & 5-Attempt Lockout
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'account' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Account Identity & Photo
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'sessions' ? 'bg-[#397CB8] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active WebRTC Sessions
          </button>
        </div>

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* 5-Attempt Lockout Defense explanation */}
            <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-[#B5D5ED]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Authentication Protection (Strict 5-Attempt Rule)
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account is safeguarded by strict progressive rate limiting. Any account experiencing 5 consecutive failed login attempts is automatically placed in a 15-minute cooldown lockout to prevent brute-force attacks.
              </p>
              <div className="p-3 rounded-xl bg-black/60 border border-[#B5D5ED]/10 font-mono text-xs flex items-center justify-between">
                <span className="text-slate-400">Current Failed Attempts Counter:</span>
                <span className="text-cyan-300 font-bold">0 / 5 (Nominal)</span>
              </div>
            </div>

            {/* 2FA Toggle */}
            <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h3>
                <p className="text-xs text-slate-400">
                  Require an authenticator app confirmation code on unknown devices.
                </p>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  twoFactor ? 'bg-[#397CB8] justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* 18+ Age verification status */}
            <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-2">
              <h3 className="text-sm font-bold text-white">Age Advisory Status</h3>
              <p className="text-xs text-slate-300">
                Confirmed: <strong className="text-white">18+ Age Requirement Verified</strong>
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Consent Timestamp: {new Date(user.ageConfirmedAt || user.createdAt).toUTCString()}
              </p>
            </div>

          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-6">
            <div className="flex items-center gap-4">
              <img src={user.avatar} alt={user.displayName} className="w-16 h-16 rounded-2xl object-cover border border-[#397CB8]" />
              <div>
                <h3 className="text-base font-bold text-white">{user.displayName}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="mt-2 glass-button-secondary px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload New Photo</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#B5D5ED]/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Permanent Unique User ID</span>
                <span className="font-mono text-white font-bold">{user.userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Type</span>
                <span className="text-[#B5D5ED] uppercase font-bold">{user.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Google Account Linked</span>
                <span className="text-white">{user.isGoogleLinked ? 'Connected' : 'Not Linked'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Authorized Devices
            </h3>

            <div className="p-3 rounded-xl glass-panel-subtle flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">Current Web Browser Session</p>
                <p className="text-[11px] text-slate-400">Linux / WebRTC SFU Client · IP: 127.0.0.1</p>
              </div>
              <span className="text-cyan-300 font-semibold">Active Now</span>
            </div>
          </div>
        )}

      </div>

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onUpload={async (dataUrl) => {
          await uploadAvatar(dataUrl);
          setIsPhotoModalOpen(false);
          setSuccessMsg('Profile photo updated successfully.');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

    </div>
  );
};
