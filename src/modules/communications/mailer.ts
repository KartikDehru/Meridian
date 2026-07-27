import nodemailer from "nodemailer";
import { db } from "@/lib/db";

/**
 * Outgoing email with customizable templates.
 *
 * Templates live in the database (EmailTemplate) and are editable from the
 * Admin portal. Rendering replaces `{{variable}}` placeholders. When SMTP is
 * not configured the message is recorded in the EmailLog with status SKIPPED
 * so the full flow remains testable locally. See docs/integrations/email.md.
 */

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  // Variable values are HTML-escaped: user-controlled data (names, titles)
  // must never inject markup into emails. Template HTML itself is
  // admin-authored and trusted.
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
    name in variables ? escapeHtml(String(variables[name])) : `{{${name}}}`,
  );
}

async function deliver(to: string, subject: string, html: string, templateKey?: string) {
  if (!smtpConfigured()) {
    await db.emailLog.create({
      data: { to, subject, templateKey, status: "SKIPPED", error: "SMTP not configured" },
    });
    return { sent: false as const, reason: "SMTP not configured" };
  }
  try {
    await transporter().sendMail({
      from: process.env.SMTP_FROM ?? "Meridian LMS <no-reply@meridian.school>",
      to,
      subject,
      html,
    });
    await db.emailLog.create({
      data: { to, subject, templateKey, status: "SENT" },
    });
    return { sent: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.emailLog.create({
      data: { to, subject, templateKey, status: "FAILED", error: message },
    });
    return { sent: false as const, reason: message };
  }
}

/**
 * Send an email using a database template identified by its key.
 * Silently skips when the template is missing or disabled.
 */
export async function sendTemplatedEmail(
  templateKey: string,
  to: string,
  variables: Record<string, string | number>,
) {
  const template = await db.emailTemplate.findUnique({ where: { key: templateKey } });
  if (!template || !template.isActive) {
    return { sent: false as const, reason: "Template missing or inactive" };
  }
  const vars = { ...variables, appUrl: process.env.APP_URL ?? "http://localhost:3000" };
  const subject = renderTemplate(template.subject, vars);
  const html = renderTemplate(template.bodyHtml, vars);
  return deliver(to, subject, html, templateKey);
}

/** Send a raw (non-templated) email — used for template test-sends. */
export async function sendRawEmail(to: string, subject: string, html: string) {
  return deliver(to, subject, html);
}
