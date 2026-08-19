import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { listAuditLogs } from "@/modules/platform/service";
import { Badge, Card, PageHeader, Table } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Audit Log" };

export default async function SuperAdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const { action } = await searchParams;
  const logs = await listAuditLogs({ limit: 200, action });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="An immutable trail of every sensitive operation on the platform."
        action={
          <form className="flex gap-2">
            <input
              name="action"
              defaultValue={action ?? ""}
              placeholder="Filter by action, e.g. auth."
              className="w-56 rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none transition focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              Filter
            </button>
          </form>
        }
      />
      <Card>
        <Table head={["When", "Actor", "Action", "Entity", "IP"]}>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-5 py-3 text-xs text-muted">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-5 py-3 text-xs">
                {log.actor ? (
                  <>
                    {log.actor.firstName} {log.actor.lastName}{" "}
                    <Badge tone="info">{log.actor.role}</Badge>
                  </>
                ) : (
                  <span className="text-muted">system</span>
                )}
              </td>
              <td className="px-5 py-3 font-mono text-xs">{log.action}</td>
              <td className="px-5 py-3 text-xs text-muted">
                {log.entityType}
                {log.entityId ? ` · ${log.entityId.slice(0, 10)}…` : ""}
              </td>
              <td className="px-5 py-3 text-xs text-muted">{log.ip ?? "—"}</td>
            </tr>
          ))}
        </Table>
        {logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">No entries match.</p>
        ) : null}
      </Card>
    </div>
  );
}
