"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";

export function CreateAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/users", {
        method: "POST",
        body: { kind: "admin", firstName, lastName, email, password },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the admin.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        <Icon name="plus" size={14} /> New admin
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Create an admin account</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <Icon name="x" size={16} />
              </button>
            </div>
            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>First name</span>
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Last name</span>
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Temporary password (min 8, letters + numbers)</span>
              <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create admin"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
