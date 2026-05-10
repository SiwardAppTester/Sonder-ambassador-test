"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/providers/permissions-provider";

type Mode = "all" | "any";

/**
 * Wraps content that should only render if the current user has the required
 * permission(s). Defaults to "all" — every key in `permissions` must match.
 *
 * Usage:
 *   <PermissionGuard permissions={["ambassador.campaign.manage"]}>...</PermissionGuard>
 *   <PermissionGuard permissions={["a", "b"]} mode="any">...</PermissionGuard>
 */
export function PermissionGuard({
  permissions,
  mode = "all",
  fallback = null,
  children,
}: {
  permissions: readonly string[];
  mode?: Mode;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission } = usePermissions();

  const allowed =
    mode === "all" ? permissions.every(hasPermission) : permissions.some(hasPermission);

  return <>{allowed ? children : fallback}</>;
}
