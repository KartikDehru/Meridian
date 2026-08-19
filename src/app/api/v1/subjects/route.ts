import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { listSubjects } from "@/modules/curriculum/service";

export const GET = handler(async () => {
  await requirePermission("curriculum.read");
  return ok(await listSubjects());
});
