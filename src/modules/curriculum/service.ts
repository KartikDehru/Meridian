import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/api";
import { slugify } from "@/lib/utils";

// --- Subjects ----------------------------------------------------------------

export async function listSubjects() {
  return db.subject.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
}

// --- Courses -----------------------------------------------------------------

export const courseSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).default(""),
  subjectId: z.string(),
  gradeLevel: z.number().int().min(0).max(10),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  isPublished: z.boolean().default(false),
});

export async function createCourse(
  input: z.infer<typeof courseSchema>,
  actorId: string,
) {
  const subject = await db.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) throw new BadRequestError("Unknown subject.");

  let slug = slugify(`${input.title}-g${input.gradeLevel}`);
  if (await db.course.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const course = await db.course.create({
    data: { ...input, slug, createdById: actorId },
  });
  await audit({
    actorId,
    action: "curriculum.create_course",
    entityType: "Course",
    entityId: course.id,
    meta: { title: course.title },
  });
  return course;
}

export async function updateCourse(
  id: string,
  input: Partial<z.infer<typeof courseSchema>>,
  actorId: string,
) {
  const course = await db.course.update({ where: { id }, data: input });
  await audit({
    actorId,
    action: "curriculum.update_course",
    entityType: "Course",
    entityId: id,
  });
  return course;
}

export async function deleteCourse(id: string, actorId: string) {
  await db.course.delete({ where: { id } });
  await audit({
    actorId,
    action: "curriculum.delete_course",
    entityType: "Course",
    entityId: id,
  });
}

export async function listCourses(filter?: {
  gradeLevel?: number;
  subjectId?: string;
  publishedOnly?: boolean;
}) {
  return db.course.findMany({
    where: {
      gradeLevel: filter?.gradeLevel,
      subjectId: filter?.subjectId,
      ...(filter?.publishedOnly ? { isPublished: true } : {}),
    },
    include: {
      subject: true,
      _count: { select: { chapters: true, enrollments: true, activities: true } },
    },
    orderBy: [{ gradeLevel: "asc" }, { title: "asc" }],
  });
}

/** Full course tree: chapters -> lessons (+ activities). */
export async function courseTree(idOrSlug: string) {
  const course = await db.course.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      subject: true,
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { activities: { where: { isPublished: true } } },
          },
        },
      },
      activities: { include: { _count: { select: { questions: true, attempts: true } } } },
    },
  });
  if (!course) throw new NotFoundError("Course not found.");
  return course;
}

// --- Chapters ----------------------------------------------------------------

export const chapterSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).default(""),
});

export async function createChapter(
  courseId: string,
  input: z.infer<typeof chapterSchema>,
  actorId: string,
) {
  const last = await db.chapter.findFirst({
    where: { courseId },
    orderBy: { sortOrder: "desc" },
  });
  const chapter = await db.chapter.create({
    data: { ...input, courseId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  await audit({
    actorId,
    action: "curriculum.create_chapter",
    entityType: "Chapter",
    entityId: chapter.id,
  });
  return chapter;
}

export async function deleteChapter(id: string, actorId: string) {
  await db.chapter.delete({ where: { id } });
  await audit({
    actorId,
    action: "curriculum.delete_chapter",
    entityType: "Chapter",
    entityId: id,
  });
}

// --- Lessons -----------------------------------------------------------------

export const lessonSchema = z.object({
  title: z.string().min(1).max(160),
  contentType: z.enum(["ARTICLE", "VIDEO", "PDF", "INTERACTIVE"]).default("ARTICLE"),
  content: z.string().max(100_000).default(""),
  videoUrl: z.string().url().nullable().optional(),
  durationMinutes: z.number().int().min(1).max(600).default(10),
  isPublished: z.boolean().default(true),
});

export async function createLesson(
  chapterId: string,
  input: z.infer<typeof lessonSchema>,
  actorId: string,
) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) throw new NotFoundError("Chapter not found.");
  const last = await db.lesson.findFirst({
    where: { chapterId },
    orderBy: { sortOrder: "desc" },
  });
  const lesson = await db.lesson.create({
    data: {
      ...input,
      videoUrl: input.videoUrl ?? null,
      chapterId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await audit({
    actorId,
    action: "curriculum.create_lesson",
    entityType: "Lesson",
    entityId: lesson.id,
  });
  return lesson;
}

export async function updateLesson(
  id: string,
  input: Partial<z.infer<typeof lessonSchema>>,
  actorId: string,
) {
  const lesson = await db.lesson.update({
    where: { id },
    data: { ...input, videoUrl: input.videoUrl ?? undefined },
  });
  await audit({
    actorId,
    action: "curriculum.update_lesson",
    entityType: "Lesson",
    entityId: id,
  });
  return lesson;
}

export async function deleteLesson(id: string, actorId: string) {
  await db.lesson.delete({ where: { id } });
  await audit({
    actorId,
    action: "curriculum.delete_lesson",
    entityType: "Lesson",
    entityId: id,
  });
}

/** A lesson with its chapter/course context. */
export async function lessonWithContext(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      chapter: { include: { course: { include: { subject: true } } } },
      activities: {
        where: { isPublished: true },
        include: { _count: { select: { questions: true } } },
      },
    },
  });
  if (!lesson) throw new NotFoundError("Lesson not found.");
  return lesson;
}
