"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";
import { GRADE_LEVELS, gradeName } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";

const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];

export function CreateCourseButton({
  subjects,
}: {
  subjects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [coverColor, setCoverColor] = useState(COLORS[0]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const course = await api<{ id: string }>("/api/v1/courses", {
        method: "POST",
        body: { title, description, subjectId, gradeLevel, coverColor },
      });
      setOpen(false);
      router.push(`/admin/courses/${course.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the course.");
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
        <Icon name="plus" size={14} /> New course
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Create a course</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <Icon name="x" size={16} />
              </button>
            </div>
            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}
            <label className="block">
              <span className={labelCls}>Title</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Mathematics — Grade 4" />
            </label>
            <label className="block">
              <span className={labelCls}>Description</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>Subject</span>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelCls}>Grade</span>
                <select value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))} className={inputCls}>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {gradeName(g)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <span className={labelCls}>Cover color</span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoverColor(c)}
                    className={`h-7 w-7 rounded-lg transition ${coverColor === c ? "ring-2 ring-offset-2 ring-[var(--primary)]" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create course"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
