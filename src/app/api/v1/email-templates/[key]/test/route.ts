import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { testSendTemplate } from "@/modules/communications/service";

const testSchema = z.object({ to: z.string().email() });

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("email.manage");
  const { key } = await params;
  const { to } = await parseBody(req, testSchema);
  return ok(await testSendTemplate(key, to, session.sub));
});
