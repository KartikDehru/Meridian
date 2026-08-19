import { handler, ok, NotFoundError } from "@/lib/api";
import { apiSession } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/auth/guard";
import { assertParentOfStudent } from "@/modules/users/service";
import { childStats } from "@/modules/analytics/service";

export const GET = handler(async (_req, { params }) => {
  const session = await apiSession();
  const { profileId } = await params;

  // Parents may only read their own children; admins may read any student.
  if (session.role === "PARENT") {
    await assertParentOfStudent(session.sub, profileId);
  } else if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    throw new ForbiddenError();
  }

  const stats = await childStats(profileId);
  if (!stats) throw new NotFoundError("Student not found.");
  return ok(stats);
});
