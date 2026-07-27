import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { Avatar, Badge, Card, PageHeader, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { ToggleActiveButton } from "@/app/admin/users/user-actions";
import { CreateAdminButton } from "./admin-actions";

export const metadata: Metadata = { title: "Admins" };

export default async function SuperAdminAdminsPage() {
  const session = await requireRole("SUPER_ADMIN");
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Admin accounts"
        subtitle="Staff who can manage curriculum, users and communications."
        action={<CreateAdminButton />}
      />
      <Card>
        <Table head={["Account", "Role", "Last login", "Since", "Status", ""]}>
          {admins.map((u) => (
            <tr key={u.id}>
              <td className="px-5 py-3">
                <span className="flex items-center gap-3">
                  <Avatar name={`${u.firstName} ${u.lastName}`} color={u.avatarColor} size={30} />
                  <span>
                    <span className="block text-sm font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </span>
                </span>
              </td>
              <td className="px-5 py-3">
                <Badge tone={u.role === "SUPER_ADMIN" ? "info" : "default"}>
                  {u.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-xs text-muted">
                {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
              </td>
              <td className="px-5 py-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
              <td className="px-5 py-3">
                <Badge tone={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Active" : "Disabled"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right">
                {u.id !== session.sub && u.role !== "SUPER_ADMIN" ? (
                  <ToggleActiveButton userId={u.id} isActive={u.isActive} />
                ) : null}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
