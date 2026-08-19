# Zoom integration

Live classes integrate with Zoom through a **Server-to-Server OAuth** app —
no per-user OAuth dance, one set of account credentials. Implementation:
[`src/modules/live-classes/zoom.ts`](../../src/modules/live-classes/zoom.ts).

## Modes

| Mode | When | Behavior |
| --- | --- | --- |
| **zoom** | All three env vars set | Scheduling a class creates a real Zoom meeting; the class stores `zoomMeetingId`, `joinUrl`, `startUrl` (host) and `passcode`. Cancelling the class deletes the meeting |
| **manual** | Any env var missing | The scheduler pastes an existing meeting link (Zoom, Meet, anything). Everything else — notifications, attendance, join flow — works identically |

The active mode is shown on the Admin → Live Classes page and on the Super
Admin → Overview integration card.

## Setting up the Zoom app

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/) →
   **Develop → Build App → Server-to-Server OAuth**.
2. From the app's credentials page copy:
   - **Account ID** → `ZOOM_ACCOUNT_ID`
   - **Client ID** → `ZOOM_CLIENT_ID`
   - **Client Secret** → `ZOOM_CLIENT_SECRET`
3. Under **Scopes**, add `meeting:write:admin` (create/delete meetings).
4. Activate the app, set the three variables in `.env`, restart the server.

## What Meridian does with the API

- **Token caching**: the OAuth access token (valid ~1 h) is cached in memory
  and refreshed 30 s before expiry — one token request per hour, not per
  meeting.
- **Meeting creation** (`POST /users/me/meetings`) with safe defaults for a
  classroom: waiting room on, join-before-host off, participants muted on
  entry.
- **Meeting deletion** when a class is cancelled (404s are tolerated).

## Attendance flow

1. Scheduling a class pre-creates an `ABSENT` attendance row for every active
   student of the grade and sends each one an in-app notification + the
   `live_class_scheduled` email.
2. The student's **Join class** button calls
   `POST /api/v1/live-classes/:id/join`, which flips their row to `PRESENT`
   (or `LATE` when joining more than the configured threshold after start —
   default 10 minutes, adjustable in Super Admin → Settings) and returns the
   join URL, which opens in a new tab.
3. Joining is allowed from 10 minutes before the start until the scheduled
   end. Admins see per-class attendance counts; parents see their child's
   aggregate attendance donut.

## Security notes

- The host `startUrl` is only ever returned to admins/super admins.
- Zoom credentials never leave the server; students receive only the join URL
  and passcode for their own grade's classes.
