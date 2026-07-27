import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { activitySchema, createActivity } from "@/modules/activities/service";

export const POST = handler(async (req) => {
  const session = await requirePermission("curriculum.manage");
  const body = await parseBody(req, activitySchema);
  const activity = await createActivity(body, session.sub);
  return ok(activity, { status: 201 });
});
