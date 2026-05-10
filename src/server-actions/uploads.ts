"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Server-side upload contracts. Validation here is the source of truth;
 * client-side checks are for UX.
 *
 * Returns a signed-upload token + path. Clients PUT the file to the
 * returned URL, then call the corresponding `record*` action with the
 * path stored in the DB.
 */

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_MIMES = ["video/mp4", "video/quicktime"] as const;

const CAMPAIGN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
const CAMPAIGN_VIDEO_MAX_BYTES = 100 * 1024 * 1024;  // 100 MB
const REWARD_IMAGE_MAX_BYTES   = 5 * 1024 * 1024;    // 5 MB

type UploadKind = "campaign-image" | "campaign-video" | "reward-image";

const uploadInputSchema = z.object({
  kind: z.enum(["campaign-image", "campaign-video", "reward-image"]),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  organizationId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
});

export type CreateSignedUploadInput = z.infer<typeof uploadInputSchema>;

export type CreateSignedUploadResult = {
  bucket: "ambassador-media" | "reward-images";
  path: string;
  signedUrl: string;
  token: string;
};

function validateOrThrow(kind: UploadKind, contentType: string, sizeBytes: number) {
  switch (kind) {
    case "campaign-image":
      if (!IMAGE_MIMES.includes(contentType as (typeof IMAGE_MIMES)[number]))
        throw new Error(`Unsupported image type: ${contentType}`);
      if (sizeBytes > CAMPAIGN_IMAGE_MAX_BYTES)
        throw new Error("Campaign image exceeds 10 MB limit");
      return;
    case "campaign-video":
      if (!VIDEO_MIMES.includes(contentType as (typeof VIDEO_MIMES)[number]))
        throw new Error(`Unsupported video type: ${contentType}`);
      if (sizeBytes > CAMPAIGN_VIDEO_MAX_BYTES)
        throw new Error("Campaign video exceeds 100 MB limit");
      return;
    case "reward-image":
      if (!IMAGE_MIMES.includes(contentType as (typeof IMAGE_MIMES)[number]))
        throw new Error(`Unsupported image type: ${contentType}`);
      if (sizeBytes > REWARD_IMAGE_MAX_BYTES)
        throw new Error("Reward image exceeds 5 MB limit");
      return;
  }
}

/**
 * Confirms the caller belongs to the requested org and has the right
 * permission for the upload kind. Returns the caller's session.
 *
 * Note: this enforces the *active* permission contract. Storage RLS in
 * 0004 enforces it again on the actual upload — defense in depth.
 */
async function authorizeUpload(kind: UploadKind, organizationId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const requiredPerm =
    kind === "reward-image" ? "ambassador.reward.manage" : "ambassador.campaign.manage";

  const { data, error: permError } = await supabase
    .from("organization_members")
    .select("permissions")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .single();
  if (permError || !data) throw new Error("Not a member of this organization");
  if (!data.permissions.includes(requiredPerm)) throw new Error("Permission denied");

  return user;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/jpeg": return "jpg";
    case "image/png":  return "png";
    case "image/webp": return "webp";
    case "video/mp4":  return "mp4";
    case "video/quicktime": return "mov";
    default: return "bin";
  }
}

/**
 * Create a signed upload URL. Client uploads the file by PUT-ing to
 * `signedUrl`, then stores the returned `path` in the relevant DB row.
 */
export async function createSignedUpload(
  input: CreateSignedUploadInput,
): Promise<CreateSignedUploadResult> {
  const parsed = uploadInputSchema.parse(input);
  validateOrThrow(parsed.kind, parsed.contentType, parsed.sizeBytes);
  await authorizeUpload(parsed.kind, parsed.organizationId);

  const isReward = parsed.kind === "reward-image";
  const bucket: CreateSignedUploadResult["bucket"] = isReward
    ? "reward-images"
    : "ambassador-media";

  const folder =
    parsed.kind === "campaign-image"
      ? "campaign-covers"
      : parsed.kind === "campaign-video"
        ? `campaigns/${parsed.campaignId ?? "_"}/content`
        : "rewards";

  const ext = extensionFor(parsed.contentType);
  const fileId = randomUUID();
  const path = `${parsed.organizationId}/${folder}/${fileId}.${ext}`;

  const service = getSupabaseServiceClient();
  const { data, error } = await service.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Failed to create signed upload URL: ${error?.message}`);

  return {
    bucket,
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

/**
 * Issues a short-lived signed download URL for a private object in
 * `ambassador-media`. Used to render covers/content in admin UI.
 */
export async function getSignedReadUrl(
  bucket: "ambassador-media",
  path: string,
  expiresInSeconds = 60 * 10,
) {
  const service = getSupabaseServiceClient();
  const { data, error } = await service.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Failed to create signed read URL: ${error?.message}`);
  return data.signedUrl;
}
