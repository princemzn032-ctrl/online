import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add your project URL and anon key to .env.');
  }

  let response;
  try {
    response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
    });
  } catch {
    throw new Error('Cannot connect to Supabase. Check that VITE_SUPABASE_URL points to an active project and that your internet connection is available.');
  }

  if (!response.ok) {
    throw new Error(`Supabase authentication is unavailable (HTTP ${response.status}). Check your project URL and status.`);
  }
}
