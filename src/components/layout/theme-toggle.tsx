"use client";

import { Icon } from "@/components/ui/icons";

/**
 * Switches between the "meadow" (green & white) and "mono" (black & white)
 * themes. Persisted in a cookie so SSR picks the right theme (no flash).
 * The visible icon is driven purely by CSS ([data-theme]) so the component
 * needs no state and cannot cause hydration mismatches.
 */
export function ThemeToggle() {
  function toggle() {
    const next =
      document.documentElement.getAttribute("data-theme") === "mono"
        ? "meadow"
        : "mono";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `meridian_theme=${next};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle green/white ↔ black/white theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-hover hover:text-foreground"
    >
      <span className="theme-icon-meadow">
        <Icon name="moon" />
      </span>
      <span className="theme-icon-mono">
        <Icon name="sun" />
      </span>
    </button>
  );
}
