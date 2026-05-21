import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    'CRITICAL WARNING: Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing in environment variables. Please check your .env.local file.'
  );
}

// Bypasses RLS since this is a secure server-to-server operations wrapper.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url-for-compilation.supabase.co',
  supabaseServiceRoleKey || 'placeholder-service-key-for-compilation',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
