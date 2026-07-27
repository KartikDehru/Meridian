import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware: coarse route protection + security headers.
 *
 * The middleware only checks that a valid session cookie exists and that its
 * role claim matches the portal being accessed. Fine-grained permission
 * checks happen again on the server in guards/services (defense in depth).
 */

const SESSION_COOKIE = "meridian_session";

const PORTAL_ROLES: Record<string, string[]> = {
  "/student": ["STUDENT"],
  "/parent": ["PARENT"],
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/superadmin": ["SUPER_ADMIN"],
};

const PUBLIC_API = ["/api/v1/auth/login", "/api/v1/health"];

async function verify(token: string): Promise<{ sub?: string; role?: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ?? "meridian-dev-secret",
    );
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return { sub: payload.sub, role: payload.role as string | undefined };
  } catch {
    return null;
  }
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verify(token) : null;

  // API routes: unauthenticated calls get 401 JSON (except public endpoints).
  if (pathname.startsWith("/api/v1")) {
    if (!PUBLIC_API.some((p) => pathname.startsWith(p)) && !session) {
      return NextResponse.json(
        { ok: false, error: { message: "Authentication required." } },
        { status: 401 },
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // Portal routes: require a session with a matching role claim.
  const portal = Object.keys(PORTAL_ROLES).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (portal) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    if (!PORTAL_ROLES[portal].includes(session.role ?? "")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "forbidden");
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  // Already signed in? Skip the login page.
  if (pathname === "/login" && session?.role) {
    const url = req.nextUrl.clone();
    url.pathname =
      session.role === "STUDENT"
        ? "/student"
        : session.role === "PARENT"
          ? "/parent"
          : session.role === "ADMIN"
            ? "/admin"
            : "/superadmin";
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
