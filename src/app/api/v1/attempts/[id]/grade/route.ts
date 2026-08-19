import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { gradeAttempt, gradeSchema } from "@/modules/activities/service";

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("activities.grade");
  const { id } = await params;
  const body = await parseBody(req, gradeSchema);
  const attempt = await gradeAttempt(id, body, session.sub);
  return ok(attempt);
});
