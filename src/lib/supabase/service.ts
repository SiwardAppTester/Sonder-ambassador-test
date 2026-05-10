import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. **Never** expose to the browser.
 *
 * Only used for:
 *   * Generating signed-upload URLs (storage owner is the requesting user
 *     anyway; service role just lets us create the URL without the user
 *     being authenticated to storage directly during the action).
 *   * Demo seed script.
 *   * The user-app side of `content_shares` / `share_metrics` writes (when
 *     that side is built).
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service-role Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
