import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/guard";

/**
 * Helpers shared by every /api/v1 route handler: consistent JSON envelopes,
 * zod-validated bodies and centralized error mapping.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { message, details } },
    { status },
  );
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Resource not found.") {
    super(message);
  }
}

export class BadRequestError extends Error {
  status = 400;
}

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  return schema.parse(json);
}

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/** Wrap a handler with uniform error handling. */
export function handler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(
          "Validation failed.",
          422,
          err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        );
      }
      if (
        err instanceof UnauthorizedError ||
        err instanceof ForbiddenError ||
        err instanceof NotFoundError ||
        err instanceof BadRequestError
      ) {
        return fail(err.message, err.status);
      }
      console.error("[api] unhandled error:", err);
      return fail("Internal server error.", 500);
    }
  };
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
