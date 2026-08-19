"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

export function MarkCompleteButton({
  lessonId,
  completed,
  minutes,
}: {
  lessonId: string;
  completed: boolean;
  minutes: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(completed);

  async function markComplete() {
    setBusy(true);
    try {
      await api(`/api/v1/lessons/${lessonId}/progress`, {
        method: "POST",
        body: { completed: true, minutes },
      });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-medium text-primary">
        <Icon name="check" size={14} /> Completed
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={markComplete}
      disabled={busy}
      className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
    >
      {busy ? "Saving…" : "Mark as complete"}
    </button>
  );
}
