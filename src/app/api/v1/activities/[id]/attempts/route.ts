import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { startAttempt } from "@/modules/activities/service";

export const POST = handler(async (_req, { params }) => {
  const session = await requirePermission("activities.attempt");
  const { id } = await params;
  const attempt = await startAttempt(id, session.sub);
  return ok(attempt, { status: 201 });
});
