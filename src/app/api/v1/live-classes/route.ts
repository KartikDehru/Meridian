import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  listLiveClasses,
  liveClassSchema,
  scheduleLiveClass,
} from "@/modules/live-classes/service";
import { db } from "@/lib/db";

export const GET = handler(async (req) => {
  const session = await requirePermission("live-classes.read");
  const url = new URL(req.url);
  const upcomingOnly = url.searchParams.get("upcoming") === "true";

  // Students only see classes for their own grade.
  let gradeLevel: number | undefined;
  if (session.role === "STUDENT") {
    const profile = await db.studentProfile.findUnique({
      where: { userId: session.sub },
    });
    gradeLevel = profile?.gradeLevel;
  } else {
    const param = url.searchParams.get("gradeLevel");
    gradeLevel = param !== null ? Number(param) : undefined;
  }

  const classes = await listLiveClasses({ gradeLevel, upcomingOnly });
  // Hide host-only fields from non-managers, and hide join credentials from
  // students in list responses — they must use the /join endpoint, which is
  // what records their attendance.
  const canManage = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
  return ok(
    classes.map((c) => ({
      ...c,
      startUrl: canManage ? c.startUrl : undefined,
      joinUrl: canManage ? c.joinUrl : undefined,
      passcode: canManage ? c.passcode : undefined,
    })),
  );
});

export const POST = handler(async (req) => {
  const session = await requirePermission("live-classes.manage");
  const body = await parseBody(req, liveClassSchema);
  const liveClass = await scheduleLiveClass(body, session.sub);
  return ok(liveClass, { status: 201 });
});
