// src/config/supabase.js
//
// Creates a single Supabase client instance for the whole app.
// Returns null if env vars are not set — the app gracefully falls back
// to window.storage (artifact/offline mode) in that case.

import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate — both must be real values, not the placeholder strings
const configured =
  url  && url  !== 'https://your-project-id.supabase.co' &&
  key  && key  !== 'your-anon-key-here';

export const supabase = configured ? createClient(url, key) : null;

// Convenience: true when running against real Supabase
export const SUPABASE_ENABLED = !!supabase;
