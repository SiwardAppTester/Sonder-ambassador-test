/**
 * OAuth state helpers. We carry two facts across the redirect to Facebook:
 *   - which ambassador the resulting connection should attach to
 *   - a CSRF nonce so the callback can prove the redirect originated here
 *
 * Approach: random nonce in the `state` param + an HMAC-signed cookie
 * holding {nonce, ambassadorId, exp}. On callback, we re-read the cookie,
 * verify the signature, check exp, and assert state === nonce.
 *
 * Why HMAC instead of JWT: zero deps, and we don't need claims interop.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OAUTH_STATE_COOKIE = "ig_oauth_state";
const TTL_SECONDS = 10 * 60;

function secret(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.META_APP_SECRET;
  if (!k) throw new Error("No secret available to sign OAuth state cookie");
  return k;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

export type OAuthStatePayload = {
  nonce: string;
  ambassadorId: string;
  popup: boolean;
  exp: number;
};

export function createOAuthState(
  ambassadorId: string,
  options: { popup?: boolean } = {},
): {
  nonce: string;
  cookieValue: string;
} {
  const nonce = b64url(randomBytes(24));
  const payload: OAuthStatePayload = {
    nonce,
    ambassadorId,
    popup: options.popup ?? false,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const json = JSON.stringify(payload);
  const encoded = b64url(Buffer.from(json));
  const sig = sign(encoded);
  return { nonce, cookieValue: `${encoded}.${sig}` };
}

export function verifyOAuthState(
  cookieValue: string | undefined,
  stateFromQuery: string | undefined,
): OAuthStatePayload {
  if (!cookieValue || !stateFromQuery) throw new Error("Missing OAuth state");
  const [encoded, sig] = cookieValue.split(".");
  if (!encoded || !sig) throw new Error("Malformed OAuth state cookie");

  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth state signature mismatch");
  }

  const json = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
  const payload = JSON.parse(json) as OAuthStatePayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("OAuth state expired");
  if (payload.nonce !== stateFromQuery) throw new Error("OAuth state nonce mismatch");
  return payload;
}
