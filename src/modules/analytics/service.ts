import { db } from "@/lib/db";

/**
 * Analytics module.
 *
 * `childStats` powers the parent dashboard: per-child performance trends,
 * subject averages, lesson completion, attendance and recent results.
 * `platformStats` powers the admin / super-admin overview.
 */

export interface ChildStats {
  student: {
    profileId: string;
    userId: string;
    name: string;
    admissionNo: string;
    gradeLevel: number;
    section: string | null;
    avatarColor: string;
  };
  overview: {
    averageScorePct: number | null;
    gradedAttempts: number;
    pendingActivities: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    timeSpentMinutes: number;
    attendancePct: number | null;
    coursesEnrolled: number;
  };
  /** Chronological graded results — powers the score trend chart. */
  scoreTrend: Array<{
    date: string;
    scorePct: number;
    activity: string;
    subject: string;
  }>;
  /** Average score per subject — powers the subject bar chart. */
  subjectAverages: Array<{
    subject: string;
    averagePct: number;
    attempts: number;
  }>;
  courseProgress: Array<{
    courseId: string;
    title: string;
    subject: string;
    completedLessons: number;
    totalLessons: number;
  }>;
  recentAttempts: Array<{
    id: string;
    activity: string;
    type: string;
    subject: string;
    status: string;
    scorePct: number | null;
    submittedAt: string | null;
    feedback: string | null;
  }>;
  attendance: {
    present: number;
    late: number;
    absent: number;
  };
}

export async function childStats(studentProfileId: string): Promise<ChildStats | null> {
  const profile = await db.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: { user: true },
  });
  if (!profile) return null;

  const [attempts, enrollments, progress, attendance] = await Promise.all([
    db.activityAttempt.findMany({
      where: { studentId: profile.id },
      include: {
        activity: { include: { course: { include: { subject: true } } } },
      },
      orderBy: { startedAt: "asc" },
    }),
    db.enrollment.findMany({
      where: { studentId: profile.id, course: { isPublished: true } },
      include: {
        course: {
          include: {
            subject: true,
            chapters: {
              include: { lessons: { where: { isPublished: true }, select: { id: true } } },
            },
          },
        },
      },
    }),
    db.lessonProgress.findMany({ where: { studentId: profile.id } }),
    db.attendance.findMany({
      where: { studentId: profile.id, liveClass: { status: { not: "CANCELLED" }, startTime: { lte: new Date() } } },
    }),
  ]);

  const graded = attempts.filter((a) => a.status === "GRADED" && a.score !== null);
  const scorePct = (a: (typeof graded)[number]) =>
    Math.round(((a.score ?? 0) / Math.max(a.maxScore, 1)) * 100);

  const averageScorePct =
    graded.length > 0
      ? Math.round(graded.reduce((sum, a) => sum + scorePct(a), 0) / graded.length)
      : null;

  // Subject averages
  const bySubject = new Map<string, { total: number; count: number }>();
  for (const a of graded) {
    const subject = a.activity.course.subject.name;
    const entry = bySubject.get(subject) ?? { total: 0, count: 0 };
    entry.total += scorePct(a);
    entry.count += 1;
    bySubject.set(subject, entry);
  }

  // Course progress
  const completedIds = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.lessonId),
  );
  const courseProgress = enrollments.map((e) => {
    const lessonIds = e.course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
    return {
      courseId: e.course.id,
      title: e.course.title,
      subject: e.course.subject.name,
      completedLessons: lessonIds.filter((id) => completedIds.has(id)).length,
      totalLessons: lessonIds.length,
    };
  });
  const lessonsTotal = courseProgress.reduce((s, c) => s + c.totalLessons, 0);
  const lessonsCompleted = courseProgress.reduce((s, c) => s + c.completedLessons, 0);

  // Pending published activities in enrolled courses (no graded/submitted attempt yet)
  const attemptedActivityIds = new Set(
    attempts.filter((a) => a.status !== "IN_PROGRESS").map((a) => a.activityId),
  );
  const pendingActivities = await db.activity.count({
    where: {
      isPublished: true,
      courseId: { in: enrollments.map((e) => e.courseId) },
      id: { notIn: [...attemptedActivityIds] },
    },
  });

  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const late = attendance.filter((a) => a.status === "LATE").length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const attendanceTotal = present + late + absent;

  return {
    student: {
      profileId: profile.id,
      userId: profile.user.id,
      name: `${profile.user.firstName} ${profile.user.lastName}`,
      admissionNo: profile.admissionNo,
      gradeLevel: profile.gradeLevel,
      section: profile.section,
      avatarColor: profile.user.avatarColor,
    },
    overview: {
      averageScorePct,
      gradedAttempts: graded.length,
      pendingActivities,
      lessonsCompleted,
      lessonsTotal,
      timeSpentMinutes: progress.reduce((s, p) => s + p.timeSpentMinutes, 0),
      attendancePct:
        attendanceTotal > 0
          ? Math.round(((present + late) / attendanceTotal) * 100)
          : null,
      coursesEnrolled: enrollments.length,
    },
    scoreTrend: graded.map((a) => ({
      date: (a.submittedAt ?? a.startedAt).toISOString().slice(0, 10),
      scorePct: scorePct(a),
      activity: a.activity.title,
      subject: a.activity.course.subject.name,
    })),
    subjectAverages: [...bySubject.entries()]
      .map(([subject, { total, count }]) => ({
        subject,
        averagePct: Math.round(total / count),
        attempts: count,
      }))
      .sort((a, b) => b.averagePct - a.averagePct),
    courseProgress,
    recentAttempts: attempts
      .filter((a) => a.status !== "IN_PROGRESS")
      .slice(-10)
      .reverse()
      .map((a) => ({
        id: a.id,
        activity: a.activity.title,
        type: a.activity.type,
        subject: a.activity.course.subject.name,
        status: a.status,
        scorePct: a.status === "GRADED" && a.score !== null ? scorePct(a) : null,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        feedback: a.feedback,
      })),
    attendance: { present, late, absent },
  };
}

export interface PlatformStats {
  students: number;
  parents: number;
  admins: number;
  courses: number;
  publishedCourses: number;
  lessons: number;
  activities: number;
  attemptsGraded: number;
  averageScorePct: number | null;
  upcomingClasses: number;
  emailsSent: number;
  studentsPerGrade: Array<{ grade: number; count: number }>;
}

export async function platformStats(): Promise<PlatformStats> {
  const [
    students,
    parents,
    admins,
    courses,
    publishedCourses,
    lessons,
    activities,
    gradedAttempts,
    upcomingClasses,
    emailsSent,
    gradeGroups,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "PARENT" } }),
    db.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
    db.course.count(),
    db.course.count({ where: { isPublished: true } }),
    db.lesson.count(),
    db.activity.count(),
    db.activityAttempt.findMany({
      where: { status: "GRADED", score: { not: null } },
      select: { score: true, maxScore: true },
    }),
    db.liveClass.count({
      where: { startTime: { gte: new Date() }, status: "SCHEDULED" },
    }),
    db.emailLog.count({ where: { status: "SENT" } }),
    db.studentProfile.groupBy({ by: ["gradeLevel"], _count: true }),
  ]);

  const averageScorePct =
    gradedAttempts.length > 0
      ? Math.round(
          gradedAttempts.reduce(
            (sum, a) => sum + ((a.score ?? 0) / Math.max(a.maxScore, 1)) * 100,
            0,
          ) / gradedAttempts.length,
        )
      : null;

  return {
    students,
    parents,
    admins,
    courses,
    publishedCourses,
    lessons,
    activities,
    attemptsGraded: gradedAttempts.length,
    averageScorePct,
    upcomingClasses,
    emailsSent,
    studentsPerGrade: Array.from({ length: 11 }, (_, grade) => ({
      grade,
      count: gradeGroups.find((g) => g.gradeLevel === grade)?._count ?? 0,
    })),
  };
}
