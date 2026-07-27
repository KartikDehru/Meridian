import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { platformStats } from "@/modules/analytics/service";

export const GET = handler(async () => {
  await requirePermission("analytics.platform");
  return ok(await platformStats());
});
