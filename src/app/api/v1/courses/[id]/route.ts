import { handler, ok, parseBody, NotFoundError } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import {
  courseSchema,
  courseTree,
  deleteCourse,
  updateCourse,
} from "@/modules/curriculum/service";
import { isStudentEnrolled } from "@/modules/enrollment/service";

export const GET = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.read");
  const { id } = await params;
  const course = await courseTree(id);
  // Students may only read published courses they are enrolled in.
  if (session.role === "STUDENT") {
    if (!course.isPublished || !(await isStudentEnrolled(session.sub, course.id))) {
      throw new NotFoundError("Course not found.");
    }
  }
  return ok(course);
});

export const PATCH = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, courseSchema.partial());
  return ok(await updateCourse(id, body, session.sub));
});

export const DELETE = handler(async (_req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  await deleteCourse(id, session.sub);
  return ok({ deleted: true });
});
