import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for API routes that are NOT tied to a browser
 * session — e.g. the availability API the chatbot calls.
 *
 * Uses the `service_role` key when present so it keeps working AFTER RLS is
 * enabled (service_role bypasses RLS). Falls back to the anon key for local
 * dev where service_role isn't set.
 *
 * ⚠️ NEVER import this from a client component — service_role bypasses RLS.
 * Only use it inside route handlers / server actions.
 */
export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: NEXT_PUBLIC_SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
