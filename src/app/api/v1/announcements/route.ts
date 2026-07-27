import { handler, ok, parseBody } from "@/lib/api";
import { apiSession, requirePermission } from "@/lib/auth/guard";
import {
  announcementsFor,
  createAnnouncement,
  createAnnouncementSchema,
} from "@/modules/communications/service";
import { db } from "@/lib/db";

export const GET = handler(async () => {
  const session = await apiSession();
  let gradeLevel: number | undefined;
  if (session.role === "STUDENT") {
    const profile = await db.studentProfile.findUnique({
      where: { userId: session.sub },
    });
    gradeLevel = profile?.gradeLevel;
  }
  return ok(await announcementsFor({ role: session.role, gradeLevel }));
});

export const POST = handler(async (req) => {
  const session = await requirePermission("announcements.manage");
  const body = await parseBody(req, createAnnouncementSchema);
  return ok(await createAnnouncement(body, session.sub), { status: 201 });
});
