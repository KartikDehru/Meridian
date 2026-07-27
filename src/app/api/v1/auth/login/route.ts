import { z } from "zod";
import { clientIp, fail, handler, ok, parseBody } from "@/lib/api";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rate-limit";
import { login } from "@/modules/auth/service";
import { setSessionCookie } from "@/lib/auth/session";
import { homePathFor } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  sweepExpiredBuckets();

  // 10 attempts per 5 minutes per IP — mitigates credential stuffing.
  const limit = rateLimit(`login:${ip}`, { limit: 10, windowSeconds: 300 });
  if (!limit.ok) {
    return fail(
      `Too many login attempts. Try again in ${limit.retryAfterSeconds}s.`,
      429,
    );
  }

  const { email, password } = await parseBody(req, loginSchema);
  const result = await login(email, password, ip);
  if (!result) {
    return fail("Invalid email or password.", 401);
  }

  await setSessionCookie(result.token);
  return ok({
    user: result.user,
    redirectTo: homePathFor(result.user.role as Role),
  });
});
