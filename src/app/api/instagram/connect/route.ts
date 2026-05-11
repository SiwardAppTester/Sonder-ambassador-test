/**
 * Initiates the Instagram OAuth flow. Caller passes ?ambassadorId=…; we
 * stash that + a nonce in a signed cookie, then redirect to Facebook.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildAuthUrl } from "@/lib/instagram/graph-api";
import { createOAuthState, OAUTH_STATE_COOKIE } from "@/lib/instagram/oauth-state";

const querySchema = z.object({
  ambassadorId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    ambassadorId: req.nextUrl.searchParams.get("ambassadorId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid ambassadorId" }, { status: 400 });
  }

  const { nonce, cookieValue } = createOAuthState(parsed.data.ambassadorId);
  const authUrl = buildAuthUrl(nonce);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
