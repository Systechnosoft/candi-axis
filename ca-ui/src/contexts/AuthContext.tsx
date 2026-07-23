'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export interface UserSession {
  user: {
    id: string;
    email: string;
    full_name: string;
    designation?: string;
    department?: string;
    org_id?: string;
  };
  roles: string[];
  org_id?: string; // convenience top-level alias
  access: Record<string, string>; // moduleCode -> accessLevel
}

interface AuthContextValue {
  session: UserSession | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasAccess: (moduleCode: string, minLevel?: 'viewer' | 'editor' | 'administrator') => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LEVEL_RANK: Record<string, number> = {
  deny: 0,
  viewer: 1,
  editor: 2,
  administrator: 3,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether this is the first load so we don't set loading=true on
  // background token refreshes (which happen on tab switch). Doing so would
  // unmount the current page and clear any form data the user has entered.
  const initializedRef = React.useRef(false);
  const router = useRouter();
  const supabase = createClient();

  /**
   * Fetches the ATS RBAC session from the backend using the Supabase access token.
   * The access token is automatically managed in cookies by @supabase/ssr.
   * @param showLoader - Only true on the very first load, never on background refreshes.
   */
  const fetchAtsSession = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const { data: { session: sbSession } } = await supabase.auth.getSession();

      if (!sbSession?.access_token) {
        setSession(null);
        return;
      }

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${sbSession.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // First load — show the spinner
    fetchAtsSession(true).then(() => {
      initializedRef.current = true;
    });

    // Listen for Supabase auth state changes (sign in, sign out, token refresh)
    // After the first load, do NOT set loading=true to avoid unmounting pages
    // and clearing form data when the user switches tabs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (!initializedRef.current) return; // initial fetch already handles this
      if (sbSession?.access_token) {
        fetchAtsSession(false); // silent background refresh
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAtsSession, supabase]);

  const logout = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    router.push('/login');
  }, [router, supabase]);

  const hasAccess = useCallback(
    (moduleCode: string, minLevel: 'viewer' | 'editor' | 'administrator' = 'viewer') => {
      if (!session) return false;
      const level =
        session.access[moduleCode] ||
        session.access[moduleCode.toUpperCase()] ||
        session.access[moduleCode.toLowerCase()];
      if (!level || level === 'deny') return false;
      return (LEVEL_RANK[level] ?? 0) >= LEVEL_RANK[minLevel];
    },
    [session],
  );

  return (
    <AuthContext.Provider value={{ session, loading, logout, refresh: fetchAtsSession, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
