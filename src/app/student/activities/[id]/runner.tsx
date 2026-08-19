"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

interface RunnerQuestion {
  id: string;
  prompt: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  points: number;
}

interface RunnerActivity {
  id: string;
  title: string;
  type: string;
  instructions: string;
  maxScore: number;
  timeLimitMinutes: number | null;
}

/**
 * Client-side activity runner: starts an attempt, collects answers,
 * enforces the optional time limit and submits for grading.
 */
export function ActivityRunner({
  activity,
  questions,
  existingAttemptId,
}: {
  activity: RunnerActivity;
  questions: RunnerQuestion[];
  existingAttemptId: string | null;
}) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(existingAttemptId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    existingAttemptId && activity.timeLimitMinutes !== null
      ? activity.timeLimitMinutes * 60
      : null,
  );

  const started = attemptId !== null;
  const hasQuestions = questions.length > 0;

  useEffect(() => {
    if (!started || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, secondsLeft]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const attempt = await api<{ id: string }>(
        `/api/v1/activities/${activity.id}/attempts`,
        { method: "POST" },
      );
      setAttemptId(attempt.id);
      if (activity.timeLimitMinutes !== null) {
        setSecondsLeft(activity.timeLimitMinutes * 60);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the activity.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!attemptId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = hasQuestions ? answers : { response: freeText };
      await api(`/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        body: { answers: payload },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-[var(--shadow)]">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name="clipboard-check" size={22} />
        </span>
        <h1 className="text-lg font-semibold">{activity.title}</h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted">{activity.type}</p>
        {activity.instructions ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">{activity.instructions}</p>
        ) : null}
        <div className="mt-4 flex justify-center gap-4 text-xs text-muted">
          <span>{questions.length} questions</span>
          <span>{activity.maxScore} points</span>
          {activity.timeLimitMinutes ? <span>{activity.timeLimitMinutes} min limit</span> : null}
        </div>
        {error ? <p className="mt-4 text-xs text-danger">{error}</p> : null}
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Starting…" : "Start now"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{activity.title}</h1>
        {secondsLeft !== null ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              secondsLeft < 60 ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
            }`}
          >
            <Icon name="clock" size={13} />
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      {hasQuestions ? (
        questions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
          >
            <p className="text-sm font-medium">
              <span className="mr-2 text-muted">{i + 1}.</span>
              {q.prompt}
              <span className="ml-2 text-xs font-normal text-muted">({q.points} pts)</span>
            </p>
            {q.type === "SHORT_ANSWER" ? (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Type your answer"
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            ) : (
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className="accent-[var(--primary)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
          <p className="mb-2 text-sm font-medium">Your submission</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={8}
            placeholder="Write or paste your work here…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
