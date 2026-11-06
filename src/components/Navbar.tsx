import React, { useState } from 'react';
import { Film, User as UserIcon, LogOut, Shield, Users, Tv, Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenNotifications }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navLinks = [
    { id: 'landing', label: 'Overview' },
    { id: 'dashboard', label: 'Watch Parties' },
    { id: 'seo-screen-sharing', label: 'Screen Share' },
    { id: 'seo-movies', label: 'Legal Movies' },
    { id: 'how-it-works', label: 'How It Works' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-black/85 backdrop-blur-md border-b border-[#B5D5ED]/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#102D55] via-[#397CB8] to-[#B5D5ED] p-0.5 shadow-[0_0_15px_rgba(57,124,184,0.3)] group-hover:shadow-[0_0_20px_rgba(57,124,184,0.5)] transition-all flex items-center justify-center">
            <div className="w-full h-full bg-black/90 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-[#B5D5ED]" />
            </div>
          </div>
          <span className="text-xl font-extrabold tracking-tight cine-gradient-text">
            CineTogether
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          {navLinks.map(link => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                  isActive ? 'text-[#B5D5ED] font-semibold' : 'text-slate-400'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          {isAuthenticated && (
            <button
              onClick={() => onNavigate('friends')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                currentView === 'friends' ? 'text-[#B5D5ED] font-semibold' : 'text-slate-400'
              }`}
            >
              Friends
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'admin' ? 'text-cyan-300 font-semibold' : 'text-cyan-400/80 hover:text-cyan-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action / Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-[#102D55]/30 border border-[#B5D5ED]/15 transition-all"
                title={user.displayName}
              >
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-[#397CB8]/40"
                  referrerPolicy="no-referrer"
                />
                <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[110px] truncate">
                  {user.displayName}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 glass-panel rounded-xl py-2 shadow-2xl z-50 border border-[#B5D5ED]/20"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#B5D5ED]/10">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                    <p className="text-[11px] font-mono text-[#B5D5ED] tracking-wider mt-0.5">{user.userId}</p>
                  </div>

                  <button
                    onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                  >
                    <UserIcon className="w-4 h-4 text-[#B5D5ED]" />
                    <span>My Profile & Photo</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('friends'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                  >
                    <Users className="w-4 h-4 text-[#B5D5ED]" />
                    <span>Friends & Search</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('create-room'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                  >
                    <Tv className="w-4 h-4 text-[#B5D5ED]" />
                    <span>Create Watch Party</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('join-room'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                  >
                    <Film className="w-4 h-4 text-[#B5D5ED]" />
                    <span>Join with Code</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('settings'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                  >
                    <Shield className="w-4 h-4 text-[#B5D5ED]" />
                    <span>Account & Security</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => { onNavigate('admin'); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-cyan-300 hover:bg-[#102D55]/50 flex items-center gap-2.5"
                    >
                      <Shield className="w-4 h-4 text-cyan-300" />
                      <span>Security Console</span>
                    </button>
                  )}

                  <div className="border-t border-[#B5D5ED]/10 my-1"></div>

                  <button
                    onClick={() => { logout(); setIsUserMenuOpen(false); onNavigate('landing'); }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-black/40 flex items-center gap-2.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('login')}
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="glass-button-primary px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#071426]/95 border-b border-[#B5D5ED]/10 px-4 py-3 space-y-2">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => { onNavigate(link.id); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left py-2 text-sm ${
                currentView === link.id ? 'text-[#B5D5ED] font-semibold' : 'text-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
          {isAuthenticated && (
            <>
              <button
                onClick={() => { onNavigate('friends'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm text-slate-300"
              >
                Friends System
              </button>
              <button
                onClick={() => { onNavigate('profile'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm text-slate-300"
              >
                Profile & Photo Upload
              </button>
              <button
                onClick={() => { onNavigate('create-room'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm text-[#B5D5ED]"
              >
                Create Room
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => { onNavigate('admin'); setIsMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-sm text-cyan-300"
                >
                  Admin Console
                </button>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
};
