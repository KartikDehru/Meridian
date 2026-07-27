"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function GradeForm({
  attemptId,
  maxScore,
  currentScore,
  currentFeedback,
}: {
  attemptId: string;
  maxScore: number;
  currentScore: number | null;
  currentFeedback: string | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState(currentScore ?? 0);
  const [feedback, setFeedback] = useState(currentFeedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/attempts/${attemptId}/grade`, {
        method: "POST",
        body: { score, feedback },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the grade.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
    >
      <h2 className="text-sm font-semibold">Grade this submission</h2>
      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
          Grade saved — the student and parents were notified.
        </p>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Score (out of {maxScore})
        </span>
        <input
          type="number"
          min={0}
          max={maxScore}
          step="0.5"
          required
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Feedback</span>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What went well, what to improve…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save grade"}
      </button>
    </form>
  );
}
