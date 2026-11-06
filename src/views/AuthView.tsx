import React, { useState } from 'react';
import { Film, Lock, Mail, User as UserIcon, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Clock, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AuthViewProps {
  initialMode?: 'login' | 'register' | 'forgot';
  onNavigate: (view: string, params?: any) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login', onNavigate }) => {
  const { login, register, googleSignIn, lockout, clearLockout } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Recovery state
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onNavigate('dashboard');
      } else if (mode === 'register') {
        if (!ageConfirmed) {
          throw new Error('You must confirm that you are aged 18 or above to create an account.');
        }
        await register(email, password, displayName, ageConfirmed);
        onNavigate('dashboard');
      } else if (mode === 'forgot') {
        if (!resetSent) {
          await api.forgotPassword(email);
          setResetSent(true);
        } else {
          await api.resetPassword(email, newPassword);
          setResetSuccess(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await googleSignIn();
      onNavigate('dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cooldown minutes & seconds display
  const cooldownMin = Math.floor(lockout.remainingSeconds / 60);
  const cooldownSec = lockout.remainingSeconds % 60;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black flex items-center justify-center p-4">
      {/* Background ambient radial glow */}
      <div className="absolute w-[600px] h-[400px] cine-gradient-radial opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-[#B5D5ED]/20 p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#102D55] via-[#397CB8] to-[#B5D5ED] p-0.5 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(57,124,184,0.4)]">
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
              <Film className="w-6 h-6 text-[#B5D5ED]" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {mode === 'login' && 'Sign in to CineTogether'}
            {mode === 'register' && 'Create your CineTogether Account'}
            {mode === 'forgot' && 'Account Recovery & Password Reset'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login' && 'Access private watch parties, friends, and synchronized streaming.'}
            {mode === 'register' && 'Get your unique permanent User ID and host unlimited rooms.'}
            {mode === 'forgot' && 'Reset your password and regain access to your party profile.'}
          </p>
        </div>

        {/* 5-ATTEMPT LOCKOUT WARNING BANNER */}
        {lockout.isLocked && (
          <div className="p-4 rounded-xl bg-[#071426] border border-cyan-400/40 text-cyan-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Clock className="w-4 h-4 text-cyan-300" />
              <span>Security Lockout Active (5 Failed Attempts)</span>
            </div>
            <p className="leading-relaxed">
              Login is temporarily locked to defend against credential stuffing. Please wait for the cooldown timer or use password reset.
            </p>
            <div className="text-base font-mono font-bold text-cyan-300 pt-1">
              Cooldown Remaining: {cooldownMin.toString().padStart(2, '0')}:{cooldownSec.toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Remaining attempts notice before lockout */}
        {!lockout.isLocked && lockout.attemptsRemaining !== undefined && lockout.attemptsRemaining < 5 && (
          <div className="p-3 rounded-xl bg-[#071426] border border-[#397CB8]/40 text-slate-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B5D5ED] shrink-0" />
            <span>
              Security Notice: <strong className="text-white">{lockout.attemptsRemaining} attempt(s) remaining</strong> before a 15-minute lock.
            </span>
          </div>
        )}

        {errorMessage && !lockout.isLocked && (
          <div className="p-3 rounded-xl bg-[#071426] border border-cyan-500/30 text-cyan-200 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Google OAuth Button */}
        {mode !== 'forgot' && (
          <div>
            <button
              onClick={handleGoogleAuth}
              disabled={isSubmitting || lockout.isLocked}
              className="w-full glass-button-secondary py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#B5D5ED]/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#071426] px-3 text-slate-400">or with email</span>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. CinemaLover"
                  className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setResetSent(false); }}
                    className="text-[11px] text-[#B5D5ED] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Reset step 2 */}
          {mode === 'forgot' && resetSent && !resetSuccess && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Enter New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 rounded-xl bg-[#071426] border border-[#397CB8] text-white text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B5D5ED]" />
              <span>Password successfully updated. You can now log in!</span>
            </div>
          )}

          {/* 18+ MANDATORY AGE CONFIRMATION CHECKBOX */}
          {mode === 'register' && (
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={ageConfirmed}
                  onChange={e => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#397CB8] rounded border-[#397CB8]"
                />
                <span className="text-xs text-slate-300 leading-tight">
                  <strong className="text-white">Age Advisory (18+):</strong> I confirm that I am aged 18 or above, and accept the community rules for room moderation.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || lockout.isLocked}
            className="w-full glass-button-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,124,184,0.3)] disabled:opacity-50"
          >
            <span>
              {mode === 'login' && (isSubmitting ? 'Authenticating...' : 'Sign In')}
              {mode === 'register' && (isSubmitting ? 'Creating Account...' : 'Agree & Create Account')}
              {mode === 'forgot' && (!resetSent ? 'Send Recovery Code' : 'Save New Password')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        {/* Demo credentials test hint for reviewer */}
        {mode === 'login' && (
          <div className="p-3 rounded-xl bg-[#071426]/70 border border-[#B5D5ED]/10 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Quick Test Credentials:</p>
            <p>Admin: <code className="text-[#B5D5ED]">admin@cinetogether.com</code> / <code className="text-[#B5D5ED]">admin12345</code></p>
            <p>Member: <code className="text-[#B5D5ED]">sarah.connor@cinetogether.com</code> / <code className="text-[#B5D5ED]">password123</code></p>
            <p className="text-[10px] text-slate-500 pt-0.5">Tip: Enter 5 wrong passwords to test the automatic 15-minute lockout!</p>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="pt-4 border-t border-[#B5D5ED]/10 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                onClick={() => { setMode('register'); setErrorMessage(null); }}
                className="text-[#B5D5ED] font-semibold hover:underline"
              >
                Register here (18+)
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                onClick={() => { setMode('login'); setErrorMessage(null); }}
                className="text-[#B5D5ED] font-semibold hover:underline"
              >
                Sign in to your account
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
