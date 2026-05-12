/**
 * Seed a single test account for the desktop admin app.
 *
 * Creates (idempotently):
 *   - A Supabase auth user (test@sonder.local / Test1234!)
 *   - An organization row ("Test Festival")
 *   - An organization_members row granting the perms the dashboard needs
 *
 * Usage:
 *   npx tsx scripts/seed-test-account.ts
 *
 * Required env (loaded from `.env.local` automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
  } catch {
    /* fine */
  }
}
loadDotEnv(".env.local");
loadDotEnv(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const TEST_EMAIL = "test@sonder.local";
const TEST_PASSWORD = "Test1234!";
const ORG_NAME = "Test Festival";
const PERMS = [
  "ambassador.list.view",
  "ambassador.applicant.review",
  "ambassador.campaign.view",
  "ambassador.campaign.manage",
  "ambassador.reward.manage",
  "ambassador.settings.manage",
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureAuthUser(): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const found = data.users.find((u) => u.email === TEST_EMAIL);
  if (found) {
    console.log(`✓ auth user exists: ${TEST_EMAIL} (${found.id})`);
    return found.id;
  }
  const created = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("createUser returned no user");
  }
  console.log(`+ auth user created: ${TEST_EMAIL} (${created.data.user.id})`);
  return created.data.user.id;
}

async function ensureOrg(): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", ORG_NAME)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    console.log(`✓ org exists: ${ORG_NAME} (${existing.id})`);
    return existing.id as string;
  }
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name: ORG_NAME, theme_color: "#5b8a86", is_public: true })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert org returned no row");
  console.log(`+ org created: ${ORG_NAME} (${data.id})`);
  return data.id as string;
}

async function ensureMembership(userId: string, orgId: string): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from("organization_members")
    .select("permissions")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const have = new Set<string>((existing.permissions as string[]) ?? []);
    const missing = PERMS.filter((p) => !have.has(p));
    if (missing.length === 0) {
      console.log("✓ membership exists with all required permissions");
      return;
    }
    const merged = [...have, ...missing];
    const { error: updErr } = await supabase
      .from("organization_members")
      .update({ permissions: merged })
      .eq("user_id", userId)
      .eq("organization_id", orgId);
    if (updErr) throw updErr;
    console.log(`✓ membership updated; added: ${missing.join(", ")}`);
    return;
  }

  const { error } = await supabase.from("organization_members").insert({
    user_id: userId,
    organization_id: orgId,
    permissions: PERMS,
  });
  if (error) throw error;
  console.log(`+ membership created with ${PERMS.length} permissions`);
}

async function main() {
  console.log(`→ Seeding test account against ${SUPABASE_URL}`);
  const userId = await ensureAuthUser();
  const orgId = await ensureOrg();
  await ensureMembership(userId, orgId);
  console.log("\n✔ Done.");
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Org:      ${ORG_NAME} (${orgId})`);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
