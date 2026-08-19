import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { chapterSchema, createChapter } from "@/modules/curriculum/service";

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, chapterSchema);
  const chapter = await createChapter(id, body, session.sub);
  return ok(chapter, { status: 201 });
});
