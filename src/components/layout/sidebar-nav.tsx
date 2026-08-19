"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href.split("/").length > 2 && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-primary-soft font-medium text-primary"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
