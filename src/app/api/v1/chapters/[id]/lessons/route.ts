import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { createLesson, lessonSchema } from "@/modules/curriculum/service";

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, lessonSchema);
  const lesson = await createLesson(id, body, session.sub);
  return ok(lesson, { status: 201 });
});
