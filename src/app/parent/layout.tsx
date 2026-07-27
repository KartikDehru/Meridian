import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV: NavItem[] = [
  { href: "/parent", label: "My Children", icon: "home" },
  { href: "/parent/announcements", label: "Announcements", icon: "megaphone" },
];

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("PARENT");
  return (
    <AppShell session={session} nav={NAV} homeHref="/parent">
      {children}
    </AppShell>
  );
}
