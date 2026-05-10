/**
 * Permission keys for the Ambassadors feature.
 *
 * Why a const-tuple instead of a string union: the actual existing Sonder
 * permission system uses string keys at runtime. Listing them here lets us
 * register them with the `usePermissions` provider in one place and gives
 * us autocomplete on `<PermissionGuard permissions={[...]}>`.
 */
export const AMBASSADOR_PERMISSIONS = [
  "ambassador.campaign.manage",
  "ambassador.campaign.view",
  "ambassador.reward.manage",
  "ambassador.reward.view",
  "ambassador.applicant.review",
  "ambassador.list.view",
  "ambassador.overview.view",
  "ambassador.settings.manage",
  "ambassador.points.adjust",
  "ambassador.demo.reset",
] as const;

export type AmbassadorPermission = (typeof AMBASSADOR_PERMISSIONS)[number];

/** Permission keys that are safe to grant to a default admin role in the demo. */
export const DEMO_ADMIN_PERMISSIONS: AmbassadorPermission[] = [
  "ambassador.campaign.manage",
  "ambassador.campaign.view",
  "ambassador.reward.manage",
  "ambassador.reward.view",
  "ambassador.applicant.review",
  "ambassador.list.view",
  "ambassador.overview.view",
  "ambassador.settings.manage",
  "ambassador.points.adjust",
];
