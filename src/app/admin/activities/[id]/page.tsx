import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { activityWithQuestions } from "@/modules/activities/service";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { Badge, Card, CardHeader, Table } from "@/components/ui/primitives";
import { QuestionEditor } from "./question-editor";

export default async function AdminActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;
  const activity = await activityWithQuestions(id).catch(() => null);
  if (!activity) notFound();

  const attempts = await db.activityAttempt.findMany({
    where: { activityId: id, status: { not: "IN_PROGRESS" } },
    include: { student: { include: { user: true } } },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/courses/${activity.courseId}`}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          ← {activity.course.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{activity.title}</h1>
          <Badge tone={activity.isPublished ? "success" : "warning"}>
            {activity.isPublished ? "Published" : "Draft"}
          </Badge>
          <Badge tone="info">{activity.type}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {activity.maxScore} points · pass at {activity.passScore}
          {activity.lesson ? ` · attached to "${activity.lesson.title}"` : ""}
        </p>
      </div>

      <QuestionEditor
        activityId={activity.id}
        questions={activity.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          options: parseJson<string[]>(q.options, []),
          correctAnswer: q.correctAnswer,
          points: q.points,
        }))}
      />

      <Card>
        <CardHeader title="Submissions" subtitle={`${attempts.length} shown`} />
        {attempts.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted">No submissions yet.</p>
        ) : (
          <Table head={["Student", "Status", "Score", "Submitted", ""]}>
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-3 text-sm font-medium">
                  {a.student.user.firstName} {a.student.user.lastName}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={a.status === "GRADED" ? "success" : "warning"}>{a.status}</Badge>
                </td>
                <td className="px-5 py-3 text-sm">
                  {a.score !== null ? `${a.score}/${a.maxScore}` : "—"}
                </td>
                <td className="px-5 py-3 text-xs text-muted">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/grading/${a.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
