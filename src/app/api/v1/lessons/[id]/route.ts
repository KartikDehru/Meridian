import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  deleteLesson,
  lessonSchema,
  updateLesson,
} from "@/modules/curriculum/service";

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, lessonSchema.partial());
  return ok(await updateLesson(id, body, session.sub));
});

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteLesson(id, session.sub);
  return ok({ deleted: true });
});
