import { db } from "@/lib/db";

/**
 * Append an entry to the immutable audit trail. Failures are logged but
 * never break the calling request.
 */
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        meta: JSON.stringify(entry.meta ?? {}),
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}
