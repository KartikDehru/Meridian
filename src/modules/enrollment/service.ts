import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/api";

export async function enroll(
  studentProfileId: string,
  courseId: string,
  actorId: string,
) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError("Course not found.");
  const enrollment = await db.enrollment.upsert({
    where: { studentId_courseId: { studentId: studentProfileId, courseId } },
    create: { studentId: studentProfileId, courseId },
    update: {},
  });
  await audit({
    actorId,
    action: "enrollment.enroll",
    entityType: "Enrollment",
    entityId: enrollment.id,
    meta: { studentProfileId, courseId },
  });
  return enrollment;
}

export async function unenroll(
  studentProfileId: string,
  courseId: string,
  actorId: string,
) {
  await db.enrollment.deleteMany({
    where: { studentId: studentProfileId, courseId },
  });
  await audit({
    actorId,
    action: "enrollment.unenroll",
    entityType: "Enrollment",
    meta: { studentProfileId, courseId },
  });
}

/** Enroll every student of the course's grade level (bulk action). */
export async function enrollGrade(courseId: string, actorId: string) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError("Course not found.");
  const students = await db.studentProfile.findMany({
    where: { gradeLevel: course.gradeLevel, user: { isActive: true } },
  });
  let created = 0;
  for (const student of students) {
    const result = await db.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId } },
      create: { studentId: student.id, courseId },
      update: {},
    });
    if (result) created += 1;
  }
  await audit({
    actorId,
    action: "enrollment.enroll_grade",
    entityType: "Course",
    entityId: courseId,
    meta: { students: students.length },
  });
  return { enrolled: created };
}

/** Courses a student is enrolled in, with completion stats. */
export async function coursesForStudent(studentUserId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!profile) return [];

  const enrollments = await db.enrollment.findMany({
    where: { studentId: profile.id, course: { isPublished: true } },
    include: {
      course: {
        include: {
          subject: true,
          chapters: { include: { lessons: { where: { isPublished: true }, select: { id: true } } } },
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  const completed = await db.lessonProgress.findMany({
    where: { studentId: profile.id, status: "COMPLETED" },
    select: { lessonId: true },
  });
  const completedIds = new Set(completed.map((p) => p.lessonId));

  return enrollments.map((e) => {
    const lessonIds = e.course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
    const done = lessonIds.filter((id) => completedIds.has(id)).length;
    return {
      course: e.course,
      totalLessons: lessonIds.length,
      completedLessons: done,
    };
  });
}

/** True when the given student user is enrolled in the course. */
export async function isStudentEnrolled(
  studentUserId: string,
  courseId: string,
): Promise<boolean> {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!profile) return false;
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: profile.id, courseId } },
  });
  return enrollment !== null;
}

/** Upsert lesson progress; marks COMPLETED and stamps completedAt. */
export async function recordLessonProgress(
  studentUserId: string,
  lessonId: string,
  opts: { completed: boolean; minutes?: number },
) {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!profile) throw new NotFoundError("Student profile not found.");
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { chapter: { select: { courseId: true } } },
  });
  if (!lesson) throw new NotFoundError("Lesson not found.");

  // Progress may only be recorded for lessons in courses the student is
  // actually enrolled in.
  const enrollment = await db.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: profile.id,
        courseId: lesson.chapter.courseId,
      },
    },
  });
  if (!enrollment) throw new NotFoundError("Lesson not found.");

  return db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: profile.id, lessonId } },
    create: {
      studentId: profile.id,
      lessonId,
      status: opts.completed ? "COMPLETED" : "IN_PROGRESS",
      timeSpentMinutes: opts.minutes ?? 0,
      completedAt: opts.completed ? new Date() : null,
    },
    update: {
      status: opts.completed ? "COMPLETED" : undefined,
      completedAt: opts.completed ? new Date() : undefined,
      timeSpentMinutes: opts.minutes !== undefined ? { increment: opts.minutes } : undefined,
    },
  });
}

/** Progress map (lessonId -> status) for a student. */
export async function progressMap(studentUserId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!profile) return new Map<string, string>();
  const rows = await db.lessonProgress.findMany({
    where: { studentId: profile.id },
    select: { lessonId: true, status: true },
  });
  return new Map(rows.map((r) => [r.lessonId, r.status as string]));
}
