"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60";
const btnGhost =
  "rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50";

interface EditorQuestion {
  id: string;
  prompt: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  correctAnswer: string;
  points: number;
}

export function QuestionEditor({
  activityId,
  questions,
}: {
  activityId: string;
  questions: EditorQuestion[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT_ANSWER">("MCQ");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [points, setPoints] = useState(10);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/activities/${activityId}/questions`, {
        method: "POST",
        body: {
          prompt,
          type,
          options: type === "MCQ" ? options.filter((o) => o.trim() !== "") : [],
          correctAnswer,
          points,
        },
      });
      setPrompt("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the question.");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id: string) {
    setBusy(true);
    try {
      await api(`/api/v1/questions/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">Questions ({questions.length})</h2>
      </div>

      <div className="divide-y divide-border">
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-0.5 text-xs text-muted">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{q.prompt}</p>
              <p className="mt-1 text-xs text-muted">
                {q.type} · {q.points} pts
                {q.type !== "SHORT_ANSWER" ? ` · options: ${q.options.join(" / ")}` : ""} ·
                answer: <span className="font-medium text-primary">{q.correctAnswer}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => removeQuestion(q.id)}
              className={btnGhost}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addQuestion} className="space-y-2 border-t border-dashed border-border px-5 py-4">
        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            required
            placeholder="Question prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`${inputCls} sm:col-span-3`}
          />
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as typeof type;
              setType(t);
              setCorrectAnswer(t === "TRUE_FALSE" ? "True" : "");
            }}
            className={inputCls}
          >
            <option value="MCQ">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer</option>
          </select>
        </div>

        {type === "MCQ" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt, i) => (
              <input
                key={i}
                placeholder={`Option ${i + 1}${i < 2 ? " (required)" : ""}`}
                value={opt}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                }
                className={inputCls}
              />
            ))}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {type === "MCQ" ? (
            <select
              required
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className={`${inputCls} sm:col-span-2`}
            >
              <option value="">Correct answer…</option>
              {options
                .filter((o) => o.trim() !== "")
                .map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
            </select>
          ) : type === "TRUE_FALSE" ? (
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className={`${inputCls} sm:col-span-2`}
            >
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          ) : (
            <input
              required
              placeholder="Expected answer (case-insensitive match)"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className={`${inputCls} sm:col-span-2`}
            />
          )}
          <label className="flex items-center gap-2 text-xs text-muted">
            Points
            <input
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        </div>

        <button type="submit" disabled={busy} className={btnPrimary}>
          <Icon name="plus" size={13} /> Add question
        </button>
      </form>
    </section>
  );
}
