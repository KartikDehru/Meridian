import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { attemptDetail } from "@/modules/activities/service";
import { parseJson } from "@/lib/utils";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { GradeForm } from "./grade-form";

export default async function GradeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { attemptId } = await params;
  const attempt = await attemptDetail(attemptId).catch(() => null);
  if (!attempt) notFound();

  const questions = attempt.activity.questions;
  const answers = attempt.parsedAnswers;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/grading"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          ← Grading queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{attempt.activity.title}</h1>
          <Badge tone={attempt.status === "GRADED" ? "success" : "warning"}>
            {attempt.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {attempt.student.user.firstName} {attempt.student.user.lastName} ·{" "}
          {attempt.activity.course.title} · max {attempt.maxScore} points
        </p>
      </div>

      <Card>
        <CardHeader title="Submission" />
        <div className="divide-y divide-border">
          {questions.length > 0 ? (
            questions.map((q, i) => {
              const given = answers[q.id] ?? "";
              const correct =
                q.type === "SHORT_ANSWER"
                  ? given.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                  : given === q.correctAnswer;
              return (
                <div key={q.id} className="px-5 py-4">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.prompt}{" "}
                    <span className="text-xs font-normal text-muted">({q.points} pts)</span>
                  </p>
                  {q.type !== "SHORT_ANSWER" ? (
                    <p className="mt-1 text-xs text-muted">
                      Options: {parseJson<string[]>(q.options, []).join(" / ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span
                      className={`rounded-lg px-3 py-1.5 ${
                        correct ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger"
                      }`}
                    >
                      Student: {given || "(no answer)"}
                    </span>
                    <span className="text-xs text-muted">Expected: {q.correctAnswer}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Free-form response
              </p>
              <p className="whitespace-pre-line rounded-lg bg-surface-hover p-4 text-sm leading-relaxed">
                {answers.response ?? "(empty submission)"}
              </p>
            </div>
          )}
        </div>
      </Card>

      <GradeForm
        attemptId={attempt.id}
        maxScore={attempt.maxScore}
        currentScore={attempt.score}
        currentFeedback={attempt.feedback}
      />
    </div>
  );
}
