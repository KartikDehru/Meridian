import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { formatDate, gradeName } from "@/lib/utils";
import { AnnouncementComposer, DeleteAnnouncementButton } from "./announcement-actions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const announcements = await db.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast to everyone, a role, or a single grade."
        action={<AnnouncementComposer />}
      />
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card className="p-10 text-center text-xs text-muted">
            No announcements yet.
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    {a.isPinned ? "📌 " : ""}
                    {a.title}
                  </h2>
                  <Badge tone="info">
                    {a.audience === "GRADE"
                      ? gradeName(a.gradeLevel ?? 0)
                      : a.audience.toLowerCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {formatDate(a.publishedAt)} · {a.createdBy.firstName}{" "}
                    {a.createdBy.lastName}
                  </span>
                  <DeleteAnnouncementButton id={a.id} />
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{a.body}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
