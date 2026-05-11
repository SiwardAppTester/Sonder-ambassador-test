/**
 * Soft-disconnect a connection: marks `disconnected_at` so the unique
 * partial index frees up but history is retained. Tokens are *not*
 * cleared — leave that for a separate scrub job if needed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  connectionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid connectionId" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();
  const { error } = await service
    .from("instagram_connections")
    .update({ disconnected_at: new Date().toISOString() })
    .eq("id", parsed.data.connectionId)
    .is("disconnected_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
