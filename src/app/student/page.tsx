import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { coursesForStudent } from "@/modules/enrollment/service";
import { listLiveClasses } from "@/modules/live-classes/service";
import { announcementsFor } from "@/modules/communications/service";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  StatCard,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { formatDateTime, gradeName, percent } from "@/lib/utils";

export default async function StudentDashboard() {
  const session = await requireRole("STUDENT");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.sub },
    include: { user: true },
  });
  if (!profile) return <EmptyState title="No student profile found." />;

  const [courses, liveClasses, announcements, attempts] = await Promise.all([
    coursesForStudent(session.sub),
    listLiveClasses({ gradeLevel: profile.gradeLevel, upcomingOnly: true }),
    announcementsFor({ role: "STUDENT", gradeLevel: profile.gradeLevel, limit: 4 }),
    db.activityAttempt.findMany({
      where: { studentId: profile.id, status: { not: "IN_PROGRESS" } },
      include: { activity: true },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const doneLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const graded = attempts.filter((a) => a.status === "GRADED" && a.score !== null);
  const avg =
    graded.length > 0
      ? Math.round(
          graded.reduce((s, a) => s + ((a.score ?? 0) / a.maxScore) * 100, 0) /
            graded.length,
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Hi {profile.user.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted">
          {gradeName(profile.gradeLevel)}
          {profile.section ? ` · Section ${profile.section}` : ""} · Admission{" "}
          {profile.admissionNo}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Courses"
          value={courses.length}
          icon={<Icon name="book-open" />}
        />
        <StatCard
          label="Lessons done"
          value={`${doneLessons}/${totalLessons}`}
          hint={`${percent(doneLessons, totalLessons)}% complete`}
          icon={<Icon name="check" />}
        />
        <StatCard
          label="Average score"
          value={avg !== null ? `${avg}%` : "—"}
          hint={`${graded.length} graded activities`}
          icon={<Icon name="bar-chart" />}
        />
        <StatCard
          label="Upcoming classes"
          value={liveClasses.length}
          icon={<Icon name="video" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Continue learning"
            action={
              <Link href="/student/courses" className="text-xs font-medium text-primary">
                All courses →
              </Link>
            }
          />
          <div className="divide-y divide-border">
            {courses.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No courses yet"
                  hint="Your school admin will enroll you into courses for your grade."
                />
              </div>
            ) : (
              courses.slice(0, 4).map(({ course, totalLessons, completedLessons }) => (
                <Link
                  key={course.id}
                  href={`/student/courses/${course.slug}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-hover"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: course.coverColor }}
                  >
                    <Icon name="book" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted">{course.subject.name}</p>
                    <ProgressBar
                      value={percent(completedLessons, totalLessons)}
                      className="mt-2"
                    />
                  </div>
                  <span className="text-xs text-muted">
                    {percent(completedLessons, totalLessons)}%
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Next live classes" />
            <div className="divide-y divide-border">
              {liveClasses.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-muted">
                  No classes scheduled.
                </p>
              ) : (
                liveClasses.slice(0, 3).map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(c.startTime)} · {c.durationMinutes} min
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent results" />
            <div className="divide-y divide-border">
              {attempts.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-muted">
                  No submissions yet.
                </p>
              ) : (
                attempts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.activity.title}</p>
                      <p className="text-xs text-muted">{a.activity.type}</p>
                    </div>
                    {a.status === "GRADED" && a.score !== null ? (
                      <Badge tone={a.score >= a.activity.passScore ? "success" : "danger"}>
                        {Math.round((a.score / a.maxScore) * 100)}%
                      </Badge>
                    ) : (
                      <Badge tone="warning">Pending</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {announcements.length > 0 ? (
        <Card>
          <CardHeader
            title="Announcements"
            action={
              <Link href="/student/announcements" className="text-xs font-medium text-primary">
                View all →
              </Link>
            }
          />
          <div className="divide-y divide-border">
            {announcements.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <p className="text-sm font-medium">
                  {a.isPinned ? "📌 " : ""}
                  {a.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.body}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
