/**
 * Zoom integration — Server-to-Server OAuth.
 *
 * Requires a Zoom "Server-to-Server OAuth" app with the
 * `meeting:write:admin` scope. Configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID and
 * ZOOM_CLIENT_SECRET. When unset, the live-classes module falls back to
 * "manual" mode where the scheduler pastes a meeting link.
 * See docs/integrations/zoom.md.
 */

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

export function zoomConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET,
  );
}

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(
    `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
    },
  );
  if (!res.ok) {
    throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface ZoomMeeting {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  passcode: string;
}

/** Create a scheduled Zoom meeting under the account's primary user. */
export async function createZoomMeeting(opts: {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  agenda?: string;
}): Promise<ZoomMeeting> {
  const token = await accessToken();
  const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: opts.topic,
      type: 2, // scheduled meeting
      start_time: opts.startTime.toISOString(),
      duration: opts.durationMinutes,
      agenda: opts.agenda ?? "",
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        approval_type: 2,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Zoom meeting creation failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
    password?: string;
  };
  return {
    meetingId: String(data.id),
    joinUrl: data.join_url,
    startUrl: data.start_url,
    passcode: data.password ?? "",
  };
}

/** Delete a Zoom meeting (used when a class is cancelled). */
export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  const token = await accessToken();
  const res = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Zoom meeting deletion failed: ${res.status}`);
  }
}
