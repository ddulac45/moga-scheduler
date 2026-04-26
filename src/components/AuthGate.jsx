// src/components/AuthGate.jsx
//
// Wraps the main app. If Supabase is enabled and the user is not logged in,
// shows a login form. In offline/artifact mode, renders children directly
// (the useAuth hook returns a synthetic local user).

import { useState } from 'react';
import { SUPABASE_ENABLED } from '../config/supabase.js';

const BRAND_NAVY = '#1A6B5A';
const BRAND_BG   = '#EEF9F7';

export function AuthGate({ auth, children }) {
  const { user, loading, signIn } = auth;
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // In offline mode useAuth already sets a synthetic user — just render
  if (!SUPABASE_ENABLED) return children;

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', background:BRAND_BG, fontFamily:'Georgia,serif',
        color:BRAND_NAVY, fontSize:16 }}>
        Loading…
      </div>
    );
  }

  if (user) return children;

  // ── Login form ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) setError(err.message);
    setBusy(false);
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:BRAND_BG, padding:16 }}>
      <div style={{ background:'#fff', border:'1px solid #B2DAD5', borderRadius:12,
        padding:'32px 36px', maxWidth:380, width:'100%',
        boxShadow:'0 8px 32px rgba(0,0,0,.10)' }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Georgia,serif', fontWeight:700,
            fontSize:20, color:BRAND_NAVY, letterSpacing:'.04em' }}>
            Mission Control
          </div>
          <div style={{ fontSize:12, color:'#6EA8A0', marginTop:4 }}>
            Manchester OB/GYN Scheduling
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:12, color:'#256B5E' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus autoComplete="email"
              style={{ fontSize:14, padding:'8px 10px', border:'1px solid #B2DAD5',
                borderRadius:6, fontFamily:'inherit', outline:'none' }}
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:12, color:'#256B5E' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{ fontSize:14, padding:'8px 10px', border:'1px solid #B2DAD5',
                borderRadius:6, fontFamily:'inherit', outline:'none' }}
            />
          </div>

          {error && (
            <div style={{ fontSize:12, color:'#B91C1C', background:'#FEF2F2',
              border:'1px solid #FCA5A5', borderRadius:5, padding:'6px 10px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ background:BRAND_NAVY, color:'#fff', border:'none',
              borderRadius:7, padding:'10px', fontSize:14, fontWeight:700,
              cursor:busy ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              opacity:busy ? 0.7 : 1, marginTop:4 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ fontSize:11, color:'#6EA8A0', textAlign:'center', marginTop:20 }}>
          Contact your administrator to create or reset your account.
        </div>
      </div>
    </div>
  );
}
