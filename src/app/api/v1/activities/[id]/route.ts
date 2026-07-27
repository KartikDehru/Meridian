import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  activitySchema,
  activityWithQuestions,
  deleteActivity,
  updateActivity,
} from "@/modules/activities/service";

export const GET = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.read");
  const { id } = await params;
  const activity = await activityWithQuestions(id);
  // Never leak answer keys to students.
  if (session.role === "STUDENT") {
    return ok({
      ...activity,
      questions: activity.questions.map((q) => ({
        ...q,
        correctAnswer: undefined,
      })),
    });
  }
  return ok(activity);
});

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, activitySchema.partial());
  return ok(await updateActivity(id, body, session.sub));
});

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteActivity(id, session.sub);
  return ok({ deleted: true });
});
