import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/api";
import { renderTemplate, sendRawEmail } from "./mailer";
import { parseJson } from "@/lib/utils";

// --- Email templates --------------------------------------------------------

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  subject: z.string().min(1).max(200).optional(),
  bodyHtml: z.string().min(1).max(50_000).optional(),
  isActive: z.boolean().optional(),
});

export async function listTemplates() {
  return db.emailTemplate.findMany({ orderBy: { key: "asc" } });
}

export async function updateTemplate(
  key: string,
  input: z.infer<typeof updateTemplateSchema>,
  actorId: string,
) {
  const existing = await db.emailTemplate.findUnique({ where: { key } });
  if (!existing) throw new NotFoundError("Email template not found.");
  const updated = await db.emailTemplate.update({
    where: { key },
    data: { ...input, updatedById: actorId },
  });
  await audit({
    actorId,
    action: "email.update_template",
    entityType: "EmailTemplate",
    entityId: updated.id,
    meta: { key },
  });
  return updated;
}

/** Render a template with sample values and send it to the given address. */
export async function testSendTemplate(key: string, to: string, actorId: string) {
  const template = await db.emailTemplate.findUnique({ where: { key } });
  if (!template) throw new NotFoundError("Email template not found.");
  const sampleVars: Record<string, string> = {};
  for (const v of parseJson<string[]>(template.variables, [])) {
    sampleVars[v] = `[sample ${v}]`;
  }
  sampleVars.appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const result = await sendRawEmail(
    to,
    `[TEST] ${renderTemplate(template.subject, sampleVars)}`,
    renderTemplate(template.bodyHtml, sampleVars),
  );
  await audit({
    actorId,
    action: "email.test_send",
    entityType: "EmailTemplate",
    entityId: template.id,
    meta: { key, to },
  });
  return result;
}

export async function listEmailLogs(limit = 100) {
  return db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

// --- Announcements -----------------------------------------------------------

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  audience: z.enum(["ALL", "STUDENTS", "PARENTS", "ADMINS", "GRADE"]).default("ALL"),
  gradeLevel: z.number().int().min(0).max(10).nullable().optional(),
  isPinned: z.boolean().default(false),
});

export async function createAnnouncement(
  input: z.infer<typeof createAnnouncementSchema>,
  actorId: string,
) {
  const announcement = await db.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience,
      gradeLevel: input.audience === "GRADE" ? (input.gradeLevel ?? null) : null,
      isPinned: input.isPinned,
      createdById: actorId,
    },
  });
  await audit({
    actorId,
    action: "announcements.create",
    entityType: "Announcement",
    entityId: announcement.id,
  });
  return announcement;
}

export async function deleteAnnouncement(id: string, actorId: string) {
  await db.announcement.delete({ where: { id } });
  await audit({
    actorId,
    action: "announcements.delete",
    entityType: "Announcement",
    entityId: id,
  });
}

/** Announcements visible to a given audience/grade. */
export async function announcementsFor(opts: {
  role: "STUDENT" | "PARENT" | "ADMIN" | "SUPER_ADMIN";
  gradeLevel?: number;
  limit?: number;
}) {
  const audienceByRole = {
    STUDENT: "STUDENTS",
    PARENT: "PARENTS",
    ADMIN: "ADMINS",
    SUPER_ADMIN: "ADMINS",
  } as const;
  return db.announcement.findMany({
    where: {
      OR: [
        { audience: "ALL" },
        { audience: audienceByRole[opts.role] },
        ...(opts.gradeLevel !== undefined
          ? [{ audience: "GRADE" as const, gradeLevel: opts.gradeLevel }]
          : []),
      ],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: opts.limit ?? 20,
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
}

// --- Notifications -----------------------------------------------------------

export async function notify(
  userId: string,
  title: string,
  body = "",
  link?: string,
) {
  return db.notification.create({ data: { userId, title, body, link } });
}

export async function notificationsFor(userId: string, limit = 15) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
