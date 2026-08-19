import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { MODULES } from "@/modules/registry";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Modules" };

export default async function SuperAdminModulesPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <div>
      <PageHeader
        title="Module registry"
        subtitle="Meridian is composed of self-contained domain modules — the Frappe-inspired backbone described in docs/modules.md."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {MODULES.map((m) => (
          <Card key={m.name} className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon name={m.icon as IconName} size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{m.title}</h2>
                  <Badge tone="success">installed</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{m.description}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 font-medium uppercase tracking-wide text-muted">
                  Models
                </dt>
                <dd className="text-muted">{m.models.join(", ") || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 font-medium uppercase tracking-wide text-muted">
                  Permissions
                </dt>
                <dd className="text-muted">{m.permissions.join(", ")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 font-medium uppercase tracking-wide text-muted">
                  Routes
                </dt>
                <dd className="font-mono text-muted">{m.routes.join(", ")}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
