import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { setUserActive } from "@/modules/users/service";

const patchSchema = z.object({ isActive: z.boolean() });

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("users.manage");
  const { id } = await params;
  const body = await parseBody(req, patchSchema);
  const user = await setUserActive(id, body.isActive, session.sub);
  return ok({ id: user.id, isActive: user.isActive });
});
