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
 * the org's color. Replace the demo default with the real org fetch when
 * wiring this up to live auth.
 *
 * Also supports a user-level brand override (persisted to localStorage),
 * applied via `setBrandColor()` from the BrandCustomizer in the sidebar.
 */
export function OrganizationProvider({
  children,
  organization = DEMO_ORG,
}: {
  children: ReactNode;
  organization?: Organization;
}) {
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
