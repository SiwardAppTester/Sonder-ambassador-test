import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeForLongLivedToken,
  listPages,
  getInstagramBusinessAccount,
  getInstagramUser,
} from "@/lib/instagram/graph-api";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Mobile Facebook (Business / Instagram) OAuth callback.
 *
 * Flow:
 *   1. Mobile opens facebook.com OAuth URL with `redirect_uri` pointing here.
 *   2. Facebook redirects here with `code`.
 *   3. We exchange the code for a long-lived token, find the user's Page
 *      and linked Instagram Business account, fetch the IG username.
 *   4. We create or update a Supabase auth user (keyed by Facebook email),
 *      stamping IG handle and a few profile fields onto user_metadata.
 *   5. We generate a magic-link `token_hash` and redirect back to the
 *      mobile app via its custom scheme so the app can call verifyOtp().
 *
 * Why a server route instead of letting Supabase's built-in Facebook
 * provider handle it: that provider only requests basic scopes (email +
 * public_profile) and strips business/Instagram tokens. We need the IG
 * Business account info, which requires the desktop's same Graph API
 * flow with full scopes.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function mobileEnv() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI_MOBILE;
  const mobileScheme = process.env.MOBILE_APP_SCHEME ?? "sonderambassador";
  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Missing META_APP_ID / META_APP_SECRET / META_OAUTH_REDIRECT_URI_MOBILE",
    );
  }
  return { appId, appSecret, redirectUri, mobileScheme };
}

async function exchangeMobileCode(code: string): Promise<string> {
  const { appId, appSecret, redirectUri } = mobileEnv();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, {
    cache: "no-store",
  });
  const json = (await res.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? `Token exchange failed (${res.status})`);
  }
  return json.access_token;
}

async function fetchFacebookProfile(accessToken: string): Promise<{
  id: string;
  name?: string;
  email?: string;
}> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,email",
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`, { cache: "no-store" });
  const json = (await res.json()) as {
    id: string;
    name?: string;
    email?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? "Failed to fetch Facebook profile");
  }
  return json;
}

/**
 * Build a deep link back to the mobile app. On success we forward
 * `token_hash` so the app can call supabase.auth.verifyOtp(). On error
 * we forward an `error` query param so the app can show a message.
 */
function mobileRedirect(
  scheme: string,
  payload: { token_hash?: string; error?: string },
): NextResponse {
  const params = new URLSearchParams();
  if (payload.token_hash) params.set("token_hash", payload.token_hash);
  if (payload.error) params.set("error", payload.error);
  const url = `${scheme}://auth/facebook-callback?${params.toString()}`;
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  let mobileScheme = "sonderambassador";
  try {
    const env = mobileEnv();
    mobileScheme = env.mobileScheme;

    const code = req.nextUrl.searchParams.get("code");
    const errorParam = req.nextUrl.searchParams.get("error");
    if (errorParam) {
      return mobileRedirect(mobileScheme, { error: errorParam });
    }
    if (!code) {
      return mobileRedirect(mobileScheme, { error: "missing_code" });
    }

    // 1. Code → short-lived user token. The exchange function verifies
    // the redirect URI matches what Facebook saw.
    const shortToken = await exchangeMobileCode(code);

    // 2. Short-lived → long-lived (~60 days). Reused from desktop helper.
    const longLived = await exchangeForLongLivedToken(shortToken);
    const userAccessToken = longLived.access_token;

    // 3. Facebook profile (for email + display name).
    const fbProfile = await fetchFacebookProfile(userAccessToken);
    if (!fbProfile.email) {
      // Facebook didn't return an email — the user declined the scope or
      // their FB account has no verified email. Without an email we have
      // no stable key to look up / create a Supabase user.
      return mobileRedirect(mobileScheme, { error: "no_email_from_facebook" });
    }

    // 4. Find the first Page with a linked IG Business account.
    // Ambassador eligibility requires this — if a user doesn't have a
    // Page-linked IG Business/Creator account, they can't sign in.
    let igUsername: string | null = null;
    let igFollowers: number | null = null;
    try {
      const pages = await listPages(userAccessToken);
      for (const page of pages) {
        const igId = await getInstagramBusinessAccount(page.id, page.access_token);
        if (!igId) continue;
        const igUser = await getInstagramUser(igId, page.access_token);
        igUsername = igUser.username;
        igFollowers = igUser.followers_count ?? null;
        break;
      }
    } catch (e) {
      console.warn("[mobile-fb-callback] Instagram lookup failed:", e);
      return mobileRedirect(mobileScheme, { error: "instagram_lookup_failed" });
    }
    if (!igUsername) {
      // No Page-linked Instagram Business account found. Surface a
      // specific error so the mobile app can show a tailored message.
      return mobileRedirect(mobileScheme, { error: "no_instagram_business_account" });
    }

    // 5. Find or create the Supabase auth user.
    const supabase = getSupabaseServiceClient();
    const existingByEmail = await findUserByEmail(supabase, fbProfile.email);

    const metadata: Record<string, unknown> = {
      ...(existingByEmail?.user_metadata ?? {}),
      provider: "facebook",
      facebook_id: fbProfile.id,
      full_name: fbProfile.name ?? existingByEmail?.user_metadata?.full_name ?? null,
    };
    if (igUsername) {
      metadata.instagram_handle = igUsername;
      metadata.instagram_account_type = "business";
      metadata.instagram_followers = igFollowers;
    }

    let userId: string;
    if (existingByEmail) {
      const { data, error } = await supabase.auth.admin.updateUserById(existingByEmail.id, {
        user_metadata: metadata,
        email_confirm: true,
      });
      if (error || !data.user) {
        return mobileRedirect(mobileScheme, { error: `update_user_failed: ${error?.message}` });
      }
      userId = data.user.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: fbProfile.email,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error || !data.user) {
        return mobileRedirect(mobileScheme, { error: `create_user_failed: ${error?.message}` });
      }
      userId = data.user.id;
    }

    // 6. Generate a magic-link token the mobile app can redeem.
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: fbProfile.email,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      return mobileRedirect(mobileScheme, {
        error: `magic_link_failed: ${linkError?.message ?? "no token"}`,
      });
    }

    void userId; // referenced for clarity; not surfaced to the client.

    return mobileRedirect(mobileScheme, {
      token_hash: linkData.properties.hashed_token,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return mobileRedirect(mobileScheme, { error: msg });
  }
}

/**
 * Look up a Supabase auth user by email. The admin API doesn't have a
 * direct `getUserByEmail`, so we page through listUsers. For a low-volume
 * demo this is fine; switch to a stored-procedure or indexed lookup if
 * the user count ever grows past a few hundred.
 */
async function findUserByEmail(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  email: string,
) {
  const lower = email.toLowerCase();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === lower);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

