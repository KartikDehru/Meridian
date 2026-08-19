import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { childrenOfParent } from "@/modules/users/service";
import { childStats } from "@/modules/analytics/service";
import { announcementsFor } from "@/modules/communications/service";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { gradeName, percent } from "@/lib/utils";

export default async function ParentDashboard() {
  const session = await requireRole("PARENT");
  const links = await childrenOfParent(session.sub);
  const stats = await Promise.all(
    links.map((l) => childStats(l.student.id)),
  );
  const announcements = await announcementsFor({ role: "PARENT", limit: 4 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {links.length === 1
            ? "Following 1 child"
            : `Following ${links.length} children`}{" "}
          — tap a card for the full report.
        </p>
      </div>

      {links.length === 0 ? (
        <EmptyState
          title="No children linked to your account"
          hint="Ask the school admin to link your children to your parent account."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link, i) => {
            const s = stats[i];
            if (!s) return null;
            return (
              <Link key={link.id} href={`/parent/children/${link.student.id}`}>
                <Card className="h-full p-5 transition hover:border-primary">
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={s.student.name}
                      color={s.student.avatarColor}
                      size={46}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.student.name}</p>
                      <p className="text-xs text-muted">
                        {gradeName(s.student.gradeLevel)}
                        {s.student.section ? ` · ${s.student.section}` : ""} ·{" "}
                        {link.relationship}
                      </p>
                    </div>
                    <Icon name="chevron-right" size={16} className="text-muted" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-primary-soft px-2 py-3">
                      <p className="text-lg font-semibold">
                        {s.overview.averageScorePct !== null
                          ? `${s.overview.averageScorePct}%`
                          : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Avg score
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary-soft px-2 py-3">
                      <p className="text-lg font-semibold">
                        {s.overview.attendancePct !== null
                          ? `${s.overview.attendancePct}%`
                          : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Attendance
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary-soft px-2 py-3">
                      <p className="text-lg font-semibold">{s.overview.pendingActivities}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Pending
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                      <span>Lesson progress</span>
                      <span>
                        {s.overview.lessonsCompleted}/{s.overview.lessonsTotal}
                      </span>
                    </div>
                    <ProgressBar
                      value={percent(s.overview.lessonsCompleted, s.overview.lessonsTotal)}
                    />
                  </div>

                  {s.recentAttempts[0] ? (
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <p className="truncate text-xs text-muted">
                        Latest: {s.recentAttempts[0].activity}
                      </p>
                      {s.recentAttempts[0].scorePct !== null ? (
                        <Badge
                          tone={s.recentAttempts[0].scorePct >= 50 ? "success" : "danger"}
                        >
                          {s.recentAttempts[0].scorePct}%
                        </Badge>
                      ) : (
                        <Badge tone="warning">Ungraded</Badge>
                      )}
                    </div>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {announcements.length > 0 ? (
        <Card>
          <CardHeader
            title="School announcements"
            action={
              <Link href="/parent/announcements" className="text-xs font-medium text-primary">
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
