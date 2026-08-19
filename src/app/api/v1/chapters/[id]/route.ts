import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { deleteChapter } from "@/modules/curriculum/service";

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteChapter(id, session.sub);
  return ok({ deleted: true });
});
