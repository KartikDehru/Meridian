import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { deleteAnnouncement } from "@/modules/communications/service";

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("announcements.manage");
  const { id } = await params;
  await deleteAnnouncement(id, session.sub);
  return ok({ deleted: true });
});
