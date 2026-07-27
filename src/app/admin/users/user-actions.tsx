"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";
import { GRADE_LEVELS, gradeName } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const labelCls = "mb-1 block text-xs font-medium text-muted";

interface Option {
  profileId: string;
  name: string;
}

export function ToggleActiveButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await api(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: { isActive: !isActive },
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
    >
      {isActive ? "Disable" : "Enable"}
    </button>
  );
}

type PanelTab = "student" | "parent" | "admin" | "link";

export function CreateUserPanel({
  isSuperAdmin,
  parents,
  students,
}: {
  isSuperAdmin: boolean;
  parents: Option[];
  students: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Shared fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Student fields
  const [gradeLevel, setGradeLevel] = useState(1);
  const [section, setSection] = useState("");
  const [parentProfileId, setParentProfileId] = useState("");
  const [relationship, setRelationship] = useState("guardian");
  // Parent field
  const [phone, setPhone] = useState("");
  // Link fields
  const [linkParentId, setLinkParentId] = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkRelationship, setLinkRelationship] = useState("guardian");

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setSection("");
    setPhone("");
    setParentProfileId("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (tab === "link") {
        await api("/api/v1/parents/links", {
          method: "POST",
          body: {
            parentProfileId: linkParentId,
            studentProfileId: linkStudentId,
            relationship: linkRelationship,
          },
        });
        setSuccess("Family link saved.");
      } else {
        const base = { firstName, lastName, email, password };
        const body =
          tab === "student"
            ? {
                kind: "student",
                ...base,
                gradeLevel,
                section: section || undefined,
                parentLinks: parentProfileId
                  ? [{ parentProfileId, relationship }]
                  : [],
              }
            : tab === "parent"
              ? { kind: "parent", ...base, phone: phone || undefined }
              : { kind: "admin", ...base };
        await api("/api/v1/users", { method: "POST", body });
        setSuccess(`${tab[0].toUpperCase()}${tab.slice(1)} account created.`);
        reset();
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ key: PanelTab; label: string }> = [
    { key: "student", label: "Student" },
    { key: "parent", label: "Parent" },
    ...(isSuperAdmin ? [{ key: "admin" as PanelTab, label: "Admin" }] : []),
    { key: "link", label: "Link family" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        <Icon name="plus" size={14} /> New user
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Add to the school</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="flex gap-1 border-b border-border px-5 py-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTab(t.key);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    tab === t.key
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3 p-5">
              {error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
              ) : null}
              {success ? (
                <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
                  {success}
                </p>
              ) : null}

              {tab !== "link" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className={labelCls}>First name</span>
                      <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                    </label>
                    <label>
                      <span className={labelCls}>Last name</span>
                      <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelCls}>Email</span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>
                      Temporary password (min 8, letters + numbers)
                    </span>
                    <input
                      type="text"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </>
              ) : null}

              {tab === "student" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className={labelCls}>Grade</span>
                      <select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(Number(e.target.value))}
                        className={inputCls}
                      >
                        {GRADE_LEVELS.map((g) => (
                          <option key={g} value={g}>
                            {gradeName(g)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelCls}>Section (optional)</span>
                      <input value={section} onChange={(e) => setSection(e.target.value)} className={inputCls} placeholder="A" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className={labelCls}>Link a parent (optional)</span>
                      <select
                        value={parentProfileId}
                        onChange={(e) => setParentProfileId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— none —</option>
                        {parents.map((p) => (
                          <option key={p.profileId} value={p.profileId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelCls}>Relationship</span>
                      <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls}>
                        <option value="mother">Mother</option>
                        <option value="father">Father</option>
                        <option value="guardian">Guardian</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : null}

              {tab === "parent" ? (
                <label className="block">
                  <span className={labelCls}>Phone (optional)</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </label>
              ) : null}

              {tab === "link" ? (
                <>
                  <label className="block">
                    <span className={labelCls}>Parent</span>
                    <select required value={linkParentId} onChange={(e) => setLinkParentId(e.target.value)} className={inputCls}>
                      <option value="">Select a parent…</option>
                      {parents.map((p) => (
                        <option key={p.profileId} value={p.profileId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Student</span>
                    <select required value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className={inputCls}>
                      <option value="">Select a student…</option>
                      {students.map((s) => (
                        <option key={s.profileId} value={s.profileId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Relationship</span>
                    <select value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)} className={inputCls}>
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </label>
                </>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
              >
                {busy ? "Saving…" : tab === "link" ? "Save link" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
