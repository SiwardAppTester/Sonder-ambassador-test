"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEMO_ADMIN_PERMISSIONS } from "@/lib/permissions";

type PermissionsContextValue = {
  permissions: ReadonlySet<string>;
  hasPermission: (key: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/**
 * Provides the current user's permission set.
 *
 * In the demo this is a static set seeded from `DEMO_ADMIN_PERMISSIONS`.
 * When wired into the real Sonder app, replace the body with a call to the
 * existing permissions service / hook — the public API of this provider
 * (`hasPermission(key)`) intentionally matches the brief.
 */
export function PermissionsProvider({
  children,
  permissions = DEMO_ADMIN_PERMISSIONS,
}: {
  children: ReactNode;
  permissions?: readonly string[];
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set(permissions);
    return {
      permissions: set,
      hasPermission: (key) => set.has(key),
    };
  }, [permissions]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside <PermissionsProvider>");
  return ctx;
}
