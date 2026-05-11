/**
 * Lists ambassadors for the Instagram dashboard, joined with their active
 * connection's profile snapshot. Service-role: admin-only test tooling.
 */

import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type AmbassadorWithConnection = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  instagramHandle: string | null;
  connection: {
    id: string;
    igUsername: string;
    igProfilePictureUrl: string | null;
    igBiography: string | null;
    igFollowersCount: number | null;
    igFollowsCount: number | null;
    igMediaCount: number | null;
    connectedAt: string;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
    tokenExpiresAt: string | null;
    postCount: number;
  } | null;
};

export async function GET() {
  const service = getSupabaseServiceClient();

  const { data: ambassadors, error: ambErr } = await service
    .from("ambassadors")
    .select("id, first_name, last_name, instagram_handle, status, archived_at")
    .is("archived_at", null)
    .in("status", ["approved", "pending"])
    .order("first_name", { ascending: true });

  if (ambErr) return NextResponse.json({ error: ambErr.message }, { status: 500 });

  const ids = (ambassadors ?? []).map((a) => a.id);
  if (ids.length === 0) return NextResponse.json({ ambassadors: [] });

  const { data: connections, error: connErr } = await service
    .from("instagram_connections")
    .select(
      "id, ambassador_id, ig_username, ig_profile_picture_url, ig_biography, ig_followers_count, ig_follows_count, ig_media_count, connected_at, last_synced_at, last_sync_error, token_expires_at",
    )
    .is("disconnected_at", null)
    .in("ambassador_id", ids);

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 });

  const connectionIds = (connections ?? []).map((c) => c.id);
  const postCounts = new Map<string, number>();
  if (connectionIds.length > 0) {
    const { data: counts } = await service
      .from("instagram_posts")
      .select("connection_id")
      .in("connection_id", connectionIds);
    for (const row of counts ?? []) {
      postCounts.set(row.connection_id, (postCounts.get(row.connection_id) ?? 0) + 1);
    }
  }

  const connByAmbassador = new Map<string, (typeof connections)[number]>();
  for (const c of connections ?? []) connByAmbassador.set(c.ambassador_id, c);

  const result: AmbassadorWithConnection[] = (ambassadors ?? []).map((a) => {
    const c = connByAmbassador.get(a.id);
    return {
      id: a.id,
      firstName: a.first_name,
      lastName: a.last_name,
      instagramHandle: a.instagram_handle,
      connection: c
        ? {
            id: c.id,
            igUsername: c.ig_username,
            igProfilePictureUrl: c.ig_profile_picture_url,
            igBiography: c.ig_biography,
            igFollowersCount: c.ig_followers_count,
            igFollowsCount: c.ig_follows_count,
            igMediaCount: c.ig_media_count,
            connectedAt: c.connected_at,
            lastSyncedAt: c.last_synced_at,
            lastSyncError: c.last_sync_error,
            tokenExpiresAt: c.token_expires_at,
            postCount: postCounts.get(c.id) ?? 0,
          }
        : null,
    };
  });

  return NextResponse.json({ ambassadors: result });
}
