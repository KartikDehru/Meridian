import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV: NavItem[] = [
  { href: "/superadmin", label: "Overview", icon: "home" },
  { href: "/superadmin/admins", label: "Admins", icon: "shield" },
  { href: "/superadmin/modules", label: "Modules", icon: "list" },
  { href: "/superadmin/settings", label: "Settings", icon: "settings" },
  { href: "/superadmin/audit", label: "Audit Log", icon: "file-text" },
  { href: "/admin", label: "Admin Portal →", icon: "link" },
];

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("SUPER_ADMIN");
  return (
    <AppShell session={session} nav={NAV} homeHref="/superadmin">
      {children}
    </AppShell>
  );
}
