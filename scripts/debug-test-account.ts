/**
 * Diagnostic: sign in as test@sonder.local and try the exact same operations
 * the browser does, so we can see WHY Supabase returns 403.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadDotEnv(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (process.env[key]) continue;
      process.env[key] = val.replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
loadDotEnv(".env.local");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = "test@sonder.local";
const TEST_PASSWORD = "Test1234!";

async function main() {
  console.log("── Service-role view of seeded state ─────────────────────");
  const svc = createClient(URL, SVC, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: usersList } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const u = usersList.users.find((x) => x.email === TEST_EMAIL);
  console.log("  auth user:", u ? { id: u.id, email: u.email } : "NOT FOUND");
  if (!u) return;

  const { data: members, error: mErr } = await svc
    .from("organization_members")
    .select("*")
    .eq("user_id", u.id);
  console.log("  organization_members rows for user:", members, "err:", mErr?.message);

  const orgId = members?.[0]?.organization_id;
  if (!orgId) return;

  const { data: org } = await svc
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();
  console.log("  org row:", org);

  // Probe whether caller_has_permission exists.
  const { data: probe, error: probeErr } = await svc.rpc("caller_has_permission", {
    org_id: orgId,
    perm: "ambassador.campaign.manage",
  });
  console.log("  caller_has_permission (called as service-role, auth.uid()=null):", probe, "err:", probeErr?.message);

  console.log("\n── Now sign in as the user and replay the browser flow ──");
  const anon = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signIn.error) {
    console.log("  signIn ERROR:", signIn.error.message);
    return;
  }
  console.log("  signed in as:", signIn.data.user?.id);

  // Step 1a: query organization_members alone (no join).
  const memOnly = await anon
    .from("organization_members")
    .select("user_id, organization_id, permissions")
    .eq("user_id", signIn.data.user!.id);
  console.log("  organization_members (alone):", memOnly.data, "err:", memOnly.error?.message, "status:", memOnly.status);

  // Step 1b: query organizations alone, using the org id we seeded.
  const orgOnly = await anon
    .from("organizations")
    .select("id, name, theme_color, currency, instagram_paid_baseline_cpv, platform_share_cost")
    .eq("id", orgId);
  console.log("  organizations (alone):", orgOnly.data, "err:", orgOnly.error?.message, "status:", orgOnly.status);

  // Step 1c: same query the OrganizationProvider runs.
  const memberLookup = await anon
    .from("organization_members")
    .select(
      "organizations (id, name, theme_color, currency, instagram_paid_baseline_cpv, platform_share_cost)",
    )
    .eq("user_id", signIn.data.user!.id)
    .limit(1)
    .maybeSingle();
  console.log("  org membership lookup (joined):", JSON.stringify(memberLookup, null, 2));

  // Step 2: replay the caller_has_permission RPC as the signed-in user.
  const perm = await anon.rpc("caller_has_permission", {
    org_id: orgId,
    perm: "ambassador.campaign.manage",
  });
  console.log("  caller_has_permission (signed in):", perm.data, "err:", perm.error?.message);

  // Step 3: the actual insert the browser does.
  const insert = await anon
    .from("campaigns")
    .insert({
      organization_id: orgId,
      name: "Diagnostic campaign " + new Date().toISOString(),
      description: "from debug script",
      cover_image_path: null,
      start_date: null,
      end_date: null,
      max_points_cap: 1000,
      status: "active",
    })
    .select("*")
    .single();
  if (insert.error) {
    console.log("  insert ERROR:", insert.error.code, insert.error.message);
    console.log("  insert details:", insert.error.details, "hint:", insert.error.hint);
  } else {
    console.log("  insert OK:", insert.data?.id);
    // Clean up so we don't leave junk
    await svc.from("campaigns").delete().eq("id", insert.data!.id);
    console.log("  cleaned up diagnostic campaign");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
