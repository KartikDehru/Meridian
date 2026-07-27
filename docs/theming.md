# Theming

Meridian ships two deliberately minimal themes:

| Theme | Name | Look |
| --- | --- | --- |
| `meadow` (default) | Green & white | White surfaces, near-black text, emerald (`#059669`) primary |
| `mono` | Black & white | Near-black surfaces, off-white text, monochrome accents |

## How it works

1. **Design tokens** are CSS custom properties defined in
   [`src/app/globals.css`](../src/app/globals.css) under `:root` (meadow) and
   `[data-theme="mono"]` (mono):
   `--background`, `--surface`, `--surface-hover`, `--foreground`, `--muted`,
   `--border`, `--primary`, `--primary-hover`, `--primary-foreground`,
   `--primary-soft`, `--danger`, `--warning`, `--info` (+ `-soft` variants),
   `--chart-1..3`, `--chart-grid`, `--ring`, `--shadow`.
2. Tailwind 4's `@theme inline` maps each token to a utility color, so
   components use semantic classes (`bg-surface`, `text-muted`,
   `border-border`, `bg-primary`) and automatically re-skin per theme.
3. The active theme is the `data-theme` attribute on `<html>`.
   - The **root layout** reads the `meridian_theme` cookie server-side, so SSR
     renders the correct theme with **no flash of the wrong theme**.
   - The **ThemeToggle** (`src/components/layout/theme-toggle.tsx`) flips the
     attribute and persists the cookie. It is stateless — the visible
     moon/sun icon is chosen purely by CSS (`.theme-icon-*` rules), which
     also makes hydration mismatch impossible.
4. Charts read the same variables (`var(--chart-1)` etc.), so recharts output
   matches both themes without extra code.

## Design principles

- **Minimalism**: one accent color per theme, generous whitespace, thin
  borders (`--border`), small uppercase labels for metadata, no gradients.
- **Semantic color only** — components never hard-code hex values (the only
  exceptions are user/course accent colors stored in the DB, which are chosen
  from a curated palette).
- **Accessibility**: `color-scheme` is set per theme for correct native form
  controls, focus states use a visible `--ring` outline, text/muted contrast
  is AA on both themes.

## Adding a theme

1. Add a new block in `globals.css`, e.g. `[data-theme="ocean"] { … }`,
   defining every token.
2. Extend the toggle (or build a small theme menu) to set
   `data-theme="ocean"` and persist the cookie.
3. Done — every component and chart picks it up automatically.
