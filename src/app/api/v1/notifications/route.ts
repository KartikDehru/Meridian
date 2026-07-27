import { handler, ok } from "@/lib/api";
import { apiSession } from "@/lib/auth/guard";
import {
  markNotificationsRead,
  notificationsFor,
} from "@/modules/communications/service";

export const GET = handler(async () => {
  const session = await apiSession();
  return ok(await notificationsFor(session.sub));
});

/** Marks all of the caller's notifications as read. */
export const POST = handler(async () => {
  const session = await apiSession();
  await markNotificationsRead(session.sub);
  return ok({ read: true });
});
