import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsRemaining?: number;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lockout: LockoutState;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, ageConfirmed: boolean) => Promise<void>;
  googleSignIn: (overrideEmail?: string, overrideName?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (dataUrl: string) => Promise<void>;
  clearLockout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'cinetogether_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lockout, setLockout] = useState<LockoutState>({
    isLocked: false,
    remainingSeconds: 0
  });

  // Load initial session & listen for Supabase OAuth redirect callbacks
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      // 1. Check local session storage first for instant load
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && mounted) {
          setUser(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to parse local session', e);
      }

      // 2. If Supabase is configured, check live session and listen to auth changes
      const activeClient = supabase;
      if (isSupabaseConfigured && activeClient) {
        try {
          const { data: { session } } = await activeClient.auth.getSession();
          if (session?.user && mounted) {
            const { data: profile } = await activeClient
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            const displayName =
              profile?.username ||
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0] ||
              'Film Fan';

            const avatarUrl =
              profile?.avatar_url ||
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`;

            const activeUser: User = {
              id: session.user.id,
              userId: 'CT-' + session.user.id.substring(0, 8).toUpperCase(),
              email: session.user.email || '',
              displayName,
              avatar: avatarUrl,
              createdAt: session.user.created_at || new Date().toISOString(),
              ageConfirmed: true,
              ageConfirmedAt: new Date().toISOString(),
              isGoogleLinked: session.user.app_metadata?.provider === 'google',
              role: (profile?.role as any) || 'user',
              status: 'online',
              twoFactorEnabled: false,
              failedLoginAttempts: 0,
              lockedUntil: null
            };

            setUser(activeUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
          }
        } catch (err) {
          console.warn('[CineTogether] Supabase getSession error:', err);
        }

        // Listen for live OAuth changes
        const { data: { subscription } } = activeClient.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user && mounted) {
            const { data: profile } = await activeClient
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            const displayName =
              profile?.username ||
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0] ||
              'Film Fan';

            const avatarUrl =
              profile?.avatar_url ||
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`;

            const activeUser: User = {
              id: session.user.id,
              userId: 'CT-' + session.user.id.substring(0, 8).toUpperCase(),
              email: session.user.email || '',
              displayName,
              avatar: avatarUrl,
              createdAt: session.user.created_at || new Date().toISOString(),
              ageConfirmed: true,
              ageConfirmedAt: new Date().toISOString(),
              isGoogleLinked: session.user.app_metadata?.provider === 'google',
              role: (profile?.role as any) || 'user',
              status: 'online',
              twoFactorEnabled: false,
              failedLoginAttempts: 0,
              lockedUntil: null
            };

            setUser(activeUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
          } else if (event === 'SIGNED_OUT' && mounted) {
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }

      if (mounted) setIsLoading(false);
    }

    initSession();
    return () => {
      mounted = false;
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (!lockout.isLocked || lockout.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockout(prev => {
        if (prev.remainingSeconds <= 1) {
          clearInterval(timer);
          return { ...prev, isLocked: false, remainingSeconds: 0, message: undefined };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockout.isLocked, lockout.remainingSeconds]);

  const saveSession = (u: User) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.login({ email, password: pass });
      saveSession(res.user);
      setLockout({ isLocked: false, remainingSeconds: 0 });
    } catch (err: any) {
      if (err.locked) {
        setLockout({
          isLocked: true,
          remainingSeconds: err.remainingSeconds || 900,
          message: err.message
        });
      } else if (err.attemptsRemaining !== undefined) {
        setLockout(prev => ({
          ...prev,
          attemptsRemaining: err.attemptsRemaining,
          message: err.message
        }));
      }
      throw err;
    }
  };

  const register = async (email: string, pass: string, name: string, ageConfirmed: boolean) => {
    const res = await api.register({ email, password: pass, displayName: name, ageConfirmed });
    saveSession(res.user);
    setLockout({ isLocked: false, remainingSeconds: 0 });
  };

  const googleSignIn = async (overrideEmail?: string, overrideName?: string) => {
    const targetEmail = overrideEmail || 'alex.cinema@gmail.com';
    const targetName = overrideName || 'Alex Chen';
    const avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80';

    const res = await api.googleAuth({
      email: targetEmail,
      displayName: targetName,
      avatar
    });
    saveSession(res.user);
    setLockout({ isLocked: false, remainingSeconds: 0 });
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const res = await api.updateProfile({
      email: user.email,
      displayName: data.displayName,
      bio: data.bio,
      avatar: data.avatar,
      twoFactorEnabled: data.twoFactorEnabled
    });
    saveSession(res.user);
  };

  const uploadAvatar = async (dataUrl: string) => {
    if (!user) return;
    const res = await api.uploadAvatar(user.email, dataUrl);
    const updated = { ...user, avatar: res.avatar };
    saveSession(updated);
  };

  const clearLockout = () => {
    setLockout({ isLocked: false, remainingSeconds: 0 });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        lockout,
        login,
        register,
        googleSignIn,
        logout,
        updateUser,
        uploadAvatar,
        clearLockout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
