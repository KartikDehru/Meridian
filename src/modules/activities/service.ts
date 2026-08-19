import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/api";
import { ForbiddenError } from "@/lib/auth/guard";
import { parseJson } from "@/lib/utils";
import { notify } from "@/modules/communications/service";
import { sendTemplatedEmail } from "@/modules/communications/mailer";

// --- Activity & question authoring ------------------------------------------

export const activitySchema = z.object({
  courseId: z.string(),
  lessonId: z.string().nullable().optional(),
  title: z.string().min(1).max(160),
  type: z.enum(["QUIZ", "ASSIGNMENT", "WORKSHEET", "PROJECT"]).default("QUIZ"),
  instructions: z.string().max(10_000).default(""),
  maxScore: z.number().int().min(1).max(1000).default(100),
  passScore: z.number().int().min(0).max(1000).default(40),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
  dueAt: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
});

export async function createActivity(
  input: z.infer<typeof activitySchema>,
  actorId: string,
) {
  if (input.passScore > input.maxScore) {
    throw new BadRequestError("Pass score cannot exceed max score.");
  }
  const activity = await db.activity.create({
    data: {
      ...input,
      lessonId: input.lessonId ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  await audit({
    actorId,
    action: "activities.create",
    entityType: "Activity",
    entityId: activity.id,
    meta: { title: activity.title, type: activity.type },
  });
  return activity;
}

export async function updateActivity(
  id: string,
  input: Partial<z.infer<typeof activitySchema>>,
  actorId: string,
) {
  const activity = await db.activity.update({
    where: { id },
    data: {
      ...input,
      lessonId: input.lessonId === undefined ? undefined : input.lessonId,
      dueAt:
        input.dueAt === undefined
          ? undefined
          : input.dueAt
            ? new Date(input.dueAt)
            : null,
    },
  });
  await audit({
    actorId,
    action: "activities.update",
    entityType: "Activity",
    entityId: id,
  });
  return activity;
}

export async function deleteActivity(id: string, actorId: string) {
  await db.activity.delete({ where: { id } });
  await audit({
    actorId,
    action: "activities.delete",
    entityType: "Activity",
    entityId: id,
  });
}

export const questionSchema = z.object({
  prompt: z.string().min(1).max(5000),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]).default("MCQ"),
  options: z.array(z.string().min(1)).max(8).default([]),
  correctAnswer: z.string().min(1).max(2000),
  points: z.number().int().min(1).max(100).default(10),
});

export async function addQuestion(
  activityId: string,
  input: z.infer<typeof questionSchema>,
  actorId: string,
) {
  if (input.type === "MCQ" && input.options.length < 2) {
    throw new BadRequestError("MCQ questions need at least two options.");
  }
  const options =
    input.type === "TRUE_FALSE" ? ["True", "False"] : input.options;
  if (input.type !== "SHORT_ANSWER" && !options.includes(input.correctAnswer)) {
    throw new BadRequestError("Correct answer must be one of the options.");
  }
  const last = await db.question.findFirst({
    where: { activityId },
    orderBy: { sortOrder: "desc" },
  });
  const question = await db.question.create({
    data: {
      activityId,
      prompt: input.prompt,
      type: input.type,
      options: JSON.stringify(options),
      correctAnswer: input.correctAnswer,
      points: input.points,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await audit({
    actorId,
    action: "activities.add_question",
    entityType: "Question",
    entityId: question.id,
  });
  return question;
}

export async function deleteQuestion(id: string, actorId: string) {
  await db.question.delete({ where: { id } });
  await audit({
    actorId,
    action: "activities.delete_question",
    entityType: "Question",
    entityId: id,
  });
}

export async function activityWithQuestions(id: string) {
  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      course: { include: { subject: true } },
      lesson: true,
    },
  });
  if (!activity) throw new NotFoundError("Activity not found.");
  return activity;
}

// --- Attempts (student) -------------------------------------------------------

async function studentProfileOf(userId: string) {
  const profile = await db.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new ForbiddenError("Student profile required.");
  return profile;
}

/** Start (or resume) an attempt. One open attempt per activity per student. */
export async function startAttempt(activityId: string, studentUserId: string) {
  const student = await studentProfileOf(studentUserId);
  const activity = await db.activity.findUnique({ where: { id: activityId } });
  if (!activity || !activity.isPublished) {
    throw new NotFoundError("Activity not found.");
  }

  const enrolled = await db.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId: student.id, courseId: activity.courseId },
    },
  });
  if (!enrolled) throw new ForbiddenError("You are not enrolled in this course.");

  const open = await db.activityAttempt.findFirst({
    where: { activityId, studentId: student.id, status: "IN_PROGRESS" },
  });
  if (open) return open;

  return db.activityAttempt.create({
    data: { activityId, studentId: student.id, maxScore: activity.maxScore },
  });
}

export const submitAttemptSchema = z.object({
  /** questionId -> chosen answer / free text */
  answers: z.record(z.string(), z.string().max(10_000)),
});

/**
 * Submit an attempt. Objective questions (MCQ / TRUE_FALSE / SHORT_ANSWER)
 * are auto-graded; ASSIGNMENT/PROJECT activities without questions stay
 * SUBMITTED until an admin grades them manually.
 */
export async function submitAttempt(
  attemptId: string,
  answers: Record<string, string>,
  studentUserId: string,
) {
  const student = await studentProfileOf(studentUserId);
  const attempt = await db.activityAttempt.findUnique({
    where: { id: attemptId },
    include: { activity: { include: { questions: true } } },
  });
  if (!attempt || attempt.studentId !== student.id) {
    throw new NotFoundError("Attempt not found.");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new BadRequestError("This attempt was already submitted.");
  }

  const questions = attempt.activity.questions;
  const autoGradable = questions.length > 0;
  let earned = 0;
  let totalPoints = 0;

  for (const q of questions) {
    totalPoints += q.points;
    const given = (answers[q.id] ?? "").trim();
    if (q.type === "SHORT_ANSWER") {
      if (given.toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        earned += q.points;
      }
    } else if (given === q.correctAnswer) {
      earned += q.points;
    }
  }

  const score = autoGradable
    ? Math.round((earned / Math.max(totalPoints, 1)) * attempt.activity.maxScore * 100) / 100
    : null;

  const updated = await db.activityAttempt.update({
    where: { id: attemptId },
    data: {
      answers: JSON.stringify(answers),
      submittedAt: new Date(),
      status: autoGradable ? "GRADED" : "SUBMITTED",
      score,
    },
  });

  await audit({
    actorId: studentUserId,
    action: "activities.submit_attempt",
    entityType: "ActivityAttempt",
    entityId: attemptId,
    meta: { score, autoGraded: autoGradable },
  });

  // Notify linked parents about a graded result.
  if (autoGradable && score !== null) {
    void notifyParentsOfResult(student.id, attempt.activity.title, score, attempt.activity.maxScore);
  }
  return updated;
}

async function notifyParentsOfResult(
  studentProfileId: string,
  activityTitle: string,
  score: number,
  maxScore: number,
) {
  const links = await db.parentChildLink.findMany({
    where: { studentId: studentProfileId },
    include: {
      parent: { include: { user: true } },
      student: { include: { user: true } },
    },
  });
  for (const link of links) {
    const studentName = `${link.student.user.firstName} ${link.student.user.lastName}`;
    await notify(
      link.parent.user.id,
      `${studentName} scored ${score}/${maxScore}`,
      `Activity: ${activityTitle}`,
      "/parent",
    );
    void sendTemplatedEmail("activity_result", link.parent.user.email, {
      parentName: link.parent.user.firstName,
      studentName,
      activityTitle,
      score,
      maxScore,
    });
  }
}

// --- Grading (admin) ----------------------------------------------------------

export async function pendingGrading() {
  return db.activityAttempt.findMany({
    where: { status: "SUBMITTED" },
    include: {
      activity: { include: { course: true } },
      student: { include: { user: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}

export const gradeSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(5000).default(""),
});

export async function gradeAttempt(
  attemptId: string,
  input: z.infer<typeof gradeSchema>,
  graderId: string,
) {
  const attempt = await db.activityAttempt.findUnique({
    where: { id: attemptId },
    include: {
      activity: true,
      student: { include: { user: true } },
    },
  });
  if (!attempt) throw new NotFoundError("Attempt not found.");
  if (input.score > attempt.maxScore) {
    throw new BadRequestError("Score cannot exceed the activity max score.");
  }

  const updated = await db.activityAttempt.update({
    where: { id: attemptId },
    data: {
      score: input.score,
      feedback: input.feedback || null,
      status: "GRADED",
      gradedById: graderId,
    },
  });

  await audit({
    actorId: graderId,
    action: "activities.grade_attempt",
    entityType: "ActivityAttempt",
    entityId: attemptId,
    meta: { score: input.score },
  });

  await notify(
    attempt.student.user.id,
    `"${attempt.activity.title}" graded: ${input.score}/${attempt.maxScore}`,
    input.feedback,
    "/student",
  );
  void notifyParentsOfResult(
    attempt.studentId,
    attempt.activity.title,
    input.score,
    attempt.maxScore,
  );
  return updated;
}

/** Attempt detail with parsed answers, for grading and review screens. */
export async function attemptDetail(attemptId: string) {
  const attempt = await db.activityAttempt.findUnique({
    where: { id: attemptId },
    include: {
      activity: { include: { questions: { orderBy: { sortOrder: "asc" } }, course: true } },
      student: { include: { user: true } },
    },
  });
  if (!attempt) throw new NotFoundError("Attempt not found.");
  return { ...attempt, parsedAnswers: parseJson<Record<string, string>>(attempt.answers, {}) };
}
