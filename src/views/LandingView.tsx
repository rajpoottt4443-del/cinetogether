import React from 'react';
import { Play, Monitor, Users, Shield, Smartphone, Film, Sparkles, ChevronRight, Lock, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-full min-h-screen bg-black">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-24 border-b border-[#B5D5ED]/10">
        {/* Background radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] cine-gradient-radial opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#B5D5ED] tracking-wide">
                <span>Next-Generation Synchronized Theater</span>
                <span aria-hidden="true">·</span>
                <span>Sub-50ms WebRTC SFU</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
                Watch movies together with friends in <span className="cine-gradient-text">frame-perfect sync</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Connect in private watch-party rooms. Share your desktop or complete Android mobile screen, chat over live WebRTC audio and video, and experience cinema together across continents.
              </p>

              {/* CTAs adhering to Single-Line Action Rule */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate(isAuthenticated ? 'create-room' : 'register')}
                  className="glass-button-primary px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap shadow-[0_0_25px_rgba(57,124,184,0.4)]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Free Watch Party</span>
                </button>

                <button
                  onClick={() => onNavigate('dashboard')}
                  className="glass-button-secondary px-6 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Browse Active Rooms</span>
                  <ChevronRight className="w-4 h-4 text-[#B5D5ED]" />
                </button>
              </div>

              {/* Trust metadata */}
              <div className="pt-6 border-t border-[#B5D5ED]/10 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#397CB8]" />
                  <span>5-Attempt Lockout Defense</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-[#397CB8]" />
                  <span>Desktop & Android Companion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-[#397CB8]" />
                  <span>Licensed & Public Domain Catalog</span>
                </div>
              </div>

            </div>

            {/* Right Visual Carrier: 16:9 cinematic asset */}
            <div className="lg:col-span-5">
              <div className="relative group">
                {/* Glow frame */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#102D55] via-[#397CB8] to-[#B5D5ED] opacity-30 blur-xl group-hover:opacity-50 transition-opacity" />
                
                <div className="relative rounded-2xl overflow-hidden glass-panel border border-[#B5D5ED]/20 shadow-2xl aspect-video">
                  <img
                    src="/src/assets/images/hero_watch_party_1793972645942.jpg"
                    alt="Friends enjoying CineTogether watch party"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#B5D5ED]">Live Stream in Session</p>
                        <p className="text-sm font-bold text-white">Tears of Steel (4K Remaster)</p>
                      </div>
                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="px-3 py-1.5 rounded-lg bg-[#397CB8] text-white text-xs font-bold shadow-lg hover:bg-[#468ecf] transition-colors"
                      >
                        Join Party
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PROOF OF PERFORMANCE KPI STRIP */}
      <section className="py-10 border-b border-[#B5D5ED]/10 bg-[#071426]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums cine-gradient-text">&lt; 42ms</div>
              <div className="text-xs text-slate-400 mt-1">Audio & Video Latency</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums cine-gradient-text">99.98%</div>
              <div className="text-xs text-slate-400 mt-1">Sync Drift Accuracy</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums cine-gradient-text">100% Native</div>
              <div className="text-xs text-slate-400 mt-1">Android MediaProjection</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums cine-gradient-text">OWASP-10</div>
              <div className="text-xs text-slate-400 mt-1">Hardened Cybersecurity</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE CAPABILITIES (Bento Grid) */}
      <section className="py-20 border-b border-[#B5D5ED]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-semibold text-[#B5D5ED] uppercase tracking-wider">
              Engineered For Seamless Entertainment
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              A complete suite for synchronized movie watching and screen sharing
            </h3>
            <p className="text-sm text-slate-400">
              Zero compromises on video clarity, audio synchronization, or digital privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Card 1: Synchronized Movie Streaming (col-span-8) */}
            <div className="md:col-span-8 glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5D5ED]">01. Global Clock Synchronization</span>
                <h4 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-3">
                  Adaptive Bitrate HLS & Synchronized Playback
                </h4>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  Every participant receives their own authorized video stream. Play, pause, seek, and audio tracks synchronize within milliseconds across all room members.
                </p>
              </div>

              <div className="mt-8 rounded-xl overflow-hidden border border-[#B5D5ED]/15 bg-black/50 aspect-[21/9] relative">
                <img
                  src="/src/assets/images/movie_cyber_runner_1793972648223.jpg"
                  alt="Synchronized Movie Stream"
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-4">
                  <div className="flex items-center gap-3 text-xs text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#397CB8] animate-pulse"></span>
                    <span>1080p Ultra Sync Active · 0 Frame Variance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Desktop & Mobile Screen Sharing (col-span-4) */}
            <div className="md:col-span-4 glass-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5D5ED]">02. Universal Screen Share</span>
                <h4 className="text-xl font-bold text-white mt-1 mb-3">
                  Desktop & Native Android Mobile
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Share your browser window, gaming screen, or entire Android phone with clear microphone and system audio pass-through.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-[#B5D5ED]/10 space-y-3">
                <button
                  onClick={() => onNavigate('seo-screen-sharing')}
                  className="w-full glass-button-secondary py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-between"
                >
                  <span>Explore Desktop Sharing</span>
                  <ArrowUpRight className="w-4 h-4 text-[#B5D5ED]" />
                </button>
                <button
                  onClick={() => onNavigate('seo-android')}
                  className="w-full glass-button-secondary py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-between"
                >
                  <span>Android Kotlin Source</span>
                  <ArrowUpRight className="w-4 h-4 text-[#B5D5ED]" />
                </button>
              </div>
            </div>

            {/* Bento Card 3: Cyber Security & 5-Attempt Lockout (col-span-4) */}
            <div className="md:col-span-4 glass-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5D5ED]">03. Strict Access Control</span>
                <h4 className="text-xl font-bold text-white mt-1 mb-3">
                  5-Attempt Security Lockout
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Protection against brute-force intrusion. After 5 consecutive failed attempts, accounts are locked for 15 minutes with real-time countdown enforcement.
                </p>
              </div>

              <div className="mt-6 p-3 rounded-xl bg-black/60 border border-[#B5D5ED]/10 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Failed Attempts:</span>
                  <span className="text-[#B5D5ED] font-bold">Max 5 Strict</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 mt-1">
                  <span>Cooldown Lockout:</span>
                  <span className="text-[#B5D5ED] font-bold">15m Automatic</span>
                </div>
              </div>
            </div>

            {/* Bento Card 4: WebRTC Video & Audio Chat (col-span-8) */}
            <div className="md:col-span-8 glass-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B5D5ED]">04. Crystal Clear Comms</span>
                <h4 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-3">
                  Real-Time Video Calling, Audio & Interactive Chat
                </h4>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  Talk with friends via crystal-clear WebRTC video and audio channels while watching. React with real-time emojis, share photos in room chat, and control host permissions.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl overflow-hidden border border-[#B5D5ED]/20 aspect-video relative">
                  <img
                    src="/src/assets/images/movie_cosmic_odyssey_1793972646755.jpg"
                    alt="Cosmic movie stream"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white font-medium">Cosmic Sci-Fi</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#B5D5ED]/20 aspect-video relative">
                  <img
                    src="/src/assets/images/movie_ocean_depths_1793972647552.jpg"
                    alt="Ocean documentary"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white font-medium">Ocean Wildlife</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#B5D5ED]/20 aspect-video relative">
                  <img
                    src="/src/assets/images/movie_cyber_runner_1793972648223.jpg"
                    alt="Cyberpunk film"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white font-medium">Cyber City</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CALL TO ACTION beslut */}
      <section className="py-20 bg-gradient-to-b from-black via-[#071426] to-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance">
            Ready to host your next <span className="cine-gradient-text">movie night</span>?
          </h3>
          <p className="text-base text-slate-300 max-w-xl mx-auto">
            Create an account in seconds, receive your permanent User ID, invite friends with a single click, and experience movies together.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate(isAuthenticated ? 'create-room' : 'register')}
              className="glass-button-primary px-8 py-4 rounded-xl text-sm font-bold shadow-[0_0_30px_rgba(57,124,184,0.4)]"
            >
              Get Started Free · 18+ Verified
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className="glass-button-secondary px-7 py-4 rounded-xl text-sm font-semibold"
            >
              Learn How It Works
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
