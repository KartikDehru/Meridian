import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { enroll, enrollGrade, unenroll } from "@/modules/enrollment/service";

const enrollmentSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("enroll"),
    studentProfileId: z.string(),
    courseId: z.string(),
  }),
  z.object({
    action: z.literal("unenroll"),
    studentProfileId: z.string(),
    courseId: z.string(),
  }),
  z.object({
    action: z.literal("enroll-grade"),
    courseId: z.string(),
  }),
]);

export const POST = handler(async (req) => {
  const session = await requirePermission("enrollment.manage");
  const body = await parseBody(req, enrollmentSchema);

  if (body.action === "enroll-grade") {
    return ok(await enrollGrade(body.courseId, session.sub));
  }
  if (body.action === "unenroll") {
    await unenroll(body.studentProfileId, body.courseId, session.sub);
    return ok({ unenrolled: true });
  }
  return ok(await enroll(body.studentProfileId, body.courseId, session.sub), {
    status: 201,
  });
});
