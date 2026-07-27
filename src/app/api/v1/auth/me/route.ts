import { handler, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { permissionsFor } from "@/lib/auth/rbac";

export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return fail("Authentication required.", 401);
  return ok({
    id: session.sub,
    name: session.name,
    email: session.email,
    role: session.role,
    permissions: permissionsFor(session.role),
  });
});
