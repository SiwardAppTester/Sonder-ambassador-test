/**
 * Pulls fresh post data for one Instagram connection and upserts into
 * `instagram_posts`. Runs with the service-role client because the admin
 * RLS policy on `instagram_connections` is read-only via the public view.
 */

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  getInstagramUser,
  getMediaInsights,
  listInstagramMedia,
  type IgMedia,
} from "@/lib/instagram/graph-api";

type ConnectionRow = {
  id: string;
  organization_id: string;
  ambassador_id: string;
  ig_business_account_id: string;
  page_access_token: string;
};

export type SyncResult = {
  connectionId: string;
  postsFetched: number;
  postsUpserted: number;
  syncedAt: string;
};

/**
 * Map Graph API media_type to our DB enum. Graph returns "REELS" but we
 * store "REEL" because that's how the column is checked.
 */
function dbMediaType(t: IgMedia["media_type"]): "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL" {
  return t === "REELS" ? "REEL" : t;
}

export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const service = getSupabaseServiceClient();

  const { data: connection, error: connErr } = await service
    .from("instagram_connections")
    .select("id, organization_id, ambassador_id, ig_business_account_id, page_access_token")
    .eq("id", connectionId)
    .is("disconnected_at", null)
    .single<ConnectionRow>();

  if (connErr || !connection) {
    throw new Error(`Connection not found or already disconnected: ${connectionId}`);
  }

  // Refresh profile snapshot (follower count etc.) in parallel with media.
  // Profile fetch failure is non-fatal — we still want media even if the
  // user endpoint is rate-limited.
  let media: IgMedia[];
  let profile: Awaited<ReturnType<typeof getInstagramUser>> | null = null;
  try {
    [media, profile] = await Promise.all([
      listInstagramMedia(
        connection.ig_business_account_id,
        connection.page_access_token,
        25,
      ),
      getInstagramUser(
        connection.ig_business_account_id,
        connection.page_access_token,
      ).catch(() => null),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await service
      .from("instagram_connections")
      .update({ last_sync_error: message, last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);
    throw err;
  }

  const now = new Date().toISOString();

  // Fetch insights for each post in parallel. Each call already swallows
  // its own errors, so a flaky metric on one post doesn't kill the batch.
  const rows = await Promise.all(
    media.map(async (m) => {
      const insights = await getMediaInsights(m.id, connection.page_access_token, m.media_type);
      return {
        organization_id: connection.organization_id,
        ambassador_id: connection.ambassador_id,
        connection_id: connection.id,
        ig_media_id: m.id,
        media_type: dbMediaType(m.media_type),
        permalink: m.permalink,
        media_url: m.media_url ?? null,
        thumbnail_url: m.thumbnail_url ?? null,
        caption: m.caption ?? null,
        like_count: m.like_count ?? 0,
        comments_count: m.comments_count ?? 0,
        insights,
        posted_at: m.timestamp,
        last_synced_at: now,
      };
    }),
  );

  if (rows.length > 0) {
    const { error: upsertErr } = await service
      .from("instagram_posts")
      .upsert(rows, { onConflict: "connection_id,ig_media_id" });
    if (upsertErr) {
      await service
        .from("instagram_connections")
        .update({ last_sync_error: upsertErr.message, last_synced_at: now })
        .eq("id", connection.id);
      throw new Error(`Failed to upsert posts: ${upsertErr.message}`);
    }
  }

  const connectionUpdate: Record<string, unknown> = {
    last_synced_at: now,
    last_sync_error: null,
  };
  if (profile) {
    connectionUpdate.ig_username = profile.username;
    connectionUpdate.ig_followers_count = profile.followers_count ?? null;
    connectionUpdate.ig_follows_count = profile.follows_count ?? null;
    connectionUpdate.ig_media_count = profile.media_count ?? null;
    connectionUpdate.ig_profile_picture_url = profile.profile_picture_url ?? null;
    connectionUpdate.ig_biography = profile.biography ?? null;
  }
  await service
    .from("instagram_connections")
    .update(connectionUpdate)
    .eq("id", connection.id);

  return {
    connectionId: connection.id,
    postsFetched: media.length,
    postsUpserted: rows.length,
    syncedAt: now,
  };
}
