import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Verify credentials and mint a session token.
 * Returns null on any failure — callers must not reveal whether the email
 * exists (uniform error message, mitigates account enumeration).
 */
export async function login(
  email: string,
  password: string,
  ip: string,
): Promise<LoginResult | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Constant-shape flow: always run a bcrypt compare so response timing does
  // not reveal whether the account exists.
  const hash =
    user?.passwordHash ??
    "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpUJgPo4M0F0R1a2yQxWJd3eGyO7W";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid || !user.isActive) {
    await audit({
      action: "auth.login_failed",
      entityType: "User",
      entityId: user?.id,
      meta: { email },
      ip,
    });
    return null;
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ip,
  });

  const token = await createSessionToken({
    sub: user.id,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}
