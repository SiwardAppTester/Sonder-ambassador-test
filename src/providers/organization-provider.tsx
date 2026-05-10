"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
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
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

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
 */
export function OrganizationProvider({
  children,
  organization = DEMO_ORG,
}: {
  children: ReactNode;
  organization?: Organization;
}) {
  useEffect(() => {
    const rgb = hexToRgbTriplet(organization.themeColor);
    if (!rgb) return;
    const fg = contrastingForegroundTriplet(organization.themeColor);
    document.documentElement.style.setProperty("--brand-rgb", rgb);
    document.documentElement.style.setProperty("--brand-foreground-rgb", fg);
  }, [organization.themeColor]);

  const value = useMemo(() => ({ organization }), [organization]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used inside <OrganizationProvider>");
  return ctx.organization;
}
