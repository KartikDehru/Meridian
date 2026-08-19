import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { announcementsFor } from "@/modules/communications/service";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };

export default async function ParentAnnouncementsPage() {
  await requireRole("PARENT");
  const announcements = await announcementsFor({ role: "PARENT", limit: 50 });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Announcements" subtitle="News from the school." />
      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">
                  {a.isPinned ? "📌 " : ""}
                  {a.title}
                </h2>
                <span className="whitespace-nowrap text-xs text-muted">
                  {formatDate(a.publishedAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                {a.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
