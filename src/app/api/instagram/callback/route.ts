/**
 * OAuth callback. Exchanges the code, walks Pages → IG Business account,
 * stores the connection (with profile snapshot).
 *
 * Two return modes, picked by the `popup` flag carried in the OAuth state:
 *   - full-page: 302 back to /dashboard/instagram with ?ig=… flags
 *   - popup:     render an HTML page that postMessages the parent and closes
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getGrantedPermissions,
  getInstagramBusinessAccount,
  getInstagramUser,
  listPages,
} from "@/lib/instagram/graph-api";
import { OAUTH_STATE_COOKIE, verifyOAuthState } from "@/lib/instagram/oauth-state";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type Outcome = { ig: "connected"; handle: string } | { ig: "error"; reason: string };

function done(req: NextRequest, isPopup: boolean, outcome: Outcome): NextResponse {
  if (isPopup) {
    return popupResponse(outcome);
  }
  const url = new URL("/dashboard/instagram", req.url);
  for (const [k, v] of Object.entries(outcome)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

/**
 * Self-closing HTML for the popup window. Posts the outcome to the opener
 * and closes itself. We restrict the postMessage target to same-origin —
 * the parent listener must verify event.origin too.
 */
function popupResponse(outcome: Outcome): NextResponse {
  const json = JSON.stringify({ source: "ig-oauth", ...outcome });
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Instagram</title></head>
<body style="font-family:system-ui;background:#0b0b0d;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Closing…</p>
  <script>
    (function () {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${json}, window.location.origin);
        }
      } catch (e) { /* opener may be cross-origin or gone */ }
      setTimeout(function () { window.close(); }, 50);
    })();
  </script>
</body></html>`;
  const res = new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  // Default to popup mode in error paths only if the cookie says so;
  // until we verify state we don't trust anything from the URL.
  let isPopup = false;
  let ambassadorId: string | null = null;
  try {
    const cookieValue = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const payload = verifyOAuthState(cookieValue, state ?? undefined);
    ambassadorId = payload.ambassadorId;
    isPopup = payload.popup;
  } catch (err) {
    // State invalid: we don't know if this was a popup. Fall back to redirect.
    if (errorParam || !code) {
      return done(req, false, {
        ig: "error",
        reason: errorParam ?? "missing_code",
      });
    }
    const reason = err instanceof Error ? err.message : "state_invalid";
    return done(req, false, { ig: "error", reason });
  }

  if (errorParam) {
    return done(req, isPopup, { ig: "error", reason: errorParam });
  }
  if (!code) {
    return done(req, isPopup, { ig: "error", reason: "missing_code" });
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const pages = await listPages(longLived.access_token);
    if (pages.length === 0) {
      return done(req, isPopup, { ig: "error", reason: "no_pages" });
    }

    let chosen: { page: (typeof pages)[number]; igUserId: string } | null = null;
    for (const page of pages) {
      const igId = await getInstagramBusinessAccount(page.id, page.access_token);
      if (igId) {
        chosen = { page, igUserId: igId };
        break;
      }
    }
    if (!chosen) {
      return done(req, isPopup, { ig: "error", reason: "no_ig_business_account" });
    }

    const igProfile = await getInstagramUser(chosen.igUserId, chosen.page.access_token);

    // Capture the scopes Meta ACTUALLY granted (not what we asked for). If
    // insights are missing later, this column tells the user immediately.
    const grantedScopes = await getGrantedPermissions(longLived.access_token).catch(
      () => [] as string[],
    );

    const service = getSupabaseServiceClient();

    const { data: ambassador, error: ambErr } = await service
      .from("ambassadors")
      .select("id, organization_id")
      .eq("id", ambassadorId!)
      .single();
    if (ambErr || !ambassador) {
      return done(req, isPopup, { ig: "error", reason: "ambassador_not_found" });
    }

    await service
      .from("instagram_connections")
      .update({ disconnected_at: new Date().toISOString() })
      .eq("ambassador_id", ambassadorId!)
      .is("disconnected_at", null);

    const tokenExpiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const { error: insertErr } = await service.from("instagram_connections").insert({
      organization_id: ambassador.organization_id,
      ambassador_id: ambassadorId!,
      ig_business_account_id: chosen.igUserId,
      ig_username: igProfile.username,
      fb_page_id: chosen.page.id,
      fb_page_name: chosen.page.name,
      page_access_token: chosen.page.access_token,
      long_lived_user_token: longLived.access_token,
      token_expires_at: tokenExpiresAt,
      scopes: grantedScopes,
      ig_followers_count: igProfile.followers_count ?? null,
      ig_follows_count: igProfile.follows_count ?? null,
      ig_media_count: igProfile.media_count ?? null,
      ig_profile_picture_url: igProfile.profile_picture_url ?? null,
      ig_biography: igProfile.biography ?? null,
    });

    if (insertErr) {
      return done(req, isPopup, { ig: "error", reason: insertErr.message });
    }

    return done(req, isPopup, { ig: "connected", handle: igProfile.username });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    return done(req, isPopup, { ig: "error", reason });
  }
}
