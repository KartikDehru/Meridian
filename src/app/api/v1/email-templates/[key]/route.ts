import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  updateTemplate,
  updateTemplateSchema,
} from "@/modules/communications/service";

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("email.manage");
  const { key } = await params;
  const body = await parseBody(req, updateTemplateSchema);
  return ok(await updateTemplate(key, body, session.sub));
});
