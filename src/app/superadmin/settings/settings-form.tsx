"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function SettingsForm({
  defs,
  values,
}: {
  defs: Array<{ key: string; label: string; description: string }>;
  values: Record<string, string>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(values);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/v1/settings", { method: "PATCH", body: form });
      setMessage("Settings saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      {message ? (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">{message}</p>
      ) : null}
      {defs.map((d) => (
        <label key={d.key} className="block">
          <span className="mb-1 block text-xs font-medium">{d.label}</span>
          <input
            value={form[d.key] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [d.key]: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <span className="mt-1 block text-[11px] text-muted">{d.description}</span>
        </label>
      ))}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
