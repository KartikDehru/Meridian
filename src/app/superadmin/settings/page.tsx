import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { getSettings, SETTING_DEFS } from "@/modules/platform/service";
import { PageHeader } from "@/components/ui/primitives";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SuperAdminSettingsPage() {
  await requireRole("SUPER_ADMIN");
  const values = await getSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Platform settings"
        subtitle="Runtime configuration. Secrets (SMTP, Zoom, database) live in environment variables — see docs/getting-started.md."
      />
      <SettingsForm
        defs={SETTING_DEFS.map((d) => ({
          key: d.key,
          label: d.label,
          description: d.description,
        }))}
        values={values}
      />
    </div>
  );
}
