import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";
import { hasPermission, type Permission } from "./rbac";

/**
 * Server-side guards used by layouts, pages and services. The middleware
 * performs a first coarse check at the edge; these guards re-verify on the
 * server so a page can never render for the wrong role.
 */

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/login?error=forbidden");
  return session;
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required.") {
    super(message);
  }
}

/** API-flavored session guard: throws instead of redirecting. */
export async function apiSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** API-flavored guard: throws instead of redirecting. */
export async function requirePermission(
  permission: Permission,
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (!hasPermission(session.role, permission)) throw new ForbiddenError();
  return session;
}
