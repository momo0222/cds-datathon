import { createClient } from "@supabase/supabase-js";

// Admin client that bypasses RLS — only use in server-side API routes
// after verifying the user via supabase.auth.getUser()
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
