"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";

interface TemplateData {
  key: string;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
}

/** Edit + test-send customizable email templates. */
export function TemplateEditor({ templates }: { templates: TemplateData[] }) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "");
  const selected = templates.find((t) => t.key === selectedKey);

  const [subject, setSubject] = useState(selected?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(selected?.bodyHtml ?? "");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function pick(key: string) {
    const t = templates.find((x) => x.key === key);
    setSelectedKey(key);
    setSubject(t?.subject ?? "");
    setBodyHtml(t?.bodyHtml ?? "");
    setMessage(null);
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/v1/email-templates/${selected.key}`, {
        method: "PATCH",
        body: { subject, bodyHtml },
      });
      setMessage({ tone: "ok", text: "Template saved." });
      router.refresh();
    } catch (err) {
      setMessage({
        tone: "err",
        text: err instanceof Error ? err.message : "Save failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/v1/email-templates/${selected.key}`, {
        method: "PATCH",
        body: { isActive: !selected.isActive },
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function testSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ sent: boolean; reason?: string }>(
        `/api/v1/email-templates/${selected.key}/test`,
        { method: "POST", body: { to: testTo } },
      );
      setMessage(
        result.sent
          ? { tone: "ok", text: `Test email sent to ${testTo}.` }
          : { tone: "err", text: `Not sent: ${result.reason}. Check the delivery log.` },
      );
      router.refresh();
    } catch (err) {
      setMessage({
        tone: "err",
        text: err instanceof Error ? err.message : "Test send failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!selected) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow)]">
        <p className="border-b border-border px-5 py-3 text-sm font-semibold">Templates</p>
        <div className="p-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pick(t.key)}
              className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition ${
                t.key === selectedKey ? "bg-primary-soft" : "hover:bg-surface-hover"
              }`}
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-xs font-medium">{t.name}</span>
                <span
                  className={`h-2 w-2 rounded-full ${t.isActive ? "bg-primary" : "bg-border"}`}
                  title={t.isActive ? "Active" : "Disabled"}
                />
              </span>
              <span className="mt-0.5 text-[11px] text-muted">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)] lg:col-span-2">
        {message ? (
          <p
            className={`rounded-lg px-3 py-2 text-xs ${
              message.tone === "ok"
                ? "bg-primary-soft text-primary"
                : "bg-danger-soft text-danger"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <label className="block">
          <span className={labelCls}>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Body (HTML)</span>
          <textarea
            rows={10}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className={`${inputCls} font-mono text-xs`}
          />
        </label>
        <p className="text-[11px] text-muted">
          Available variables:{" "}
          {selected.variables.length > 0
            ? selected.variables.map((v) => `{{${v}}}`).join(", ")
            : "none"}
          {" · "}
          {"{{appUrl}}"} is always available.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? "Working…" : "Save template"}
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            {selected.isActive ? "Disable" : "Enable"}
          </button>
          <form onSubmit={testSend} className="ml-auto flex items-center gap-2">
            <input
              type="email"
              required
              placeholder="test@you.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className={`${inputCls} w-48`}
            />
            <button
              type="submit"
              disabled={busy}
              className="whitespace-nowrap rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              Send test
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
