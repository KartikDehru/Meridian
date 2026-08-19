import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { joinLiveClass } from "@/modules/live-classes/service";

export const POST = handler(async (_req, { params }) => {
  const session = await requirePermission("live-classes.read");
  const { id } = await params;
  const result = await joinLiveClass(id, session.sub);
  return ok(result);
});
