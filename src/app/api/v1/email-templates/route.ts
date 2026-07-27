import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { listTemplates } from "@/modules/communications/service";

export const GET = handler(async () => {
  await requirePermission("email.manage");
  return ok(await listTemplates());
});
