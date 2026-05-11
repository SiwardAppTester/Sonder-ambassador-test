/**
 * Lists ambassadors for the test sidebar drawer, joined with their active
 * Instagram connection (if any). Service-role: this is admin-only test
 * tooling and the demo doesn't have caller auth threaded everywhere yet.
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
      "id, ambassador_id, ig_username, connected_at, last_synced_at, last_sync_error, token_expires_at",
    )
    .is("disconnected_at", null)
    .in("ambassador_id", ids);

  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 });

  // Count posts per connection so the drawer can show "12 posts synced".
  const connectionIds = (connections ?? []).map((c) => c.id);
  const postCounts = new Map<string, number>();
  if (connectionIds.length > 0) {
    const { data: counts } = await service
      .from("instagram_posts")
      .select("connection_id", { count: "exact", head: false })
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
