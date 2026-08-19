import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { deleteQuestion } from "@/modules/activities/service";

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteQuestion(id, session.sub);
  return ok({ deleted: true });
});
