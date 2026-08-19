"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<NotificationItem[]>("/api/v1/notifications")
      .then(setItems)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((i) => !i.readAt).length;

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await api("/api/v1/notifications", { method: "POST" });
        setItems((prev) =>
          prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
        );
      } catch {
        // non-fatal
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-hover hover:text-foreground"
      >
        <Icon name="bell" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Notifications
          </p>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">
                Nothing here yet.
              </p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                  <p className="text-xs font-medium">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-xs text-muted">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
