import { InstagramDashboardClient } from "./instagram-dashboard-client";

/**
 * Instagram dashboard. Renders the connect flow + the connected-state
 * profile + post grid for whichever ambassador is selected. All data is
 * fetched client-side so the OAuth popup completion can refresh in place.
 */
export default function InstagramDashboardPage() {
  return <InstagramDashboardClient />;
}
