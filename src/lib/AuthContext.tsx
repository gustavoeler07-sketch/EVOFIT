import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api, getToken, clearToken, setToken, setStoredInfluencerRef, getStoredInfluencerRef } from './api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UserProfile>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    influencerCode?: string;
    influencerUsername?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  detectedInfluencer: { name: string; username: string; code: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectedInfluencer, setDetectedInfluencer] = useState<{ name: string; username: string; code: string } | null>(null);

  // Check URL for influencer link (/joao or ?ref=joao)
  useEffect(() => {
    async function checkInfluencerParam() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let ref = urlParams.get('ref') || urlParams.get('r');

        // Check if pathname is something like /joao or /camila (avoiding system paths)
        const path = window.location.pathname.replace(/^\//, '').toLowerCase();
        const reservedPaths = ['', 'login', 'register', 'admin', 'dashboard', 'treinos', 'progresso', 'perfil', 'historico', 'contato'];
        if (!ref && path && !reservedPaths.includes(path)) {
          ref = path;
        }

        if (ref) {
          const res = await api.influencer.trackClick(ref);
          if (res.success && res.influencer) {
            setStoredInfluencerRef(res.influencer.username);
            setDetectedInfluencer(res.influencer);
          }
        } else {
          const stored = getStoredInfluencerRef();
          if (stored) {
            const check = await api.influencer.check(stored);
            if (check.valid && check.influencer) {
              setDetectedInfluencer(check.influencer);
            }
          }
        }
      } catch {
        // Silently continue if no influencer found
      }
    }

    checkInfluencerParam();
  }, []);

  // Check user session
  const refreshProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.auth.me();
      setUser(res.profile);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    setToken(res.token);
    setUser(res.profile);
    return res.profile;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    influencerCode?: string;
    influencerUsername?: string;
  }) => {
    // If not provided in form, check if we have a detected influencer from URL
    const influencerUsername = data.influencerUsername || detectedInfluencer?.username || getStoredInfluencerRef() || undefined;
    const res = await api.auth.register({
      ...data,
      influencerUsername,
    });
    setToken(res.token);
    setUser(res.profile);
    return res.profile;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        detectedInfluencer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
