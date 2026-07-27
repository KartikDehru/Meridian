import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  courseSchema,
  courseTree,
  deleteCourse,
  updateCourse,
} from "@/modules/curriculum/service";

export const GET = handler(async (_req, { params }) => {
  await requirePermission("curriculum.read");
  const { id } = await params;
  return ok(await courseTree(id));
});

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, courseSchema.partial());
  return ok(await updateCourse(id, body, session.sub));
});

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteCourse(id, session.sub);
  return ok({ deleted: true });
});
