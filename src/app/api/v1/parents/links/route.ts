import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { linkParentChild } from "@/modules/users/service";

const linkSchema = z.object({
  parentProfileId: z.string(),
  studentProfileId: z.string(),
  relationship: z.string().max(30).default("guardian"),
});

export const POST = handler(async (req) => {
  const session = await requirePermission("users.manage");
  const body = await parseBody(req, linkSchema);
  const link = await linkParentChild(
    body.parentProfileId,
    body.studentProfileId,
    body.relationship,
    session.sub,
  );
  return ok(link, { status: 201 });
});
