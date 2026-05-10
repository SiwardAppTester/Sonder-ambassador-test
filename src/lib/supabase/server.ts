import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieSpec = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client bound to the caller's session cookies.
 * RLS applies — every read/write goes through the user's permissions.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieSpec[]) => {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Called from a Server Component during render; setting cookies
              // is a no-op there. The middleware refreshes them.
            }
          }
        },
      },
    },
  );
}
