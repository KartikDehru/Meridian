import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/api";
import { sendTemplatedEmail } from "@/modules/communications/mailer";

const AVATAR_COLORS = [
  "#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#6366f1",
];

function pickColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const baseUserSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
});

export const createStudentSchema = baseUserSchema.extend({
  gradeLevel: z.number().int().min(0).max(10),
  section: z.string().max(8).optional(),
  dateOfBirth: z.string().optional(),
  /** Parent profile ids to link, with relationship labels. */
  parentLinks: z
    .array(
      z.object({
        parentProfileId: z.string(),
        relationship: z.string().default("guardian"),
      }),
    )
    .default([]),
});

export const createParentSchema = baseUserSchema.extend({
  phone: z.string().max(20).optional(),
});

export const createAdminSchema = baseUserSchema;

async function assertNewUser(email: string, password: string): Promise<void> {
  const policyError = passwordPolicyError(password);
  if (policyError) throw new BadRequestError(policyError);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new BadRequestError("A user with this email already exists.");
}

async function nextAdmissionNo(): Promise<string> {
  const count = await db.studentProfile.count();
  return `MRD-${String(count + 1).padStart(5, "0")}`;
}

export async function createStudent(
  input: z.infer<typeof createStudentSchema>,
  actorId: string,
) {
  await assertNewUser(input.email, input.password);

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: "STUDENT",
      avatarColor: pickColor(input.email),
      studentProfile: {
        create: {
          admissionNo: await nextAdmissionNo(),
          gradeLevel: input.gradeLevel,
          section: input.section,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          parents: {
            create: input.parentLinks.map((l) => ({
              parentId: l.parentProfileId,
              relationship: l.relationship,
            })),
          },
        },
      },
    },
    include: { studentProfile: true },
  });

  await audit({
    actorId,
    action: "users.create_student",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email, gradeLevel: input.gradeLevel },
  });
  void sendTemplatedEmail("welcome_student", user.email, {
    studentName: `${user.firstName} ${user.lastName}`,
    admissionNo: user.studentProfile?.admissionNo ?? "",
  });
  return user;
}

export async function createParent(
  input: z.infer<typeof createParentSchema>,
  actorId: string,
) {
  await assertNewUser(input.email, input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: "PARENT",
      avatarColor: pickColor(input.email),
      parentProfile: { create: { phone: input.phone } },
    },
    include: { parentProfile: true },
  });
  await audit({
    actorId,
    action: "users.create_parent",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email },
  });
  void sendTemplatedEmail("welcome_parent", user.email, {
    parentName: `${user.firstName} ${user.lastName}`,
  });
  return user;
}

export async function createAdmin(
  input: z.infer<typeof createAdminSchema>,
  actorId: string,
) {
  await assertNewUser(input.email, input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: "ADMIN",
      avatarColor: pickColor(input.email),
    },
  });
  await audit({
    actorId,
    action: "users.create_admin",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email },
  });
  return user;
}

export async function linkParentChild(
  parentProfileId: string,
  studentProfileId: string,
  relationship: string,
  actorId: string,
) {
  const link = await db.parentChildLink.upsert({
    where: {
      parentId_studentId: {
        parentId: parentProfileId,
        studentId: studentProfileId,
      },
    },
    create: {
      parentId: parentProfileId,
      studentId: studentProfileId,
      relationship,
    },
    update: { relationship },
  });
  await audit({
    actorId,
    action: "users.link_parent_child",
    entityType: "ParentChildLink",
    entityId: link.id,
  });
  return link;
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
  actorId: string,
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found.");
  const updated = await db.user.update({
    where: { id: userId },
    data: { isActive },
  });
  await audit({
    actorId,
    action: isActive ? "users.activate" : "users.deactivate",
    entityType: "User",
    entityId: userId,
  });
  return updated;
}

export async function listUsers(filter?: {
  role?: "STUDENT" | "PARENT" | "ADMIN" | "SUPER_ADMIN";
  search?: string;
}) {
  return db.user.findMany({
    where: {
      role: filter?.role,
      ...(filter?.search
        ? {
            OR: [
              { firstName: { contains: filter.search } },
              { lastName: { contains: filter.search } },
              { email: { contains: filter.search } },
            ],
          }
        : {}),
    },
    include: {
      studentProfile: { include: { parents: { include: { parent: { include: { user: true } } } } } },
      parentProfile: { include: { children: { include: { student: { include: { user: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Children (with user info) for a given parent user id. */
export async function childrenOfParent(parentUserId: string) {
  const parent = await db.parentProfile.findUnique({
    where: { userId: parentUserId },
    include: {
      children: {
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return parent?.children ?? [];
}

/** Throws unless the given student is a child of the given parent user. */
export async function assertParentOfStudent(
  parentUserId: string,
  studentProfileId: string,
): Promise<void> {
  const link = await db.parentChildLink.findFirst({
    where: { student: { id: studentProfileId }, parent: { userId: parentUserId } },
  });
  if (!link) throw new NotFoundError("Child not found.");
}
