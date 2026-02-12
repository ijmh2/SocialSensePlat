import { createClient } from '@supabase/supabase-js';

// Railway provides env vars directly - no need for dotenv in production
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set!');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is not set!');
  process.exit(1);
}

// Admin client (bypasses RLS - use carefully!)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;
