"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { contrastingForegroundTriplet, hexToRgbTriplet } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type Organization = {
  id: string;
  name: string;
  themeColor: string;     // hex, e.g. "#7c5cff"
  currency: string;       // ISO 4217, e.g. "EUR"
  instagramPaidBaselineCpv: number;
  platformShareCost: number;
};

type OrganizationContextValue = {
  organization: Organization;
  /** The currently-applied brand color hex (override if set, else org default). */
  brandColor: string;
  /** Set a brand color override (persisted to localStorage). Pass `null` to clear. */
  setBrandColor: (hex: string | null) => void;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

const BRAND_OVERRIDE_KEY = "brand-color-override";

// Placeholder used before the signed-in user's org has loaded and on
// public routes (e.g. /sign-in) where no membership exists.
const DEMO_ORG: Organization = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Demo Hospitality",
  themeColor: "#5b8a86",
  currency: "EUR",
  instagramPaidBaselineCpv: 0.015,
  platformShareCost: 0.35,
};

/**
 * Provides the active organization to the tree, plus pushes its theme color
 * into a CSS custom property so `bg-brand`, `text-brand`, etc. resolve to
 * the org's color.
 *
 * On mount, looks up the signed-in user's first organization_members row
 * and uses that organization. Falls back to DEMO_ORG when no user is
 * signed in (e.g. before sign-in completes, or on /sign-in itself).
 *
 * Also supports a user-level brand override (persisted to localStorage),
 * applied via `setBrandColor()` from the BrandCustomizer in the sidebar.
 */
export function OrganizationProvider({
  children,
  organization: initialOrg,
}: {
  children: ReactNode;
  organization?: Organization;
}) {
  const [organization, setOrganization] = useState<Organization>(initialOrg ?? DEMO_ORG);

  useEffect(() => {
    let cancelled = false;

    async function loadOrg() {
      const res = await fetch("/api/me/organization", { credentials: "include" });
      if (cancelled) return;
      if (res.status === 401) {
        // Not signed in. Reset to placeholder so a previous session's org
        // doesn't leak into a logged-out session.
        setOrganization(initialOrg ?? DEMO_ORG);
        return;
      }
      if (res.status === 404) {
        // Signed-in user has no membership. Falling back to DEMO_ORG would
        // let writes try the fake UUID and fail with RLS 403. Sign them out.
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = "/sign-in?error=no-org-access";
        return;
      }
      if (!res.ok) return;
      const o = (await res.json()) as Organization;
      if (cancelled) return;
      setOrganization(o);
    }

    loadOrg();

    // The provider lives in the root layout, so it never unmounts between
    // /sign-in and /dashboard. Without this subscription, the useEffect
    // would only run once (while unauthenticated), and signing in would
    // never refresh the org — writes would silently use DEMO_ORG and 403.
    const supabase = getSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        loadOrg();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // `initialOrg` is stable for the lifetime of the provider; we don't
    // want re-subscribing every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [brandOverride, setBrandOverride] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(BRAND_OVERRIDE_KEY);
  });

  const effectiveColor = brandOverride ?? organization.themeColor;

  useEffect(() => {
    const rgb = hexToRgbTriplet(effectiveColor);
    if (!rgb) return;
    const fg = contrastingForegroundTriplet(effectiveColor);
    document.documentElement.style.setProperty("--brand-rgb", rgb);
    document.documentElement.style.setProperty("--brand-foreground-rgb", fg);
  }, [effectiveColor]);

  const setBrandColor = useCallback((hex: string | null) => {
    if (hex === null) {
      window.localStorage.removeItem(BRAND_OVERRIDE_KEY);
      setBrandOverride(null);
      return;
    }
    window.localStorage.setItem(BRAND_OVERRIDE_KEY, hex);
    setBrandOverride(hex);
  }, []);

  const value = useMemo<OrganizationContextValue>(
    () => ({ organization, brandColor: effectiveColor, setBrandColor }),
    [organization, effectiveColor, setBrandColor],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used inside <OrganizationProvider>");
  return ctx.organization;
}

export function useBrandColor() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useBrandColor must be used inside <OrganizationProvider>");
  return { brandColor: ctx.brandColor, setBrandColor: ctx.setBrandColor };
}
