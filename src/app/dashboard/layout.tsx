import { MainSidebar } from "@/components/sidebar/main-sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <MainSidebar />
      <div className="relative isolate flex h-full min-w-0 flex-1">
        {/* Directional "aurora" wash — a conic sweep anchored just outside
            the top-right corner, so only the soft inner falloff bleeds into
            view. Lives on the layout so every dashboard page inherits it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "conic-gradient(from 100deg at 105% -5%, transparent 0deg, rgb(var(--brand-rgb) / var(--aurora-alpha)) 55deg, transparent 130deg)",
          }}
        />
        {children}
      </div>
    </div>
  );
}
