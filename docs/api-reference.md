# API reference

All endpoints live under `/api/v1` and speak JSON with a shared envelope:

```jsonc
// success
{ "ok": true, "data": { /* … */ } }
// failure
{ "ok": false, "error": { "message": "…", "details": [ { "path": "field", "message": "…" } ] } }
```

Authentication uses the `meridian_session` httpOnly cookie set by the login
endpoint. Status codes: `401` unauthenticated, `403` forbidden, `404` not
found, `422` validation failure, `429` rate limited.

The **Permission** column refers to the [RBAC matrix](roles-and-permissions.md).

---

## Auth

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | public (rate limited: 10 / 5 min / IP) | Body `{ email, password }`. Sets the session cookie; returns `{ user, redirectTo }` |
| `POST` | `/auth/logout` | session | Clears the cookie, audits the logout |
| `GET` | `/auth/me` | session | Current user + resolved permission list |
| `GET` | `/health` | public | Liveness probe |

## Users & family

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/users?role=STUDENT&search=…` | `users.read` | List users (max 200) with student/parent profiles and family links |
| `POST` | `/users` | `users.manage` (+`admins.manage` for `kind:"admin"`) | Discriminated body: `{ kind: "student", …, gradeLevel, section?, parentLinks: [{parentProfileId, relationship}] }` \| `{ kind: "parent", …, phone? }` \| `{ kind: "admin", … }`. All kinds share `email, password, firstName, lastName` |
| `PATCH` | `/users/:id` | `users.manage` | `{ isActive: boolean }` — soft enable/disable |
| `POST` | `/parents/links` | `users.manage` | `{ parentProfileId, studentProfileId, relationship }` — link (or relabel) a parent-child pair |

## Curriculum

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/subjects` | `curriculum.read` | Subject catalog with course counts |
| `GET` | `/courses?gradeLevel=&subjectId=` | `curriculum.read` | Course list (students automatically see published only) |
| `POST` | `/courses` | `curriculum.manage` | `{ title, description?, subjectId, gradeLevel, coverColor?, isPublished? }` |
| `GET` | `/courses/:idOrSlug` | `curriculum.read` | Full course tree (chapters → lessons → activities) |
| `PATCH` | `/courses/:id` | `curriculum.manage` | Partial course update (e.g. `{ isPublished: true }`) |
| `DELETE` | `/courses/:id` | `curriculum.manage` | Delete course (cascades) |
| `POST` | `/courses/:id/chapters` | `curriculum.manage` | `{ title, description? }` — appended in order |
| `DELETE` | `/chapters/:id` | `curriculum.manage` | Delete chapter (cascades lessons) |
| `POST` | `/chapters/:id/lessons` | `curriculum.manage` | `{ title, contentType, content?, videoUrl?, durationMinutes?, isPublished? }` |
| `PATCH` | `/lessons/:id` | `curriculum.manage` | Partial lesson update |
| `DELETE` | `/lessons/:id` | `curriculum.manage` | Delete lesson |
| `POST` | `/lessons/:id/progress` | `curriculum.read` (students) | `{ completed: boolean, minutes? }` — upserts the caller's progress |

## Activities & grading

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `POST` | `/activities` | `curriculum.manage` | `{ courseId, lessonId?, title, type, instructions?, maxScore?, passScore?, timeLimitMinutes?, dueAt?, isPublished? }` |
| `GET` | `/activities/:id` | `curriculum.read` | Activity + ordered questions. **Answer keys are stripped for students** |
| `PATCH` | `/activities/:id` | `curriculum.manage` | Partial update (e.g. publish) |
| `DELETE` | `/activities/:id` | `curriculum.manage` | Delete activity |
| `POST` | `/activities/:id/questions` | `curriculum.manage` | `{ prompt, type, options?, correctAnswer, points? }` — MCQ requires ≥2 options; the key must be an option |
| `DELETE` | `/questions/:id` | `curriculum.manage` | Delete question |
| `POST` | `/activities/:id/attempts` | `activities.attempt` | Start (or resume) the caller's attempt — requires enrollment and a published activity |
| `POST` | `/attempts/:id/submit` | `activities.attempt` | `{ answers: { [questionId]: string } }` (or `{ response }` for free-form). Objective questions auto-grade; parents get notified |
| `POST` | `/attempts/:id/grade` | `activities.grade` | `{ score, feedback? }` — manual grading; notifies student + parents |

## Enrollment

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `POST` | `/enrollments` | `enrollment.manage` | `{ action: "enroll" \| "unenroll", studentProfileId, courseId }` or `{ action: "enroll-grade", courseId }` (bulk-enroll the course's grade) |

## Live classes

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/live-classes?upcoming=true&gradeLevel=` | `live-classes.read` | Students are auto-scoped to their grade; `startUrl` only for admins |
| `POST` | `/live-classes` | `live-classes.manage` | `{ title, description?, courseId?, gradeLevel, startTime, durationMinutes?, manualJoinUrl? }`. Creates a Zoom meeting when configured, pre-creates attendance, notifies students |
| `POST` | `/live-classes/:id/join` | `live-classes.read` | Marks the caller `PRESENT`/`LATE` and returns `{ joinUrl, passcode }` |
| `POST` | `/live-classes/:id/status` | `live-classes.manage` | `{ status: "LIVE" \| "ENDED" \| "CANCELLED" \| "SCHEDULED" }` — cancelling also deletes the Zoom meeting |

## Communications

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/email-templates` | `email.manage` | All templates |
| `PATCH` | `/email-templates/:key` | `email.manage` | `{ name?, description?, subject?, bodyHtml?, isActive? }` |
| `POST` | `/email-templates/:key/test` | `email.manage` | `{ to }` — renders with sample values and sends |
| `GET` | `/announcements` | session | Feed scoped to the caller's role (and grade for students) |
| `POST` | `/announcements` | `announcements.manage` | `{ title, body, audience, gradeLevel?, isPinned? }` |
| `DELETE` | `/announcements/:id` | `announcements.manage` | Delete |
| `GET` | `/notifications` | session | Caller's latest notifications |
| `POST` | `/notifications` | session | Mark all of the caller's notifications read |

## Analytics

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/analytics/children/:profileId` | parent (own child) or admin | The full `ChildStats` payload: overview, score trend, subject averages, course progress, recent attempts, attendance |
| `GET` | `/analytics/platform` | `analytics.platform` | Platform-wide stats + students-per-grade distribution |

## Platform

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/settings` | `settings.manage` | Runtime settings with defaults applied |
| `PATCH` | `/settings` | `settings.manage` | `{ [key]: value }` — unknown keys are ignored |
| `GET` | `/audit-logs?action=&limit=` | `audit.read` | Filterable audit trail (newest first) |

---

## Example session

```bash
# Log in (cookie jar)
curl -c jar -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@meridian.school","password":"Passw0rd!"}'

# Create a course
curl -b jar -X POST http://localhost:3000/api/v1/courses \
  -H 'Content-Type: application/json' \
  -d '{"title":"Art — Grade 3","subjectId":"<id>","gradeLevel":3}'

# Bulk-enroll the grade
curl -b jar -X POST http://localhost:3000/api/v1/enrollments \
  -H 'Content-Type: application/json' \
  -d '{"action":"enroll-grade","courseId":"<id>"}'
```
