"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

export function JoinClassButton({
  liveClassId,
  joinable,
  hasLink,
}: {
  liveClassId: string;
  joinable: boolean;
  hasLink: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const { joinUrl } = await api<{ joinUrl: string | null }>(
        `/api/v1/live-classes/${liveClassId}/join`,
        { method: "POST" },
      );
      if (joinUrl) {
        window.open(joinUrl, "_blank", "noopener");
      } else {
        setError("No meeting link yet — check with your teacher.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  if (!joinable) {
    return (
      <span className="text-xs text-muted">
        {hasLink ? "Opens 10 min before start" : "Link pending"}
      </span>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        <Icon name="video" size={14} />
        {busy ? "Joining…" : "Join class"}
      </button>
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}
