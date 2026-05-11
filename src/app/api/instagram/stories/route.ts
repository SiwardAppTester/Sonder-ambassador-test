/**
 * GET /api/instagram/stories?ambassadorId=…
 * Returns stories for the ambassador's active connection. By default returns
 * stories from the last 7 days (so expired stories that we synced before
 * they vanished from Meta still show up). Pass ?activeOnly=1 to limit to
 * currently-live stories (expires_at > now).
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const querySchema = z.object({
  ambassadorId: z.string().uuid(),
  activeOnly: z.enum(["0", "1"]).optional(),
});

export type InstagramStoryRow = {
  id: string;
  igMediaId: string;
  mediaType: "IMAGE" | "VIDEO";
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  insights: Record<string, number>;
  postedAt: string;
  expiresAt: string;
  isActive: boolean;
};

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    ambassadorId: req.nextUrl.searchParams.get("ambassadorId"),
    activeOnly: req.nextUrl.searchParams.get("activeOnly") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid ambassadorId" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  const { data: connection } = await service
    .from("instagram_connections")
    .select("id")
    .eq("ambassador_id", parsed.data.ambassadorId)
    .is("disconnected_at", null)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ stories: [] satisfies InstagramStoryRow[] });
  }

  let query = service
    .from("instagram_stories")
    .select("id, ig_media_id, media_type, permalink, media_url, thumbnail_url, insights, posted_at, expires_at")
    .eq("connection_id", connection.id)
    .order("posted_at", { ascending: false });

  if (parsed.data.activeOnly === "1") {
    query = query.gt("expires_at", new Date().toISOString());
  } else {
    // Default: show last 7 days, so recently-expired stories are visible.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("posted_at", since);
  }

  const { data: stories, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const result: InstagramStoryRow[] = (stories ?? []).map((s) => ({
    id: s.id,
    igMediaId: s.ig_media_id,
    mediaType: s.media_type,
    permalink: s.permalink,
    mediaUrl: s.media_url,
    thumbnailUrl: s.thumbnail_url,
    insights: (s.insights ?? {}) as Record<string, number>,
    postedAt: s.posted_at,
    expiresAt: s.expires_at,
    isActive: new Date(s.expires_at).getTime() > now,
  }));

  return NextResponse.json({ stories: result });
}
