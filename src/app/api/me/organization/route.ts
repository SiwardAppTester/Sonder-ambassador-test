import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Returns the signed-in user's first organization (id + display fields).
 *
 * Why a server route instead of a direct browser query?
 * RLS on `organization_members` may hide a user's own row in some
 * deployments (no self-read policy exists). Reading via service-role
 * server-side sidesteps that without needing a migration on the host DB.
 * We still verify the session first so the route only returns the org
 * for the caller, not an arbitrary user_id.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("organization_members")
    .select(
      "organizations (id, name, theme_color, currency, instagram_paid_baseline_cpv, platform_share_cost)",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const o = (data?.organizations ?? null) as
    | {
        id: string;
        name: string;
        theme_color: string;
        currency: string;
        instagram_paid_baseline_cpv: number | string;
        platform_share_cost: number | string;
      }
    | null;
  if (!o) {
    return NextResponse.json({ error: "no-org-membership" }, { status: 404 });
  }
  return NextResponse.json({
    id: o.id,
    name: o.name,
    themeColor: o.theme_color,
    currency: o.currency,
    instagramPaidBaselineCpv: Number(o.instagram_paid_baseline_cpv ?? 0),
    platformShareCost: Number(o.platform_share_cost ?? 0),
  });
}
