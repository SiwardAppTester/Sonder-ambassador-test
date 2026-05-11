/**
 * GET /api/instagram/posts?ambassadorId=…
 * Returns the synced IG posts for an ambassador's active connection,
 * ordered newest-first. Insights jsonb is passed through as-is.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const querySchema = z.object({
  ambassadorId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type InstagramPostRow = {
  id: string;
  igMediaId: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  likeCount: number;
  commentsCount: number;
  insights: Record<string, number>;
  postedAt: string;
};

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    ambassadorId: req.nextUrl.searchParams.get("ambassadorId"),
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
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
    return NextResponse.json({ posts: [] satisfies InstagramPostRow[] });
  }

  const { data: posts, error } = await service
    .from("instagram_posts")
    .select(
      "id, ig_media_id, media_type, permalink, media_url, thumbnail_url, caption, like_count, comments_count, insights, posted_at",
    )
    .eq("connection_id", connection.id)
    .order("posted_at", { ascending: false })
    .limit(parsed.data.limit ?? 50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: InstagramPostRow[] = (posts ?? []).map((p) => ({
    id: p.id,
    igMediaId: p.ig_media_id,
    mediaType: p.media_type,
    permalink: p.permalink,
    mediaUrl: p.media_url,
    thumbnailUrl: p.thumbnail_url,
    caption: p.caption,
    likeCount: p.like_count,
    commentsCount: p.comments_count,
    insights: (p.insights ?? {}) as Record<string, number>,
    postedAt: p.posted_at,
  }));

  return NextResponse.json({ posts: result });
}
