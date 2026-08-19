import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { courseTree } from "@/modules/curriculum/service";
import { gradeName } from "@/lib/utils";
import { CourseManager } from "./course-manager";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;
  const course = await courseTree(id).catch(() => null);
  if (!course) notFound();

  return (
    <div>
      <Link
        href="/admin/courses"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        ← All courses
      </Link>
      <CourseManager
        course={{
          id: course.id,
          title: course.title,
          subject: course.subject.name,
          gradeLabel: gradeName(course.gradeLevel),
          isPublished: course.isPublished,
          chapters: course.chapters.map((ch) => ({
            id: ch.id,
            title: ch.title,
            description: ch.description,
            lessons: ch.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              contentType: l.contentType,
              durationMinutes: l.durationMinutes,
              isPublished: l.isPublished,
            })),
          })),
          activities: course.activities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            isPublished: a.isPublished,
            questions: a._count.questions,
            attempts: a._count.attempts,
            lessonId: a.lessonId,
          })),
        }}
      />
    </div>
  );
}
