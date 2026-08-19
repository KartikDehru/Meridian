import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { courseTree } from "@/modules/curriculum/service";
import { progressMap } from "@/modules/enrollment/service";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireRole("STUDENT");
  const { slug } = await params;

  const course = await courseTree(slug).catch(() => null);
  if (!course || !course.isPublished) notFound();

  // Access control: the student must be enrolled.
  const profile = await db.studentProfile.findUnique({
    where: { userId: session.sub },
  });
  const enrollment = profile
    ? await db.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: profile.id, courseId: course.id },
        },
      })
    : null;
  if (!enrollment) notFound();

  const progress = await progressMap(session.sub);

  return (
    <div>
      <PageHeader
        title={course.title}
        subtitle={`${course.subject.name} · ${course.chapters.length} chapters`}
      />
      <div className="space-y-4">
        {course.chapters.map((chapter, i) => (
          <Card key={chapter.id}>
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Chapter {i + 1}
              </p>
              <h2 className="text-sm font-semibold">{chapter.title}</h2>
              {chapter.description ? (
                <p className="mt-0.5 text-xs text-muted">{chapter.description}</p>
              ) : null}
            </div>
            <div className="divide-y divide-border">
              {chapter.lessons
                .filter((l) => l.isPublished)
                .map((lesson) => {
                  const status = progress.get(lesson.id);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/student/lessons/${lesson.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-hover"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          status === "COMPLETED"
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary-soft text-muted"
                        }`}
                      >
                        <Icon
                          name={
                            status === "COMPLETED"
                              ? "check"
                              : lesson.contentType === "VIDEO"
                                ? "play"
                                : "file-text"
                          }
                          size={13}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{lesson.title}</p>
                        <p className="text-xs text-muted">
                          {lesson.contentType.toLowerCase()} · {lesson.durationMinutes} min
                        </p>
                      </div>
                      {lesson.activities.length > 0 ? (
                        <Badge tone="info">
                          {lesson.activities.length}{" "}
                          {lesson.activities.length === 1 ? "activity" : "activities"}
                        </Badge>
                      ) : null}
                      <Icon name="chevron-right" size={14} className="text-muted" />
                    </Link>
                  );
                })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
