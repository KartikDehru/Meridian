import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { listUsers } from "@/modules/users/service";
import { db } from "@/lib/db";
import { Avatar, Badge, Card, PageHeader, Table } from "@/components/ui/primitives";
import { formatDate, gradeShort } from "@/lib/utils";
import { CreateUserPanel, ToggleActiveButton } from "./user-actions";

export const metadata: Metadata = { title: "Users" };

const TABS = [
  { key: "STUDENT", label: "Students" },
  { key: "PARENT", label: "Parents" },
  { key: "ADMIN", label: "Admins" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { role: roleParam } = await searchParams;
  const role = (["STUDENT", "PARENT", "ADMIN"].includes(roleParam ?? "")
    ? roleParam
    : "STUDENT") as "STUDENT" | "PARENT" | "ADMIN";

  const [users, parents, students] = await Promise.all([
    listUsers({ role }),
    db.parentProfile.findMany({ include: { user: true }, orderBy: { user: { firstName: "asc" } } }),
    db.studentProfile.findMany({ include: { user: true }, orderBy: { user: { firstName: "asc" } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Students, parents and their family links."
        action={
          <CreateUserPanel
            isSuperAdmin={session.role === "SUPER_ADMIN"}
            parents={parents.map((p) => ({
              profileId: p.id,
              name: `${p.user.firstName} ${p.user.lastName}`,
            }))}
            students={students.map((s) => ({
              profileId: s.id,
              name: `${s.user.firstName} ${s.user.lastName} (${s.admissionNo})`,
            }))}
          />
        }
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/users?role=${t.key}`}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
              role === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table
          head={
            role === "STUDENT"
              ? ["Student", "Grade", "Admission", "Parents", "Joined", "Status", ""]
              : role === "PARENT"
                ? ["Parent", "Children", "Joined", "Status", ""]
                : ["Admin", "Last login", "Joined", "Status", ""]
          }
        >
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-5 py-3">
                <span className="flex items-center gap-3">
                  <Avatar name={`${u.firstName} ${u.lastName}`} color={u.avatarColor ?? "#10b981"} size={30} />
                  <span>
                    <span className="block text-sm font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </span>
                </span>
              </td>
              {role === "STUDENT" ? (
                <>
                  <td className="px-5 py-3">
                    <Badge>{gradeShort(u.studentProfile?.gradeLevel ?? 0)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">
                    {u.studentProfile?.admissionNo}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">
                    {u.studentProfile?.parents
                      .map(
                        (p) =>
                          `${p.parent.user.firstName} ${p.parent.user.lastName} (${p.relationship})`,
                      )
                      .join(", ") || "—"}
                  </td>
                </>
              ) : null}
              {role === "PARENT" ? (
                <td className="px-5 py-3 text-xs text-muted">
                  {u.parentProfile?.children
                    .map((c) => `${c.student.user.firstName} ${c.student.user.lastName}`)
                    .join(", ") || "—"}
                </td>
              ) : null}
              {role === "ADMIN" ? (
                <td className="px-5 py-3 text-xs text-muted">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                </td>
              ) : null}
              <td className="px-5 py-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
              <td className="px-5 py-3">
                <Badge tone={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Active" : "Disabled"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right">
                <ToggleActiveButton userId={u.id} isActive={u.isActive} />
              </td>
            </tr>
          ))}
        </Table>
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">No users in this group.</p>
        ) : null}
      </Card>
    </div>
  );
}
