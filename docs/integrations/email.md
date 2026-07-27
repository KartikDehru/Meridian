# Email integration & template customization

Outgoing email is handled by the **communications** module
([`src/modules/communications/mailer.ts`](../../src/modules/communications/mailer.ts))
via SMTP, with all content coming from **database-backed, admin-editable
templates**.

## SMTP setup

Set in `.env`:

```bash
SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT=587                       # 465 switches to implicit TLS
SMTP_USER="apikey-or-username"
SMTP_PASSWORD="secret"
SMTP_FROM="Meridian LMS <no-reply@yourschool.org>"
```

Any provider with SMTP works (Postmark, SES, Mailgun, SendGrid, Gmail
Workspace…).

**No SMTP configured?** Nothing breaks: every send is recorded in the
delivery log with status `SKIPPED`, so the entire flow is testable locally.

## Templates

Templates are rows in `EmailTemplate`, editable at **Admin → Email**:

| Key | Sent when | Variables |
| --- | --- | --- |
| `welcome_student` | A student account is created | `studentName`, `admissionNo` |
| `welcome_parent` | A parent account is created | `parentName` |
| `activity_result` | A child's activity is graded (to each linked parent) | `parentName`, `studentName`, `activityTitle`, `score`, `maxScore` |
| `live_class_scheduled` | A live class is scheduled (to each student of the grade) | `studentName`, `classTitle`, `classTime` |
| `password_reset` | Staff resets a password | `name`, `tempPassword` |

- Both the **subject** and the **HTML body** support `{{variable}}`
  placeholders; unknown placeholders are left visible so mistakes are easy to
  spot.
- `{{appUrl}}` (from `APP_URL`) is always available for links.
- Templates can be **disabled** without deleting them — sends against a
  disabled/missing template are silently skipped.
- **Test send** renders the template with `[sample …]` values and mails it to
  any address you enter (logged and audited).

## Delivery log

Every message — sent, failed or skipped — is a row in `EmailLog` with the
recipient, subject, template key, status and error. The latest 50 are shown
under **Admin → Email → Delivery log**.

## Where emails are triggered in code

| Trigger | Template | Source |
| --- | --- | --- |
| `createStudent` / `createParent` | `welcome_*` | `src/modules/users/service.ts` |
| Auto-grade on submit & manual grading | `activity_result` | `src/modules/activities/service.ts` |
| `scheduleLiveClass` | `live_class_scheduled` | `src/modules/live-classes/service.ts` |

All sends are fire-and-forget (`void sendTemplatedEmail(...)`) — a slow or
failing mail server never blocks a user-facing request.

## Adding a template

1. Insert a row (seed or Prisma Studio) with a unique `key`, subject, HTML
   body and a JSON `variables` array.
2. Call `sendTemplatedEmail("your_key", to, { ...variables })` from a module
   service.
3. It immediately appears in the Admin → Email editor.
