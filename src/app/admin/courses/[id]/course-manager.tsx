"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/icons";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60";
const btnGhost =
  "rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50";

interface ManagedCourse {
  id: string;
  title: string;
  subject: string;
  gradeLabel: string;
  isPublished: boolean;
  chapters: Array<{
    id: string;
    title: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      contentType: string;
      durationMinutes: number;
      isPublished: boolean;
    }>;
  }>;
  activities: Array<{
    id: string;
    title: string;
    type: string;
    isPublished: boolean;
    questions: number;
    attempts: number;
    lessonId: string | null;
  }>;
}

export function CourseManager({ course }: { course: ManagedCourse }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, doneMessage?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (doneMessage) setNotice(doneMessage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Add-chapter form state
  const [chapterTitle, setChapterTitle] = useState("");
  // Add-lesson form state (one open form at a time)
  const [lessonFormChapter, setLessonFormChapter] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("ARTICLE");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonMinutes, setLessonMinutes] = useState(10);
  // Add-activity form state
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityType, setActivityType] = useState("QUIZ");
  const [activityLessonId, setActivityLessonId] = useState("");
  const [activityMaxScore, setActivityMaxScore] = useState(100);
  const [activityPassScore, setActivityPassScore] = useState(40);
  const [activityInstructions, setActivityInstructions] = useState("");

  const allLessons = course.chapters.flatMap((ch) =>
    ch.lessons.map((l) => ({ id: l.id, title: `${ch.title} · ${l.title}` })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{course.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {course.subject} · {course.gradeLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  api(`/api/v1/courses/${course.id}`, {
                    method: "PATCH",
                    body: { isPublished: !course.isPublished },
                  }),
                course.isPublished ? "Course unpublished." : "Course published.",
              )
            }
            className={btnPrimary}
          >
            {course.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  api("/api/v1/enrollments", {
                    method: "POST",
                    body: { action: "enroll-grade", courseId: course.id },
                  }),
                "All students of this grade are enrolled.",
              )
            }
            className={btnPrimary}
          >
            <Icon name="users" size={13} /> Enroll grade
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">{notice}</p>
      ) : null}

      {/* Chapters & lessons */}
      <section className="rounded-xl border border-border bg-surface shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Chapters &amp; lessons</h2>
        </div>

        {course.chapters.map((ch, i) => (
          <div key={ch.id} className="border-b border-border last:border-0">
            <div className="flex items-center justify-between bg-surface-hover/50 px-5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Chapter {i + 1}: <span className="text-foreground">{ch.title}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setLessonFormChapter(lessonFormChapter === ch.id ? null : ch.id)
                  }
                >
                  + Lesson
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={btnGhost}
                  onClick={() =>
                    run(() => api(`/api/v1/chapters/${ch.id}`, { method: "DELETE" }))
                  }
                >
                  Delete
                </button>
              </div>
            </div>

            {ch.lessons.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-2.5">
                <Icon
                  name={l.contentType === "VIDEO" ? "play" : "file-text"}
                  size={14}
                  className="shrink-0 text-muted"
                />
                <p className="min-w-0 flex-1 truncate text-sm">{l.title}</p>
                <span className="text-xs text-muted">
                  {l.contentType.toLowerCase()} · {l.durationMinutes}m
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className={btnGhost}
                  onClick={() =>
                    run(() => api(`/api/v1/lessons/${l.id}`, { method: "DELETE" }))
                  }
                >
                  Delete
                </button>
              </div>
            ))}

            {lessonFormChapter === ch.id ? (
              <form
                className="space-y-2 border-t border-dashed border-border px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      api(`/api/v1/chapters/${ch.id}/lessons`, {
                        method: "POST",
                        body: {
                          title: lessonTitle,
                          contentType: lessonType,
                          content: lessonContent,
                          videoUrl: lessonType === "VIDEO" && lessonVideoUrl ? lessonVideoUrl : null,
                          durationMinutes: lessonMinutes,
                        },
                      }),
                    "Lesson added.",
                  ).then(() => {
                    setLessonTitle("");
                    setLessonContent("");
                    setLessonVideoUrl("");
                  });
                }}
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    required
                    placeholder="Lesson title"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className={`${inputCls} sm:col-span-2`}
                  />
                  <select value={lessonType} onChange={(e) => setLessonType(e.target.value)} className={inputCls}>
                    <option value="ARTICLE">Article</option>
                    <option value="VIDEO">Video</option>
                    <option value="PDF">PDF</option>
                    <option value="INTERACTIVE">Interactive</option>
                  </select>
                </div>
                {lessonType === "VIDEO" ? (
                  <input
                    placeholder="Embed URL (e.g. https://www.youtube.com/embed/…)"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className={inputCls}
                  />
                ) : null}
                <textarea
                  rows={4}
                  placeholder="Lesson content (markdown: # heading, **bold**, - list)"
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  className={inputCls}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Duration
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={lessonMinutes}
                      onChange={(e) => setLessonMinutes(Number(e.target.value))}
                      className={`${inputCls} w-20`}
                    />
                    min
                  </label>
                  <button type="submit" disabled={busy} className={btnPrimary}>
                    Add lesson
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ))}

        <form
          className="flex gap-2 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                api(`/api/v1/courses/${course.id}/chapters`, {
                  method: "POST",
                  body: { title: chapterTitle },
                }),
              "Chapter added.",
            ).then(() => setChapterTitle(""));
          }}
        >
          <input
            required
            placeholder="New chapter title…"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            className={inputCls}
          />
          <button type="submit" disabled={busy} className={btnPrimary}>
            <Icon name="plus" size={13} /> Chapter
          </button>
        </form>
      </section>

      {/* Activities */}
      <section className="rounded-xl border border-border bg-surface shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Activities</h2>
          <button type="button" className={btnGhost} onClick={() => setActivityFormOpen((v) => !v)}>
            + Activity
          </button>
        </div>

        {activityFormOpen ? (
          <form
            className="space-y-2 border-b border-dashed border-border px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  api("/api/v1/activities", {
                    method: "POST",
                    body: {
                      courseId: course.id,
                      lessonId: activityLessonId || null,
                      title: activityTitle,
                      type: activityType,
                      instructions: activityInstructions,
                      maxScore: activityMaxScore,
                      passScore: activityPassScore,
                    },
                  }),
                "Activity created — add questions, then publish it.",
              ).then(() => {
                setActivityTitle("");
                setActivityInstructions("");
              });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                required
                placeholder="Activity title"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className={`${inputCls} sm:col-span-2`}
              />
              <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className={inputCls}>
                <option value="QUIZ">Quiz</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="WORKSHEET">Worksheet</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <select value={activityLessonId} onChange={(e) => setActivityLessonId(e.target.value)} className={inputCls}>
                <option value="">Whole course (no lesson)</option>
                {allLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-muted">
                Max
                <input
                  type="number"
                  min={1}
                  value={activityMaxScore}
                  onChange={(e) => setActivityMaxScore(Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                Pass
                <input
                  type="number"
                  min={0}
                  value={activityPassScore}
                  onChange={(e) => setActivityPassScore(Number(e.target.value))}
                  className={inputCls}
                />
              </label>
            </div>
            <textarea
              rows={2}
              placeholder="Instructions for students…"
              value={activityInstructions}
              onChange={(e) => setActivityInstructions(e.target.value)}
              className={inputCls}
            />
            <button type="submit" disabled={busy} className={btnPrimary}>
              Create activity
            </button>
          </form>
        ) : null}

        <div className="divide-y divide-border">
          {course.activities.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted">
              No activities yet — quizzes and assignments show up here.
            </p>
          ) : (
            course.activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${a.isPublished ? "bg-primary" : "bg-warning"}`}
                  title={a.isPublished ? "Published" : "Draft"}
                />
                <Link
                  href={`/admin/activities/${a.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                >
                  {a.title}
                </Link>
                <span className="text-xs text-muted">
                  {a.type} · {a.questions} questions · {a.attempts} attempts
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className={btnGhost}
                  onClick={() =>
                    run(
                      () =>
                        api(`/api/v1/activities/${a.id}`, {
                          method: "PATCH",
                          body: { isPublished: !a.isPublished },
                        }),
                    )
                  }
                >
                  {a.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={btnGhost}
                  onClick={() =>
                    run(() => api(`/api/v1/activities/${a.id}`, { method: "DELETE" }))
                  }
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
