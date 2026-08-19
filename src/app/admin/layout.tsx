import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/courses", label: "Courses", icon: "book-open" },
  { href: "/admin/grading", label: "Grading", icon: "clipboard-check" },
  { href: "/admin/live-classes", label: "Live Classes", icon: "video" },
  { href: "/admin/email", label: "Email", icon: "mail" },
  { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  return (
    <AppShell session={session} nav={NAV} homeHref="/admin">
      {children}
    </AppShell>
  );
}
