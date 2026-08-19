import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { assertParentOfStudent } from "@/modules/users/service";
import { childStats } from "@/modules/analytics/service";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  ProgressBar,
  StatCard,
  Table,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import {
  AttendanceDonut,
  ScoreTrendChart,
  SubjectBarChart,
} from "@/components/charts/charts";
import { formatDate, gradeName, percent } from "@/lib/utils";

export default async function ChildReportPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const session = await requireRole("PARENT");
  const { profileId } = await params;

  // A parent can only ever open their own children's reports.
  const allowed = await assertParentOfStudent(session.sub, profileId)
    .then(() => true)
    .catch(() => false);
  if (!allowed) notFound();

  const stats = await childStats(profileId);
  if (!stats) notFound();

  const { student, overview, scoreTrend, subjectAverages, courseProgress, recentAttempts, attendance } = stats;

  return (
    <div className="space-y-6">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        ← All children
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={student.name} color={student.avatarColor} size={52} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{student.name}</h1>
          <p className="text-sm text-muted">
            {gradeName(student.gradeLevel)}
            {student.section ? ` · Section ${student.section}` : ""} ·{" "}
            {student.admissionNo}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average score"
          value={overview.averageScorePct !== null ? `${overview.averageScorePct}%` : "—"}
          hint={`${overview.gradedAttempts} graded activities`}
          icon={<Icon name="bar-chart" />}
        />
        <StatCard
          label="Lessons completed"
          value={`${overview.lessonsCompleted}/${overview.lessonsTotal}`}
          hint={`across ${overview.coursesEnrolled} courses`}
          icon={<Icon name="check" />}
        />
        <StatCard
          label="Attendance"
          value={overview.attendancePct !== null ? `${overview.attendancePct}%` : "—"}
          hint={`${attendance.present} present · ${attendance.late} late · ${attendance.absent} absent`}
          icon={<Icon name="video" />}
        />
        <StatCard
          label="Learning time"
          value={`${Math.round(overview.timeSpentMinutes / 60)}h ${overview.timeSpentMinutes % 60}m`}
          hint={`${overview.pendingActivities} activities pending`}
          icon={<Icon name="clock" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Score trend"
            subtitle="Every graded activity, in order of submission"
          />
          <div className="p-4">
            {scoreTrend.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted">No graded activities yet.</p>
            ) : (
              <ScoreTrendChart data={scoreTrend} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Live class attendance" />
          <div className="p-4">
            <AttendanceDonut
              present={attendance.present}
              late={attendance.late}
              absent={attendance.absent}
            />
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted">
              <span>■ Present {attendance.present}</span>
              <span>■ Late {attendance.late}</span>
              <span>■ Absent {attendance.absent}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Performance by subject" subtitle="Average of graded activities" />
          <div className="p-4">
            {subjectAverages.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted">No data yet.</p>
            ) : (
              <SubjectBarChart data={subjectAverages} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Course progress" />
          <div className="space-y-4 p-5">
            {courseProgress.map((c) => (
              <div key={c.courseId}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-muted">
                    {c.completedLessons}/{c.totalLessons} lessons
                  </span>
                </div>
                <ProgressBar value={percent(c.completedLessons, c.totalLessons)} />
              </div>
            ))}
            {courseProgress.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted">No enrollments yet.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent activity results" />
        {recentAttempts.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">No submissions yet.</p>
        ) : (
          <Table head={["Activity", "Subject", "Type", "Submitted", "Result", "Feedback"]}>
            {recentAttempts.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-3 font-medium">{a.activity}</td>
                <td className="px-5 py-3 text-muted">{a.subject}</td>
                <td className="px-5 py-3 text-muted">{a.type}</td>
                <td className="px-5 py-3 text-muted">
                  {a.submittedAt ? formatDate(a.submittedAt) : "—"}
                </td>
                <td className="px-5 py-3">
                  {a.scorePct !== null ? (
                    <Badge tone={a.scorePct >= 50 ? "success" : "danger"}>{a.scorePct}%</Badge>
                  ) : (
                    <Badge tone="warning">Awaiting grading</Badge>
                  )}
                </td>
                <td className="max-w-56 truncate px-5 py-3 text-muted">
                  {a.feedback ?? "—"}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
