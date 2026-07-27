import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { pendingGrading } from "@/modules/activities/service";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Grading" };

export default async function GradingQueuePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const pending = await pendingGrading();

  return (
    <div>
      <PageHeader
        title="Grading queue"
        subtitle="Assignments and projects that need a manual review."
      />
      {pending.length === 0 ? (
        <EmptyState
          title="All caught up 🎉"
          hint="Objective quizzes grade themselves; anything needing human review lands here."
        />
      ) : (
        <Card>
          <Table head={["Student", "Activity", "Course", "Submitted", ""]}>
            {pending.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-3 text-sm font-medium">
                  {a.student.user.firstName} {a.student.user.lastName}
                </td>
                <td className="px-5 py-3 text-sm">
                  {a.activity.title}{" "}
                  <Badge tone="info">{a.activity.type}</Badge>
                </td>
                <td className="px-5 py-3 text-xs text-muted">{a.activity.course.title}</td>
                <td className="px-5 py-3 text-xs text-muted">
                  {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/grading/${a.id}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover"
                  >
                    Grade
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
