import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "home" },
  { href: "/student/courses", label: "My Courses", icon: "book-open" },
  { href: "/student/live-classes", label: "Live Classes", icon: "video" },
  { href: "/student/announcements", label: "Announcements", icon: "megaphone" },
];

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("STUDENT");
  return (
    <AppShell session={session} nav={NAV} homeHref="/student">
      {children}
    </AppShell>
  );
}
