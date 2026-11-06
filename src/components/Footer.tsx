import React from 'react';
import { Film, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-black border-t border-[#B5D5ED]/10 text-slate-400 text-xs">
      {/* 18+ Advisory Banner in Footer */}
      <div className="bg-[#071426]/60 border-b border-[#B5D5ED]/5 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B5D5ED] shrink-0" />
            <span className="font-semibold text-slate-200">
              Age Advisory: Recommended for users aged 18 and above.
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            CineTogether enforces community safety guidelines, verified accounts, and content moderation tools.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div 
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#102D55] to-[#397CB8] flex items-center justify-center p-0.5">
                <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center">
                  <Film className="w-3.5 h-3.5 text-[#B5D5ED]" />
                </div>
              </div>
              <span className="text-base font-bold text-white tracking-tight">CineTogether</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global watch-party and screen-sharing platform. Synchronized licensed video playback, WebRTC video calling, and Android companion screen streaming.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#B5D5ED]">
              <Lock className="w-3.5 h-3.5" />
              <span>OWASP Top 10 Hardened & Encrypted</span>
            </div>
          </div>

          {/* Watch Parties & Features */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Platform Features</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors">
                  Explore Active Parties
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('create-room')} className="hover:text-white transition-colors">
                  Host Private Room
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-screen-sharing')} className="hover:text-white transition-colors">
                  Desktop Screen Share
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-android')} className="hover:text-white transition-colors">
                  Android MediaProjection
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-movies')} className="hover:text-white transition-colors">
                  Synchronized Legal Movies
                </button>
              </li>
            </ul>
          </div>

          {/* Technical SEO Landing Pages */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">SEO Hub & Solutions</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('seo-watch-party')} className="hover:text-white transition-colors">
                  Watch Party Online
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-screen-sharing')} className="hover:text-white transition-colors">
                  Online Screen Sharing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-movies')} className="hover:text-white transition-colors">
                  Watch Movies Together
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-android')} className="hover:text-white transition-colors">
                  Android Screen Sharing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seo-video-chat')} className="hover:text-white transition-colors">
                  Online Group Video Chat
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Security & Legal</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('privacy-policy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms-of-service')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('cookie-policy')} className="hover:text-white transition-colors">
                  Cookie Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors">
                  Security & Lockout FAQ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact & Abuse Reporting
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#B5D5ED]/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} CineTogether Inc. All rights reserved. Built with WebRTC & Adaptive Streaming.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#397CB8]" />
              Argon2id & 5-Attempt Lockout Active
            </span>
            <span>·</span>
            <span>GDPR & CCPA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
