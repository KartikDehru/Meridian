import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { smtpConfigured } from "@/modules/communications/mailer";
import { zoomConfigured } from "@/modules/live-classes/zoom";

/** Editable runtime settings with defaults (non-secret values only). */
export const SETTING_DEFS = [
  {
    key: "platform.name",
    label: "Platform name",
    default: "Meridian LMS",
    description: "Shown in the header, login page and email footer.",
  },
  {
    key: "platform.academicYear",
    label: "Academic year",
    default: "2026-2027",
    description: "Displayed on dashboards and reports.",
  },
  {
    key: "activities.defaultPassPct",
    label: "Default pass percentage",
    default: "40",
    description: "Suggested pass mark when authoring new activities.",
  },
  {
    key: "liveClasses.lateThresholdMinutes",
    label: "Late-join threshold (minutes)",
    default: "10",
    description: "Students joining after this many minutes are marked LATE.",
  },
] as const;

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  for (const def of SETTING_DEFS) {
    if (!(def.key in map)) map[def.key] = def.default;
  }
  return map;
}

export const updateSettingsSchema = z.record(z.string(), z.string().max(500));

export async function updateSettings(
  values: Record<string, string>,
  actorId: string,
) {
  const validKeys = new Set(SETTING_DEFS.map((d) => d.key as string));
  for (const [key, value] of Object.entries(values)) {
    if (!validKeys.has(key)) continue;
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  await audit({
    actorId,
    action: "settings.update",
    entityType: "Setting",
    meta: { keys: Object.keys(values) },
  });
  return getSettings();
}

/** Health snapshot of external integrations, for the super-admin screen. */
export function integrationStatus() {
  return {
    zoom: zoomConfigured(),
    smtp: smtpConfigured(),
    database: true,
  };
}

export async function listAuditLogs(opts?: { limit?: number; action?: string }) {
  return db.auditLog.findMany({
    where: opts?.action ? { action: { contains: opts.action } } : undefined,
    include: { actor: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}
