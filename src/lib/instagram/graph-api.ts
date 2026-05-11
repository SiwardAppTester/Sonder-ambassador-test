/**
 * Thin wrapper over the Instagram Graph API (v21.0) and Facebook Login.
 *
 * Why not a full SDK: every call is a single fetch, error shapes are
 * stable, and the Meta SDKs add a lot of weight for very little.
 *
 * Flow this supports:
 *   1. Build OAuth URL  → user logs in at facebook.com
 *   2. Exchange code for short-lived user token
 *   3. Exchange short-lived → long-lived (60 days)
 *   4. List the user's Pages, find one with an IG Business account
 *   5. Get a long-lived Page access token (these don't expire while the
 *      user token is valid + the user keeps the app installed)
 *   6. Fetch IG media + insights for that IG Business account
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// `instagram_manage_insights` is intentionally NOT requested here. It's an
// advanced permission that's locked unless the Meta app's Use Case explicitly
// covers it, and OAuth fails outright if you ask for a scope you don't have
// access to. Without it we lose reach/impressions/saves; basic counts
// (likes, comments) still come back via media fields. Add it back once the
// permission is granted (Use Case change OR App Review approval).
export const REQUIRED_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
] as const;

type GraphError = {
  error?: { message?: string; type?: string; code?: number };
};

async function graphFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `Graph API error (${res.status})`;
    throw new Error(`Instagram Graph: ${msg}`);
  }
  return json;
}

function appCreds() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Missing Meta OAuth env vars. Set META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI.",
    );
  }
  return { appId, appSecret, redirectUri };
}

/** Build the URL to redirect the user to for Facebook Login. */
export function buildAuthUrl(state: string): string {
  const { appId, redirectUri } = appCreds();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: REQUIRED_SCOPES.join(","),
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

/** Exchange the OAuth `code` for a short-lived user access token. */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const { appId, appSecret, redirectUri } = appCreds();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return graphFetch<TokenResponse>(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
}

/** Exchange a short-lived user token for a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  const { appId, appSecret } = appCreds();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return graphFetch<TokenResponse>(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
}

type PagesResponse = {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
};

/** List the Facebook Pages the authorising user manages. */
export async function listPages(userAccessToken: string): Promise<PagesResponse["data"]> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "id,name,access_token",
  });
  const json = await graphFetch<PagesResponse>(`${GRAPH_BASE}/me/accounts?${params.toString()}`);
  return json.data;
}

type IgAccountResponse = {
  instagram_business_account?: { id: string };
  id: string;
};

/** Resolve a Page to its linked IG Business account id (if any). */
export async function getInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: "instagram_business_account",
  });
  const json = await graphFetch<IgAccountResponse>(`${GRAPH_BASE}/${pageId}?${params.toString()}`);
  return json.instagram_business_account?.id ?? null;
}

export type IgUserResponse = {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  website?: string;
};

/** Fetch profile info for an IG Business account. */
export async function getInstagramUser(
  igUserId: string,
  pageAccessToken: string,
): Promise<IgUserResponse> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: [
      "id",
      "username",
      "name",
      "biography",
      "profile_picture_url",
      "followers_count",
      "follows_count",
      "media_count",
      "website",
    ].join(","),
  });
  return graphFetch<IgUserResponse>(`${GRAPH_BASE}/${igUserId}?${params.toString()}`);
}

export type IgMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

type IgMediaResponse = {
  data: IgMedia[];
  paging?: { next?: string };
};

/**
 * Fetch the most recent media for an IG Business account. Defaults to 25 —
 * the Graph API caps a single page at 100, but for Phase 1 we only need
 * the recent slice.
 */
export async function listInstagramMedia(
  igUserId: string,
  pageAccessToken: string,
  limit = 25,
): Promise<IgMedia[]> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: [
      "id",
      "caption",
      "media_type",
      "media_url",
      "thumbnail_url",
      "permalink",
      "timestamp",
      "like_count",
      "comments_count",
    ].join(","),
    limit: String(limit),
  });
  const json = await graphFetch<IgMediaResponse>(
    `${GRAPH_BASE}/${igUserId}/media?${params.toString()}`,
  );
  return json.data;
}

type IgInsightsResponse = {
  data: Array<{ name: string; values: Array<{ value: number }> }>;
};

/**
 * Fetch insights for one media item. The metric set differs by media_type:
 * Reels and Videos expose `plays`/`reach`/`total_interactions`, while images
 * and carousels expose `impressions`/`reach`/`engagement`/`saved`. We try the
 * union; the API ignores unsupported metrics for the asked type silently in
 * some versions and errors in others — we swallow per-call errors so a bad
 * metric on one post doesn't kill the whole sync.
 */
export async function getMediaInsights(
  mediaId: string,
  pageAccessToken: string,
  mediaType: IgMedia["media_type"],
): Promise<Record<string, number>> {
  const isVideoLike = mediaType === "VIDEO" || mediaType === "REELS";
  const metrics = isVideoLike
    ? ["reach", "total_interactions", "plays", "saved"]
    : ["reach", "impressions", "engagement", "saved"];

  const params = new URLSearchParams({
    access_token: pageAccessToken,
    metric: metrics.join(","),
  });

  try {
    const json = await graphFetch<IgInsightsResponse>(
      `${GRAPH_BASE}/${mediaId}/insights?${params.toString()}`,
    );
    const out: Record<string, number> = {};
    for (const row of json.data) {
      out[row.name] = row.values?.[0]?.value ?? 0;
    }
    return out;
  } catch {
    return {};
  }
}
