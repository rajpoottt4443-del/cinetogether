import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

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

  // Load initial session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse local session', e);
    } finally {
      setIsLoading(false);
    }
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
