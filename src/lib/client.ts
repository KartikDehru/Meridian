"use client";

/** Thin client-side wrapper for the /api/v1 JSON envelope. */
export async function api<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(path, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: { message: string; details?: Array<{ path: string; message: string }> } }
    | null;

  if (!json) throw new Error(`Request failed (${res.status}).`);
  if (!json.ok) {
    const detail = json.error.details?.[0];
    throw new Error(
      detail ? `${json.error.message} ${detail.path}: ${detail.message}` : json.error.message,
    );
  }
  return json.data;
}
