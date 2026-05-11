/**
 * Manual sync trigger for one connection. POST { connectionId }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { syncConnection } from "@/lib/instagram/sync";

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

  try {
    const result = await syncConnection(parsed.data.connectionId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
