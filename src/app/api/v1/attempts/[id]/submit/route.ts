import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { submitAttempt, submitAttemptSchema } from "@/modules/activities/service";

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("activities.attempt");
  const { id } = await params;
  const body = await parseBody(req, submitAttemptSchema);
  const attempt = await submitAttempt(id, body.answers, session.sub);
  return ok(attempt);
});
