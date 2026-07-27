import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { courseSchema, createCourse, listCourses } from "@/modules/curriculum/service";

export const GET = handler(async (req) => {
  const session = await requirePermission("curriculum.read");
  const url = new URL(req.url);
  const gradeLevel = url.searchParams.get("gradeLevel");
  const courses = await listCourses({
    gradeLevel: gradeLevel !== null ? Number(gradeLevel) : undefined,
    subjectId: url.searchParams.get("subjectId") ?? undefined,
    // Students only ever see published courses.
    publishedOnly: session.role === "STUDENT",
  });
  return ok(courses);
});

export const POST = handler(async (req) => {
  const session = await requirePermission("curriculum.manage");
  const body = await parseBody(req, courseSchema);
  const course = await createCourse(body, session.sub);
  return ok(course, { status: 201 });
});
