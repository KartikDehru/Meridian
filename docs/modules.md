# Modules

Meridian is composed of eight self-contained domain modules under
`src/modules/`. The registry (`src/modules/registry.ts`) is the machine-readable
manifest rendered on the Super Admin → Modules screen. This page is the
human-readable version.

---

## `auth` — Authentication

`src/modules/auth/service.ts`

- `login(email, password, ip)` — verifies credentials, updates `lastLoginAt`,
  writes `auth.login` / `auth.login_failed` audit entries and mints the
  session JWT.
- Constant-shape verification: a bcrypt compare runs even for unknown emails
  so response timing does not reveal whether an account exists.
- Rate limiting is applied at the route (10 attempts / 5 min / IP).

## `users` — Users & Access

`src/modules/users/service.ts`

- `createStudent` / `createParent` / `createAdmin` — zod-validated creation
  with password policy, deterministic avatar colors, auto-generated admission
  numbers (`MRD-#####`) and welcome emails.
- `linkParentChild` — maintains the many-to-many family graph with
  relationship labels; parents can have multiple children.
- `childrenOfParent` / `assertParentOfStudent` — the ownership helpers every
  parent-facing feature is built on.
- `setUserActive` — soft enable/disable (disabled users cannot log in).
- Creating **admin** accounts additionally requires the `admins.manage`
  permission (super admin only).

## `curriculum` — Subjects, Courses, Chapters, Lessons

`src/modules/curriculum/service.ts`

- Course CRUD with unique slug generation and publish/unpublish.
- Chapter and lesson creation with automatic `sortOrder`.
- `courseTree` — the full course → chapters → lessons (+ published
  activities) tree used by both the student course page and the admin
  course manager.
- Lesson content is markdown, rendered by the escaping-first renderer in
  `src/lib/markdown.ts` (no raw HTML ever reaches the page).

## `activities` — Activities & Assessment

`src/modules/activities/service.ts`

- Activity CRUD (quiz / assignment / worksheet / project) with max/pass
  scores, optional time limit and due date.
- Question authoring (MCQ / true-false / short answer) with option and
  answer-key validation.
- **Attempt flow**: `startAttempt` (requires enrollment, one open attempt per
  activity), `submitAttempt` (auto-grades objective questions, proportional to
  points; free-form submissions become `SUBMITTED`).
- **Grading**: `pendingGrading` queue, `gradeAttempt` with feedback — both
  notify the student and every linked parent (in-app + templated email).

## `enrollment` — Enrollment & Progress

`src/modules/enrollment/service.ts`

- Enroll / unenroll a student, or bulk-enroll an entire grade into a course.
- `coursesForStudent` — enrolled courses with per-course completion counts.
- `recordLessonProgress` — upserts progress, accumulates time spent, stamps
  completion.

## `live-classes` — Live Classes (Zoom)

`src/modules/live-classes/service.ts`, `zoom.ts`

- `scheduleLiveClass` — creates a Zoom meeting via **Server-to-Server OAuth**
  when configured (waiting room, mute on entry, no join-before-host), or
  stores a manually pasted link. Pre-creates `ABSENT` attendance rows for the
  whole grade and notifies each student (in-app + email).
- `joinLiveClass` — flips attendance to `PRESENT` / `LATE` (threshold
  configurable) and returns the join URL. Students can join from 10 minutes
  before start.
- Status management (`LIVE`, `ENDED`, `CANCELLED` — cancelling also deletes
  the Zoom meeting) and per-class attendance listing.
- Host-only fields (`startUrl`) are stripped from non-admin API responses.

## `communications` — Email, Announcements, Notifications

`src/modules/communications/service.ts`, `mailer.ts`

- **Templates**: DB-backed, editable in the admin portal, `{{variable}}`
  interpolation, enable/disable, test-send with sample values.
- **Delivery**: nodemailer via SMTP env vars; every message is recorded in
  the `EmailLog` (`SENT` / `FAILED` / `SKIPPED` when SMTP is absent).
- **Announcements**: audience targeting (everyone / students / parents /
  admins / a single grade), pinning, role-scoped feeds.
- **Notifications**: in-app bell with unread counts and mark-as-read.

## `analytics` — Family & Platform Insight

`src/modules/analytics/service.ts`

- `childStats(profileId)` — the parent dashboard payload: average score,
  graded/pending counts, lesson completion, learning time, attendance
  percentage, **score trend** (chronological graded results), **subject
  averages**, per-course progress and the recent-results table.
- `platformStats()` — admin/super-admin overview: user counts, content
  counts, platform-wide average score, upcoming classes, emails sent,
  students-per-grade distribution.

## `platform` — Settings, Registry, Audit

`src/modules/platform/service.ts`

- Typed runtime settings with defaults (platform name, academic year, pass
  percentage, late threshold) — editable by the super admin.
- `integrationStatus()` — live health of Zoom / SMTP / DB configuration.
- `listAuditLogs` — filterable view over the append-only audit trail.
