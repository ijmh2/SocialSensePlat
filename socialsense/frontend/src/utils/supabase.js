import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const configurationError = () => new Error('Supabase is not configured for this deployment.');

const unconfiguredSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signUp: async () => ({ data: null, error: configurationError() }),
    signInWithPassword: async () => ({ data: null, error: configurationError() }),
    signInWithOAuth: async () => ({ data: null, error: configurationError() }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: configurationError() }),
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : unconfiguredSupabase;

export default supabase;
