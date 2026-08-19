import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { coursesForStudent } from "@/modules/enrollment/service";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { percent } from "@/lib/utils";

export const metadata: Metadata = { title: "My Courses" };

export default async function StudentCoursesPage() {
  const session = await requireRole("STUDENT");
  const courses = await coursesForStudent(session.sub);

  return (
    <div>
      <PageHeader
        title="My Courses"
        subtitle="Everything you're enrolled in this academic year."
      />
      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          hint="Your school admin will enroll you into courses for your grade."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, totalLessons, completedLessons }) => (
            <Link key={course.id} href={`/student/courses/${course.slug}`}>
              <Card className="h-full p-5 transition hover:border-primary">
                <span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: course.coverColor }}
                >
                  <Icon name="book" size={18} />
                </span>
                <h3 className="text-sm font-semibold">{course.title}</h3>
                <p className="mt-0.5 text-xs text-muted">{course.subject.name}</p>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                  {course.description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={percent(completedLessons, totalLessons)} />
                  <span className="whitespace-nowrap text-xs text-muted">
                    {completedLessons}/{totalLessons}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
