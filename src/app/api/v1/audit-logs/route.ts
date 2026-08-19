import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { listAuditLogs } from "@/modules/platform/service";

export const GET = handler(async (req) => {
  await requirePermission("audit.read");
  const url = new URL(req.url);
  return ok(
    await listAuditLogs({
      action: url.searchParams.get("action") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 100),
    }),
  );
});
