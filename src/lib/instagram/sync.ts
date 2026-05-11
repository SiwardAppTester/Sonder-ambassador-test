/**
 * Pulls fresh post data for one Instagram connection and upserts into
 * `instagram_posts`. Runs with the service-role client because the admin
 * RLS policy on `instagram_connections` is read-only via the public view.
 */

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  getInstagramUser,
  getMediaInsights,
  getStoryInsights,
  listInstagramMedia,
  listInstagramStories,
  type IgMedia,
  type IgStory,
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
  storiesFetched: number;
  storiesUpserted: number;
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

  // Refresh profile, media, and active stories in parallel. Profile +
  // stories failures are non-fatal (no profile = stale display; no stories
  // is the common case — most accounts don't have any active). Media
  // failure IS fatal because it's the core of what we sync.
  let media: IgMedia[];
  let stories: IgStory[] = [];
  let profile: Awaited<ReturnType<typeof getInstagramUser>> | null = null;
  try {
    [media, stories, profile] = await Promise.all([
      listInstagramMedia(
        connection.ig_business_account_id,
        connection.page_access_token,
        25,
      ),
      listInstagramStories(
        connection.ig_business_account_id,
        connection.page_access_token,
      ).catch(() => [] as IgStory[]),
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

  // Fetch insights for each post in parallel. Capture the first error we see
  // so the UI can surface it (otherwise empty insights look like silent
  // success and the user has no idea what's wrong).
  let firstInsightsError: string | null = null;
  const rows = await Promise.all(
    media.map(async (m) => {
      const result = await getMediaInsights(m.id, connection.page_access_token, m.media_type);
      if (result.error && !firstInsightsError) firstInsightsError = result.error;
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
        insights: result.data,
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

  // Stories — fetch insights per active story, then upsert. We deliberately
  // don't delete expired rows; once a story is in our DB we keep it.
  const storyRows = await Promise.all(
    stories.map(async (s) => {
      const result = await getStoryInsights(s.id, connection.page_access_token);
      const postedAt = new Date(s.timestamp);
      const expiresAt = new Date(postedAt.getTime() + 24 * 60 * 60 * 1000);
      return {
        organization_id: connection.organization_id,
        ambassador_id: connection.ambassador_id,
        connection_id: connection.id,
        ig_media_id: s.id,
        media_type: s.media_type,
        permalink: s.permalink ?? null,
        media_url: s.media_url ?? null,
        thumbnail_url: s.thumbnail_url ?? null,
        insights: result.data,
        posted_at: postedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_synced_at: now,
      };
    }),
  );

  if (storyRows.length > 0) {
    const { error: storyUpsertErr } = await service
      .from("instagram_stories")
      .upsert(storyRows, { onConflict: "connection_id,ig_media_id" });
    if (storyUpsertErr) {
      // Log but don't fail the whole sync — stories are best-effort.
      console.error("Failed to upsert stories:", storyUpsertErr.message);
    }
  }

  const connectionUpdate: Record<string, unknown> = {
    last_synced_at: now,
    last_sync_error: firstInsightsError
      ? `Insights call failed: ${firstInsightsError}`
      : null,
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
    storiesFetched: stories.length,
    storiesUpserted: storyRows.length,
    syncedAt: now,
  };
}
