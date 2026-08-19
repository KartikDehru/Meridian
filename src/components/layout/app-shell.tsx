import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./user-menu";
import { NotificationsBell } from "./notifications";

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  PARENT: "Parent",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

/** Shared portal chrome: sidebar navigation + top bar. */
export function AppShell({
  session,
  nav,
  homeHref,
  children,
}: {
  session: SessionPayload;
  nav: NavItem[];
  homeHref: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface px-4 py-5 md:flex">
        <Link href={homeHref} className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="graduation-cap" size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight tracking-tight">
              Meridian
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-muted">
              {ROLE_LABEL[session.role]}
            </span>
          </span>
        </Link>
        <SidebarNav items={nav} />
        <div className="mt-auto flex items-center gap-3 border-t border-border px-2 pt-4">
          <Avatar
            name={session.name}
            color="var(--primary)"
            fg="var(--primary-foreground)"
            size={32}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{session.name}</p>
            <p className="truncate text-[11px] text-muted">{session.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Link href={homeHref} className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Icon name="graduation-cap" size={15} />
              </span>
              Meridian
            </Link>
          </div>
          <div className="hidden text-xs text-muted md:block">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        {/* Mobile nav */}
        <div className="border-b border-border bg-surface px-4 py-2 md:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
