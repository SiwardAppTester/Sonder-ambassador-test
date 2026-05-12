import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 100 * 1024 * 1024;

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "video/mp4": return "mp4";
    case "video/quicktime": return "mov";
    default: return "bin";
  }
}

/**
 * Multipart upload for campaign content.
 *
 * Why a single multipart route (instead of the existing signed-upload
 * flow in src/server-actions/uploads.ts)?
 *   - Simpler to wire up end-to-end for the demo; one request does both
 *     the storage write and the DB insert atomically from the client's pov.
 *   - The RLS gap on `organization_members` blocks `authorizeUpload` in
 *     the existing server action; service-role here bypasses that.
 *   - File sizes are small (≤10MB image / 100MB video), proxying through
 *     Next.js is fine for now. If we ever need true scale, switch back
 *     to signed uploads.
 *
 * Stores the file in the PRIVATE `ambassador-media` bucket AND saves a
 * long-lived signed URL into `campaign_contents.image_url` so the mobile
 * anon client can render the image without storage RLS getting in the way.
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const campaignId = form.get("campaign_id");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof campaignId !== "string" || !campaignId) {
    return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  }

  const contentType = file.type;
  const isImage = IMAGE_MIMES.includes(contentType);
  const isVideo = VIDEO_MIMES.includes(contentType);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: `Unsupported type: ${contentType}` }, { status: 400 });
  }
  if (isImage && file.size > IMAGE_MAX) {
    return NextResponse.json({ error: "Image exceeds 10 MB limit" }, { status: 400 });
  }
  if (isVideo && file.size > VIDEO_MAX) {
    return NextResponse.json({ error: "Video exceeds 100 MB limit" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  // Look up campaign + org via service-role (RLS on organization_members
  // would hide the membership row from the user themselves). We also grab
  // the campaign's points settings — those are now defined at the campaign
  // level and copied onto every content row at insert time.
  const { data: campaign, error: campaignErr } = await service
    .from("campaigns")
    .select("id, organization_id, points_per_share, points_per_1k_views")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignErr || !campaign) {
    return NextResponse.json({ error: "campaign not found" }, { status: 404 });
  }

  const { data: membership } = await service
    .from("organization_members")
    .select("permissions")
    .eq("user_id", user.id)
    .eq("organization_id", campaign.organization_id)
    .maybeSingle();
  if (!membership || !(membership.permissions as string[]).includes("ambassador.campaign.manage")) {
    return NextResponse.json({ error: "permission denied" }, { status: 403 });
  }

  // Upload to private bucket.
  const ext = extensionFor(contentType);
  const path = `${campaign.organization_id}/campaigns/${campaignId}/content/${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: upErr } = await service.storage
    .from("ambassador-media")
    .upload(path, bytes, { contentType, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
  }

  // Long-lived signed URL so mobile anon clients can render the image.
  // ~1 year; regenerate if it ever expires.
  const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
  const { data: signed, error: signErr } = await service.storage
    .from("ambassador-media")
    .createSignedUrl(path, ONE_YEAR_SECONDS);
  if (signErr || !signed) {
    return NextResponse.json({ error: `sign-url failed: ${signErr?.message}` }, { status: 500 });
  }

  // Parse the rest of the form fields.
  const stringField = (key: string): string | null => {
    const v = form.get(key);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const hashtagsRaw = form.get("hashtags");
  const hashtags =
    typeof hashtagsRaw === "string" && hashtagsRaw
      ? hashtagsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const { data: inserted, error: insErr } = await service
    .from("campaign_contents")
    .insert({
      organization_id: campaign.organization_id,
      campaign_id: campaignId,
      type: isImage ? "image" : "video",
      file_path: path,
      thumbnail_path: null,
      image_url: signed.signedUrl,
      file_size_bytes: file.size,
      // Snapshot the campaign's points settings onto the content row.
      // Per the schema comment, these are point-in-time snapshots — editing
      // the campaign's values later doesn't retroactively change earned
      // points on existing shares (those are snapshotted onto share rows
      // at share time by the user-app side).
      points_per_share: campaign.points_per_share ?? 0,
      points_per_1k_views: campaign.points_per_1k_views ?? 0,
      caption_template: stringField("caption_template"),
      hashtags,
      instructions: stringField("instructions"),
      display_order: null,
    })
    .select(
      "id, campaign_id, type, file_path, image_url, file_size_bytes, points_per_share, points_per_1k_views, caption_template, hashtags, instructions, display_order, created_at",
    )
    .single();

  if (insErr || !inserted) {
    // Best-effort cleanup so we don't leave orphan storage objects.
    await service.storage.from("ambassador-media").remove([path]);
    return NextResponse.json({ error: `insert failed: ${insErr?.message}` }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    campaignId: inserted.campaign_id,
    type: inserted.type,
    fileUrl: inserted.image_url,
    thumbnailUrl: inserted.image_url,
    fileSizeBytes: inserted.file_size_bytes,
    pointsPerShare: inserted.points_per_share,
    pointsPer1kViews: inserted.points_per_1k_views,
    captionTemplate: inserted.caption_template,
    hashtags: inserted.hashtags ?? [],
    instructions: inserted.instructions,
    displayOrder: inserted.display_order,
    createdAt: inserted.created_at,
  });
}
