import { requireRole } from "@/lib/auth/guard";
import { platformStats } from "@/modules/analytics/service";
import { integrationStatus, listAuditLogs } from "@/modules/platform/service";
import { MODULES } from "@/modules/registry";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { GradeDistributionChart } from "@/components/charts/charts";

export default async function SuperAdminOverview() {
  await requireRole("SUPER_ADMIN");
  const [stats, recentAudit] = await Promise.all([
    platformStats(),
    listAuditLogs({ limit: 8 }),
  ]);
  const integrations = integrationStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-sm text-muted">
          Everything running across {MODULES.length} modules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.students + stats.parents + stats.admins}
          hint={`${stats.students} students · ${stats.parents} parents · ${stats.admins} staff`}
          icon={<Icon name="users" />}
        />
        <StatCard
          label="Content"
          value={stats.lessons}
          hint={`lessons across ${stats.courses} courses`}
          icon={<Icon name="book-open" />}
        />
        <StatCard
          label="Emails delivered"
          value={stats.emailsSent}
          icon={<Icon name="mail" />}
        />
        <StatCard
          label="Upcoming classes"
          value={stats.upcomingClasses}
          icon={<Icon name="video" />}
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
            <CardHeader title="Integrations" />
            <div className="divide-y divide-border">
              {[
                { name: "Database", ok: integrations.database, hint: "Prisma" },
                { name: "Zoom", ok: integrations.zoom, hint: "Live classes" },
                { name: "SMTP", ok: integrations.smtp, hint: "Outgoing email" },
              ].map((i) => (
                <div key={i.name} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{i.hint}</p>
                  </div>
                  <Badge tone={i.ok ? "success" : "warning"}>
                    {i.ok ? "Connected" : "Not configured"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Latest audit events" />
            <div className="divide-y divide-border">
              {recentAudit.map((log) => (
                <div key={log.id} className="px-5 py-2.5">
                  <p className="text-xs font-medium">{log.action}</p>
                  <p className="text-[11px] text-muted">
                    {log.actor
                      ? `${log.actor.firstName} ${log.actor.lastName}`
                      : "system"}{" "}
                    · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
