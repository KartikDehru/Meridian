import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { activityWithQuestions } from "@/modules/activities/service";
import { parseJson } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/primitives";
import { ActivityRunner } from "./runner";

export default async function StudentActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("STUDENT");
  const { id } = await params;

  const activity = await activityWithQuestions(id).catch(() => null);
  if (!activity || !activity.isPublished) notFound();

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.sub },
  });
  if (!profile) notFound();
  const enrollment = await db.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId: profile.id, courseId: activity.courseId },
    },
  });
  if (!enrollment) notFound();

  const lastAttempt = await db.activityAttempt.findFirst({
    where: { activityId: id, studentId: profile.id },
    orderBy: { startedAt: "desc" },
  });

  // Finished attempt — show the result summary.
  if (lastAttempt && lastAttempt.status !== "IN_PROGRESS") {
    const pct =
      lastAttempt.score !== null
        ? Math.round((lastAttempt.score / lastAttempt.maxScore) * 100)
        : null;
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/student/courses/${activity.course.slug}`}
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          ← {activity.course.title}
        </Link>
        <Card className="p-8 text-center">
          <Badge tone={lastAttempt.status === "GRADED" ? "success" : "warning"}>
            {lastAttempt.status === "GRADED" ? "Graded" : "Awaiting review"}
          </Badge>
          <h1 className="mt-3 text-lg font-semibold">{activity.title}</h1>
          {lastAttempt.status === "GRADED" && lastAttempt.score !== null ? (
            <>
              <p className="mt-6 text-5xl font-semibold tracking-tight">
                {pct}
                <span className="text-2xl text-muted">%</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {lastAttempt.score} / {lastAttempt.maxScore} points ·{" "}
                {lastAttempt.score >= activity.passScore ? "Passed 🎉" : "Below pass mark"}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Your submission is with your teacher for grading. You&apos;ll get a
              notification when it&apos;s done.
            </p>
          )}
          {lastAttempt.feedback ? (
            <p className="mx-auto mt-5 max-w-md rounded-lg bg-primary-soft px-4 py-3 text-left text-sm">
              <span className="font-medium">Teacher feedback: </span>
              {lastAttempt.feedback}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  // Strip answer keys before handing questions to the client.
  const questions = activity.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    options: parseJson<string[]>(q.options, []),
    points: q.points,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/student/courses/${activity.course.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        ← {activity.course.title}
      </Link>
      <ActivityRunner
        activity={{
          id: activity.id,
          title: activity.title,
          type: activity.type,
          instructions: activity.instructions,
          maxScore: activity.maxScore,
          timeLimitMinutes: activity.timeLimitMinutes,
        }}
        questions={questions}
        existingAttemptId={lastAttempt?.id ?? null}
      />
    </div>
  );
}
