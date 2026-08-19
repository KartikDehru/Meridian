"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";
import { GRADE_LEVELS, gradeName } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";
const btnGhost =
  "rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50";

export function ClassActions({
  liveClassId,
  status,
  startUrl,
}: {
  liveClassId: string;
  status: string;
  startUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    try {
      await api(`/api/v1/live-classes/${liveClassId}/status`, {
        method: "POST",
        body: { status: next },
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "CANCELLED" || status === "ENDED") {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <div className="flex justify-end gap-1.5">
      {startUrl ? (
        <a
          href={startUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={btnGhost}
        >
          Host
        </a>
      ) : null}
      {status === "SCHEDULED" ? (
        <button type="button" disabled={busy} onClick={() => setStatus("LIVE")} className={btnGhost}>
          Go live
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => setStatus("ENDED")} className={btnGhost}>
          End
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => setStatus("CANCELLED")}
        className={btnGhost}
      >
        Cancel
      </button>
    </div>
  );
}

export function ScheduleClassButton({
  zoomEnabled,
  courses,
}: {
  zoomEnabled: boolean;
  courses: Array<{ id: string; title: string; gradeLevel: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(40);
  const [manualJoinUrl, setManualJoinUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/live-classes", {
        method: "POST",
        body: {
          title,
          description,
          gradeLevel,
          courseId: courseId || null,
          startTime: new Date(startTime).toISOString(),
          durationMinutes: duration,
          manualJoinUrl: !zoomEnabled && manualJoinUrl ? manualJoinUrl : undefined,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule the class.");
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
        <Icon name="plus" size={14} /> Schedule class
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Schedule a live class</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <Icon name="x" size={16} />
              </button>
            </div>
            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}
            <label className="block">
              <span className={labelCls}>Title</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Fractions revision" />
            </label>
            <label className="block">
              <span className={labelCls}>Description (optional)</span>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
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
              <label>
                <span className={labelCls}>Course (optional)</span>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
                  <option value="">General</option>
                  {courses
                    .filter((c) => c.gradeLevel === gradeLevel)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelCls}>Start time</span>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className={labelCls}>Duration (min)</span>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={inputCls}
                />
              </label>
            </div>
            {!zoomEnabled ? (
              <label className="block">
                <span className={labelCls}>Meeting link (Zoom/Meet — manual mode)</span>
                <input
                  type="url"
                  value={manualJoinUrl}
                  onChange={(e) => setManualJoinUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://zoom.us/j/…"
                />
              </label>
            ) : (
              <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
                A Zoom meeting will be created automatically and students of the
                selected grade will be notified.
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "Scheduling…" : "Schedule"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
