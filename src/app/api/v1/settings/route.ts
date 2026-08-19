import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  getSettings,
  updateSettings,
  updateSettingsSchema,
} from "@/modules/platform/service";

export const GET = handler(async () => {
  await requirePermission("settings.manage");
  return ok(await getSettings());
});

export const PATCH = handler(async (req) => {
  const session = await requirePermission("settings.manage");
  const body = await parseBody(req, updateSettingsSchema);
  return ok(await updateSettings(body, session.sub));
});
