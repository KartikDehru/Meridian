"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "ava.thompson@student.meridian.school" },
  { label: "Parent", email: "sarah.thompson@meridian.school" },
  { label: "Admin", email: "admin@meridian.school" },
  { label: "Super Admin", email: "root@meridian.school" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "forbidden"
      ? "You don't have access to that portal. Sign in with the right account."
      : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ redirectTo: string }>("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
      router.push(params.get("next") ?? result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
      >
        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="you@meridian.school"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="••••••••"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-5 rounded-xl border border-dashed border-border p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Demo accounts (password: Passw0rd!)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("Passw0rd!");
              }}
              className="rounded-lg border border-border px-2 py-1.5 text-left text-[11px] text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <span className="block font-medium text-foreground">{a.label}</span>
              <span className="block truncate">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
