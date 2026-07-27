import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  cancelLiveClass,
  setLiveClassStatus,
} from "@/modules/live-classes/service";

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "LIVE", "ENDED", "CANCELLED"]),
});

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("live-classes.manage");
  const { id } = await params;
  const { status } = await parseBody(req, statusSchema);
  if (status === "CANCELLED") {
    return ok(await cancelLiveClass(id, session.sub));
  }
  return ok(await setLiveClassStatus(id, status, session.sub));
});
