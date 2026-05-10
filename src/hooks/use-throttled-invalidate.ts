"use client";

import { useMemo, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Returns an `invalidate(keys)` function that fires at most once per `windowMs`
 * per *individual key*. Used by realtime hooks so a burst of postgres changes
 * doesn't flood the UI with renders.
 *
 * Brief: "All updates throttled to 1 per second per metric."
 */
export function useThrottledInvalidate(windowMs = 1000) {
  const qc = useQueryClient();
  const lastFireRef = useRef<Map<string, number>>(new Map());

  return useMemo(() => {
    return (keys: readonly QueryKey[]) => {
      const now = Date.now();
      for (const key of keys) {
        const id = JSON.stringify(key);
        const last = lastFireRef.current.get(id) ?? 0;
        if (now - last < windowMs) continue;
        lastFireRef.current.set(id, now);
        qc.invalidateQueries({ queryKey: key });
      }
    };
  }, [qc, windowMs]);
}

/**
 * Skip realtime subscriptions when running with mock providers (demo mode).
 * Reading the env var here keeps subscription/teardown gated in one place.
 *
 * `useEffect` guard: setting it on the hook lets each subscriber bail out
 * cleanly without polluting consumer code.
 */
export function useRealtimeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_PROVIDERS !== "true" &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;
}

