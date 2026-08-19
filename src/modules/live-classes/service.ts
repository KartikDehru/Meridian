import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/api";
import { createZoomMeeting, deleteZoomMeeting, zoomConfigured } from "./zoom";
import { notify } from "@/modules/communications/service";
import { sendTemplatedEmail } from "@/modules/communications/mailer";
import { formatDateTime, gradeName } from "@/lib/utils";

export const liveClassSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).default(""),
  courseId: z.string().nullable().optional(),
  gradeLevel: z.number().int().min(0).max(10),
  startTime: z.string(),
  durationMinutes: z.number().int().min(10).max(240).default(40),
  /** Manual fallback when Zoom is not configured. */
  manualJoinUrl: z.string().url().optional(),
});

export async function scheduleLiveClass(
  input: z.infer<typeof liveClassSchema>,
  hostId: string,
) {
  const startTime = new Date(input.startTime);

  let zoomFields: {
    provider: string;
    zoomMeetingId?: string;
    joinUrl?: string;
    startUrl?: string;
    passcode?: string;
  } = { provider: "manual", joinUrl: input.manualJoinUrl };

  if (zoomConfigured()) {
    const meeting = await createZoomMeeting({
      topic: input.title,
      startTime,
      durationMinutes: input.durationMinutes,
      agenda: input.description,
    });
    zoomFields = {
      provider: "zoom",
      zoomMeetingId: meeting.meetingId,
      joinUrl: meeting.joinUrl,
      startUrl: meeting.startUrl,
      passcode: meeting.passcode,
    };
  }

  const liveClass = await db.liveClass.create({
    data: {
      title: input.title,
      description: input.description,
      courseId: input.courseId ?? null,
      gradeLevel: input.gradeLevel,
      hostId,
      startTime,
      durationMinutes: input.durationMinutes,
      ...zoomFields,
    },
  });

  // Pre-create attendance rows and notify students of the grade.
  const students = await db.studentProfile.findMany({
    where: { gradeLevel: input.gradeLevel, user: { isActive: true } },
    include: { user: true },
  });
  if (students.length > 0) {
    await db.attendance.createMany({
      data: students.map((s) => ({ liveClassId: liveClass.id, studentId: s.id })),
    });
    for (const s of students) {
      await notify(
        s.user.id,
        `Live class scheduled: ${liveClass.title}`,
        `${formatDateTime(startTime)} · ${gradeName(input.gradeLevel)}`,
        "/student/live-classes",
      );
      void sendTemplatedEmail("live_class_scheduled", s.user.email, {
        studentName: s.user.firstName,
        classTitle: liveClass.title,
        classTime: formatDateTime(startTime),
      });
    }
  }

  await audit({
    actorId: hostId,
    action: "live-classes.schedule",
    entityType: "LiveClass",
    entityId: liveClass.id,
    meta: { provider: zoomFields.provider, students: students.length },
  });
  return liveClass;
}

export async function cancelLiveClass(id: string, actorId: string) {
  const liveClass = await db.liveClass.findUnique({ where: { id } });
  if (!liveClass) throw new NotFoundError("Live class not found.");
  if (liveClass.provider === "zoom" && liveClass.zoomMeetingId) {
    try {
      await deleteZoomMeeting(liveClass.zoomMeetingId);
    } catch (err) {
      console.error("[zoom] failed to delete meeting:", err);
    }
  }
  const updated = await db.liveClass.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await audit({
    actorId,
    action: "live-classes.cancel",
    entityType: "LiveClass",
    entityId: id,
  });
  return updated;
}

export async function setLiveClassStatus(
  id: string,
  status: "SCHEDULED" | "LIVE" | "ENDED",
  actorId: string,
) {
  const updated = await db.liveClass.update({ where: { id }, data: { status } });
  await audit({
    actorId,
    action: `live-classes.status_${status.toLowerCase()}`,
    entityType: "LiveClass",
    entityId: id,
  });
  return updated;
}

export async function listLiveClasses(filter?: {
  gradeLevel?: number;
  upcomingOnly?: boolean;
}) {
  return db.liveClass.findMany({
    where: {
      gradeLevel: filter?.gradeLevel,
      ...(filter?.upcomingOnly
        ? { startTime: { gte: new Date(Date.now() - 2 * 3600_000) }, status: { not: "CANCELLED" } }
        : {}),
    },
    include: {
      course: { include: { subject: true } },
      host: { select: { firstName: true, lastName: true } },
      _count: { select: { attendance: true } },
    },
    orderBy: { startTime: "asc" },
    take: 100,
  });
}

/** Student joins a class: mark attendance PRESENT/LATE and return the URL. */
export async function joinLiveClass(liveClassId: string, studentUserId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!profile) throw new NotFoundError("Student profile not found.");
  const liveClass = await db.liveClass.findUnique({ where: { id: liveClassId } });
  if (!liveClass || liveClass.status === "CANCELLED") {
    throw new NotFoundError("Live class not found.");
  }

  const late =
    Date.now() > liveClass.startTime.getTime() + 10 * 60 * 1000;

  await db.attendance.upsert({
    where: {
      liveClassId_studentId: { liveClassId, studentId: profile.id },
    },
    create: {
      liveClassId,
      studentId: profile.id,
      status: late ? "LATE" : "PRESENT",
      joinedAt: new Date(),
    },
    update: {
      status: late ? "LATE" : "PRESENT",
      joinedAt: new Date(),
    },
  });

  return { joinUrl: liveClass.joinUrl, passcode: liveClass.passcode };
}

export async function attendanceForClass(liveClassId: string) {
  return db.attendance.findMany({
    where: { liveClassId },
    include: { student: { include: { user: true } } },
    orderBy: { student: { admissionNo: "asc" } },
  });
}
