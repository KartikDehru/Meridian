import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { lessonWithContext } from "@/modules/curriculum/service";
import { renderMarkdown } from "@/lib/markdown";
import { Badge, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { MarkCompleteButton } from "./mark-complete";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("STUDENT");
  const { id } = await params;

  const lesson = await lessonWithContext(id).catch(() => null);
  if (!lesson || !lesson.isPublished) notFound();

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.sub },
  });
  const enrollment = profile
    ? await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: profile.id,
            courseId: lesson.chapter.course.id,
          },
        },
      })
    : null;
  if (!enrollment || !profile) notFound();

  const progress = await db.lessonProgress.findUnique({
    where: { studentId_lessonId: { studentId: profile.id, lessonId: lesson.id } },
  });
  const completed = progress?.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/student/courses/${lesson.chapter.course.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        ← {lesson.chapter.course.title}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {lesson.chapter.title} · {lesson.durationMinutes} min ·{" "}
            {lesson.contentType.toLowerCase()}
          </p>
        </div>
        <MarkCompleteButton
          lessonId={lesson.id}
          completed={completed}
          minutes={lesson.durationMinutes}
        />
      </div>

      <Card className="p-6">
        {lesson.contentType === "VIDEO" && lesson.videoUrl ? (
          <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={lesson.videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        ) : null}
        <article
          className="prose-lesson text-sm"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content) }}
        />
      </Card>

      {lesson.activities.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Activities for this lesson</h2>
          <div className="space-y-3">
            {lesson.activities.map((a) => (
              <Link key={a.id} href={`/student/activities/${a.id}`}>
                <Card className="mb-3 flex items-center gap-4 p-4 transition hover:border-primary">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon name="clipboard-check" size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a._count.questions} questions · {a.maxScore} points
                    </p>
                  </div>
                  <Badge tone="info">{a.type}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
