import { handler, ok } from "@/lib/api";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const POST = handler(async () => {
  const session = await getSession();
  if (session) {
    await audit({
      actorId: session.sub,
      action: "auth.logout",
      entityType: "User",
      entityId: session.sub,
    });
  }
  await clearSessionCookie();
  return ok({ loggedOut: true });
});
