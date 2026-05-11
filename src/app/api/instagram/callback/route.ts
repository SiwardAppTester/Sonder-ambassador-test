/**
 * OAuth callback. Exchanges the code, walks Pages → IG Business account,
 * and writes the connection row. On success redirects back to the dashboard
 * with a query flag the sidebar reads to refresh state.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramBusinessAccount,
  getInstagramUser,
  listPages,
  REQUIRED_SCOPES,
} from "@/lib/instagram/graph-api";
import { OAUTH_STATE_COOKIE, verifyOAuthState } from "@/lib/instagram/oauth-state";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

function backToDashboard(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/ambassadors", req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return backToDashboard(req, { ig: "error", reason: errorParam });
  }
  if (!code) {
    return backToDashboard(req, { ig: "error", reason: "missing_code" });
  }

  let ambassadorId: string;
  try {
    const cookieValue = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const payload = verifyOAuthState(cookieValue, state ?? undefined);
    ambassadorId = payload.ambassadorId;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "state_invalid";
    return backToDashboard(req, { ig: "error", reason });
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const pages = await listPages(longLived.access_token);
    if (pages.length === 0) {
      return backToDashboard(req, { ig: "error", reason: "no_pages" });
    }

    // Find the first page that has a linked IG Business account.
    let chosen: {
      page: (typeof pages)[number];
      igUserId: string;
    } | null = null;
    for (const page of pages) {
      const igId = await getInstagramBusinessAccount(page.id, page.access_token);
      if (igId) {
        chosen = { page, igUserId: igId };
        break;
      }
    }
    if (!chosen) {
      return backToDashboard(req, { ig: "error", reason: "no_ig_business_account" });
    }

    const igProfile = await getInstagramUser(chosen.igUserId, chosen.page.access_token);

    const service = getSupabaseServiceClient();

    // Look up the ambassador to get organization_id.
    const { data: ambassador, error: ambErr } = await service
      .from("ambassadors")
      .select("id, organization_id")
      .eq("id", ambassadorId)
      .single();
    if (ambErr || !ambassador) {
      return backToDashboard(req, { ig: "error", reason: "ambassador_not_found" });
    }

    // Soft-disconnect any prior active connection for this ambassador
    // so the unique partial index doesn't collide.
    await service
      .from("instagram_connections")
      .update({ disconnected_at: new Date().toISOString() })
      .eq("ambassador_id", ambassadorId)
      .is("disconnected_at", null);

    const tokenExpiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const { error: insertErr } = await service.from("instagram_connections").insert({
      organization_id: ambassador.organization_id,
      ambassador_id: ambassadorId,
      ig_business_account_id: chosen.igUserId,
      ig_username: igProfile.username,
      fb_page_id: chosen.page.id,
      fb_page_name: chosen.page.name,
      page_access_token: chosen.page.access_token,
      long_lived_user_token: longLived.access_token,
      token_expires_at: tokenExpiresAt,
      scopes: [...REQUIRED_SCOPES],
    });

    if (insertErr) {
      return backToDashboard(req, { ig: "error", reason: insertErr.message });
    }

    return backToDashboard(req, { ig: "connected", handle: igProfile.username });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    return backToDashboard(req, { ig: "error", reason });
  }
}
