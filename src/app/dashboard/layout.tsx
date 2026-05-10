import { MainSidebar } from "@/components/sidebar/main-sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <MainSidebar />
      <div className="flex h-full min-w-0 flex-1">{children}</div>
    </div>
  );
}
