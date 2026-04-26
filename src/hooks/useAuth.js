// src/hooks/useAuth.js
//
// Provides:
//   { user, role, isAdmin, loading, signIn, signOut }
//
// Role resolution:
//   1. Fetch profiles.role from Supabase for the logged-in user
//   2. Fall back to 'admin' in offline/artifact mode (no Supabase)
//
// Future extensibility:
//   - Add profiles.physician_id to link a login to a specific physician
//   - Tighten RLS policies to per-physician rows — no app changes needed

import { useState, useEffect } from 'react';
import { supabase, SUPABASE_ENABLED } from '../config/supabase.js';

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);  // 'admin' | 'viewer'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      // Offline / artifact mode — treat as admin so everything works
      setUser({ id: 'local', email: 'local@moga.dev' });
      setRole('admin');
      setLoading(false);
      return;
    }

    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else setLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchRole(session.user.id);
        else { setRole(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setRole(data?.role ?? 'viewer'); // default to viewer if row missing
    } catch (err) {
      console.warn('useAuth: could not fetch role —', err.message);
      setRole('viewer');
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    if (!SUPABASE_ENABLED) return { error: null }; // no-op in offline mode
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    if (!SUPABASE_ENABLED) return;
    await supabase.auth.signOut();
  }

  return {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    signIn,
    signOut,
  };
}
