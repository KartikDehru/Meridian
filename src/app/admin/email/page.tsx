import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { listEmailLogs, listTemplates } from "@/modules/communications/service";
import { smtpConfigured } from "@/modules/communications/mailer";
import { Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui/primitives";
import { parseJson } from "@/lib/utils";
import { TemplateEditor } from "./template-editor";

export const metadata: Metadata = { title: "Email" };

export default async function AdminEmailPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const [templates, logs] = await Promise.all([listTemplates(), listEmailLogs(50)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email"
        subtitle={
          smtpConfigured()
            ? "SMTP is connected — emails are delivered."
            : "SMTP is not configured — emails are logged as SKIPPED (see docs/integrations/email.md)."
        }
      />

      <TemplateEditor
        templates={templates.map((t) => ({
          key: t.key,
          name: t.name,
          description: t.description,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          variables: parseJson<string[]>(t.variables, []),
          isActive: t.isActive,
        }))}
      />

      <Card>
        <CardHeader title="Delivery log" subtitle="Latest 50 messages" />
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted">No email activity yet.</p>
        ) : (
          <Table head={["To", "Subject", "Template", "Status", "At"]}>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-5 py-3 text-xs">{l.to}</td>
                <td className="max-w-56 truncate px-5 py-3 text-xs">{l.subject}</td>
                <td className="px-5 py-3 text-xs text-muted">{l.templateKey ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge
                    tone={
                      l.status === "SENT"
                        ? "success"
                        : l.status === "FAILED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {l.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-xs text-muted">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
