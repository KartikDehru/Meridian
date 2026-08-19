import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { listLiveClasses } from "@/modules/live-classes/service";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { JoinClassButton } from "./join-button";

export const metadata: Metadata = { title: "Live Classes" };

export default async function StudentLiveClassesPage() {
  const session = await requireRole("STUDENT");
  const profile = await db.studentProfile.findUnique({
    where: { userId: session.sub },
  });
  const classes = profile
    ? await listLiveClasses({ gradeLevel: profile.gradeLevel })
    : [];

  // Server component rendered per request; "now" is the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Live Classes"
        subtitle="Join on time — attendance is recorded automatically."
      />
      {classes.length === 0 ? (
        <EmptyState title="No live classes scheduled for your grade yet." />
      ) : (
        <div className="space-y-3">
          {classes.map((c) => {
            const start = new Date(c.startTime).getTime();
            const end = start + c.durationMinutes * 60_000;
            const joinable =
              c.status !== "CANCELLED" &&
              c.status !== "ENDED" &&
              now >= start - 10 * 60_000 &&
              now <= end;
            const past = now > end || c.status === "ENDED";
            return (
              <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{c.title}</p>
                    {c.status === "CANCELLED" ? (
                      <Badge tone="danger">Cancelled</Badge>
                    ) : c.status === "LIVE" ? (
                      <Badge tone="success">Live now</Badge>
                    ) : past ? (
                      <Badge>Ended</Badge>
                    ) : (
                      <Badge tone="info">Scheduled</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(c.startTime)} · {c.durationMinutes} min
                    {c.course ? ` · ${c.course.title}` : ""} · hosted by{" "}
                    {c.host.firstName} {c.host.lastName}
                  </p>
                  {c.description ? (
                    <p className="mt-1.5 line-clamp-1 text-xs text-muted">{c.description}</p>
                  ) : null}
                </div>
                <JoinClassButton
                  liveClassId={c.id}
                  joinable={joinable}
                  hasLink={Boolean(c.joinUrl)}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
