import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { recordLessonProgress } from "@/modules/enrollment/service";

const progressSchema = z.object({
  completed: z.boolean(),
  minutes: z.number().int().min(0).max(600).optional(),
});

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.read");
  const { id } = await params;
  const body = await parseBody(req, progressSchema);
  const progress = await recordLessonProgress(session.sub, id, body);
  return ok(progress);
});
