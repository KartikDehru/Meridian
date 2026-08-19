"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";
import { GRADE_LEVELS, gradeName } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/v1/announcements/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-hover hover:text-danger disabled:opacity-50"
    >
      Delete
    </button>
  );
}

export function AnnouncementComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [isPinned, setIsPinned] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/announcements", {
        method: "POST",
        body: {
          title,
          body,
          audience,
          gradeLevel: audience === "GRADE" ? gradeLevel : null,
          isPinned,
        },
      });
      setOpen(false);
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
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
        <Icon name="plus" size={14} /> New announcement
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Publish an announcement</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <Icon name="x" size={16} />
              </button>
            </div>
            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}
            <label className="block">
              <span className={labelCls}>Title</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Message</span>
              <textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>Audience</span>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls}>
                  <option value="ALL">Everyone</option>
                  <option value="STUDENTS">Students</option>
                  <option value="PARENTS">Parents</option>
                  <option value="ADMINS">Admins</option>
                  <option value="GRADE">One grade</option>
                </select>
              </label>
              {audience === "GRADE" ? (
                <label>
                  <span className={labelCls}>Grade</span>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                    className={inputCls}
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {gradeName(g)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Pin to the top
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "Publishing…" : "Publish"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
