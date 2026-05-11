import type { ReactNode } from "react";

/**
 * Wraps the IG page in a scrollable <main>. Mirrors the pattern in
 * /dashboard/ambassadors/layout.tsx — the parent dashboard layout sets
 * `overflow-hidden` on the viewport, so each section needs its own
 * scroll container or content gets clipped.
 */
export default function InstagramLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
      {children}
    </main>
  );
}
