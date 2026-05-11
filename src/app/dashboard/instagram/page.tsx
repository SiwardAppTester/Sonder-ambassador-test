import { InstagramDashboardClient } from "./instagram-dashboard-client";

/**
 * Instagram dashboard. Renders the connect flow + the connected-state
 * profile + post grid for whichever ambassador is selected. All data is
 * fetched client-side so the OAuth popup completion can refresh in place.
 *
 * `dynamic = 'force-dynamic'` because the client component reads
 * `useSearchParams()` (for the OAuth ?ig=connected fallback flag) — without
 * this Next.js 15 fails static generation with a Suspense-boundary error.
 */
export const dynamic = "force-dynamic";

export default function InstagramDashboardPage() {
  return <InstagramDashboardClient />;
}
