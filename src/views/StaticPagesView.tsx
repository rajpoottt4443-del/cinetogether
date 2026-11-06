import React, { useState } from 'react';
import { Film, Shield, Mail, CheckCircle2, FileText, HelpCircle, Lock, Server } from 'lucide-react';

interface StaticPagesViewProps {
  page: 'how-it-works' | 'about' | 'faq' | 'contact' | 'privacy' | 'terms' | 'cookies';
  onNavigate: (view: string, params?: any) => void;
}

export const StaticPagesView: React.FC<StaticPagesViewProps> = ({ page, onNavigate }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setSubject('');
      setMessage('');
    }, 4000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* HOW IT WORKS */}
        {page === 'how-it-works' && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                How CineTogether Works
              </h1>
              <p className="text-sm text-slate-300 max-w-xl mx-auto">
                Simple, secure synchronized streaming designed for friends, families, and communities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-3">
                <span className="text-2xl font-black cine-gradient-text font-mono">01</span>
                <h3 className="text-base font-bold text-white">Create Account</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign up with email or Google to receive your permanent unique User ID (e.g. CT-8F29A641). Verify the 18+ age requirement.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-3">
                <span className="text-2xl font-black cine-gradient-text font-mono">02</span>
                <h3 className="text-base font-bold text-white">Pick Content</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Choose from our licensed 4K library (Tears of Steel, Cosmos, Elephants Dream), input a stream URL, or share your desktop.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-3">
                <span className="text-2xl font-black cine-gradient-text font-mono">03</span>
                <h3 className="text-base font-bold text-white">Invite Friends</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Share your unique Room Code (e.g. PARTY-4029) or direct invitation link with your friends.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-3">
                <span className="text-2xl font-black cine-gradient-text font-mono">04</span>
                <h3 className="text-base font-bold text-white">Stream & Chat</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enjoy synchronized pause/play/seek, live WebRTC voice and video calls, and real-time chat with photo uploads!
                </p>
              </div>
            </div>

            <div className="text-center pt-8">
              <button
                onClick={() => onNavigate('create-room')}
                className="glass-button-primary px-8 py-3.5 rounded-xl text-xs font-bold"
              >
                Host a Watch Party Now
              </button>
            </div>
          </div>
        )}

        {/* ABOUT US */}
        {page === 'about' && (
          <div className="space-y-6 glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15">
            <h1 className="text-3xl font-extrabold text-white">About CineTogether</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              CineTogether is an ultra-modern watch-party platform built to bring people together around great cinema and live digital experiences without compromises in audio-visual fidelity, digital security, or user privacy.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Combining WebRTC selective forwarding units, native Android companion screen casting, and frame-accurate playback clocks, CineTogether ensures you and your friends share every emotion at the exact same millisecond.
            </p>
          </div>
        )}

        {/* FAQ */}
        {page === 'faq' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-white text-center">Frequently Asked Questions</h1>
            <div className="space-y-4 pt-4">
              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-2">
                <h3 className="text-sm font-bold text-white">What is the 5-Failed Login Attempt Lockout?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To protect your account from automated brute-force attacks, CineTogether locks authentication after 5 consecutive incorrect password entries. Accounts remain locked for 15 minutes or until unlocked via password reset or admin authorization.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-2">
                <h3 className="text-sm font-bold text-white">What is the 18+ Age Recommendation?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  CineTogether is recommended for users aged 18 and above due to open user-hosted video calls, screen shares, and community moderation policies. Users verify their age upon registration.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-2">
                <h3 className="text-sm font-bold text-white">How does Android Screen Sharing work?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Standard mobile web browsers cannot capture the full Android operating system. We provide a native Kotlin companion app that utilizes Android’s MediaProjection API and a Foreground Service to stream games, apps, and video cleanly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT & ABUSE */}
        {page === 'contact' && (
          <div className="glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15 space-y-6">
            <h1 className="text-2xl font-extrabold text-white">Contact & Content Moderation</h1>
            <p className="text-xs text-slate-300">
              Submit community inquiries, security vulnerability disclosures, or report inappropriate room behavior.
            </p>

            {contactSubmitted ? (
              <div className="p-4 rounded-xl bg-[#071426] border border-[#397CB8] text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#B5D5ED]" />
                <span>Thank you. Your message has been logged with our security team.</span>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Content Report or Technical Question"
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your issue or report..."
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="glass-button-primary px-6 py-2.5 rounded-xl text-xs font-bold"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>
        )}

        {/* PRIVACY POLICY */}
        {page === 'privacy' && (
          <div className="glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15 space-y-4 text-xs text-slate-300 leading-relaxed">
            <h1 className="text-2xl font-extrabold text-white">Privacy Policy</h1>
            <p>
              CineTogether values your digital privacy. Peer-to-peer and SFU video streams are encrypted in transit. We do not sell or monetize personal viewing histories.
            </p>
            <h3 className="text-sm font-bold text-white pt-2">Data Protection & GDPR</h3>
            <p>
              Registered users may request export or deletion of their account records at any time. Security logs documenting failed authentication attempts are retained strictly for cyber threat mitigation.
            </p>
          </div>
        )}

        {/* TERMS OF SERVICE */}
        {page === 'terms' && (
          <div className="glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15 space-y-4 text-xs text-slate-300 leading-relaxed">
            <h1 className="text-2xl font-extrabold text-white">Terms of Service</h1>
            <p>
              By accessing CineTogether, you agree to our 18+ age recommendation advisory, copyright compliance guidelines, and code of conduct.
            </p>
            <h3 className="text-sm font-bold text-white pt-2">Copyright & Legal Media</h3>
            <p>
              Users agree to stream only legally licensed, authorized, or public-domain video media. Circumvention of DRM protection systems is strictly prohibited.
            </p>
          </div>
        )}

        {/* COOKIE POLICY */}
        {page === 'cookies' && (
          <div className="glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15 space-y-4 text-xs text-slate-300 leading-relaxed">
            <h1 className="text-2xl font-extrabold text-white">Cookie Policy</h1>
            <p>
              CineTogether utilizes essential session tokens and local storage strictly to preserve your authentication state and room synchronization preferences. No third-party behavioral advertising cookies are deployed.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
