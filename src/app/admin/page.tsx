import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { platformStats } from "@/modules/analytics/service";
import { pendingGrading } from "@/modules/activities/service";
import { listLiveClasses } from "@/modules/live-classes/service";
import { Card, CardHeader, StatCard } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { GradeDistributionChart } from "@/components/charts/charts";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboard() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const [stats, pending, upcoming] = await Promise.all([
    platformStats(),
    pendingGrading(),
    listLiveClasses({ upcomingOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">School overview</h1>
        <p className="mt-1 text-sm text-muted">The health of the platform at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students} icon={<Icon name="users" />} />
        <StatCard label="Parents" value={stats.parents} icon={<Icon name="user" />} />
        <StatCard
          label="Published courses"
          value={`${stats.publishedCourses}/${stats.courses}`}
          hint={`${stats.lessons} lessons · ${stats.activities} activities`}
          icon={<Icon name="book-open" />}
        />
        <StatCard
          label="Average score"
          value={stats.averageScorePct !== null ? `${stats.averageScorePct}%` : "—"}
          hint={`${stats.attemptsGraded} graded attempts`}
          icon={<Icon name="bar-chart" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Students per grade" />
          <div className="p-4">
            <GradeDistributionChart data={stats.studentsPerGrade} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Grading queue"
              action={
                <Link href="/admin/grading" className="text-xs font-medium text-primary">
                  Open →
                </Link>
              }
            />
            <div className="px-5 py-4">
              <p className="text-3xl font-semibold">{pending.length}</p>
              <p className="mt-1 text-xs text-muted">submissions waiting for review</p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Next live classes"
              action={
                <Link href="/admin/live-classes" className="text-xs font-medium text-primary">
                  Manage →
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {upcoming.length === 0 ? (
                <p className="px-5 py-5 text-center text-xs text-muted">Nothing scheduled.</p>
              ) : (
                upcoming.slice(0, 4).map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted">{formatDateTime(c.startTime)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
