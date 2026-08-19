import { z } from "zod";
import { handler, ok, parseBody, clientIp } from "@/lib/api";
import { requirePermission, ForbiddenError } from "@/lib/auth/guard";
import {
  createAdmin,
  createAdminSchema,
  createParent,
  createParentSchema,
  createStudent,
  createStudentSchema,
  listUsers,
} from "@/modules/users/service";

export const GET = handler(async (req) => {
  const session = await requirePermission("users.read");
  void session;
  const url = new URL(req.url);
  const role = url.searchParams.get("role") as
    | "STUDENT"
    | "PARENT"
    | "ADMIN"
    | "SUPER_ADMIN"
    | null;
  const users = await listUsers({
    role: role ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
  return ok(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      studentProfile: u.studentProfile,
      parentProfile: u.parentProfile,
    })),
  );
});

const createUserSchema = z.discriminatedUnion("kind", [
  createStudentSchema.extend({ kind: z.literal("student") }),
  createParentSchema.extend({ kind: z.literal("parent") }),
  createAdminSchema.extend({ kind: z.literal("admin") }),
]);

export const POST = handler(async (req) => {
  const session = await requirePermission("users.manage");
  const body = await parseBody(req, createUserSchema);
  void clientIp(req);

  if (body.kind === "admin") {
    // Only super admins may create admin accounts.
    const superSession = await requirePermission("admins.manage").catch(() => null);
    if (!superSession) throw new ForbiddenError("Only a super admin can create admin accounts.");
    const user = await createAdmin(body, session.sub);
    return ok({ id: user.id, email: user.email }, { status: 201 });
  }
  if (body.kind === "parent") {
    const user = await createParent(body, session.sub);
    return ok(
      { id: user.id, email: user.email, parentProfileId: user.parentProfile?.id },
      { status: 201 },
    );
  }
  const user = await createStudent(body, session.sub);
  return ok(
    {
      id: user.id,
      email: user.email,
      studentProfileId: user.studentProfile?.id,
      admissionNo: user.studentProfile?.admissionNo,
    },
    { status: 201 },
  );
});
