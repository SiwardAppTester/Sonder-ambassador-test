import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

/**
 * Mobile sign-in init. The mobile app calls GET here to get the URL it
 * should open in the in-app browser. Centralizing URL construction here
 * means scope changes don't require a mobile rebuild.
 *
 * The returned `state` is a one-time nonce. The callback route doesn't
 * strictly enforce it (we trust the OAuth flow's redirect_uri match), but
 * the mobile app can verify the value matches what it received.
 */

const GRAPH_VERSION = "v21.0";

const MOBILE_SCOPES = [
  "email",
  "public_profile",
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI_MOBILE;
  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing META_APP_ID or META_OAUTH_REDIRECT_URI_MOBILE on server" },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: MOBILE_SCOPES.join(","),
  });
  const url = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;

  return NextResponse.json({ url, state });
}
