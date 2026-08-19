/**
 * Module registry — the Frappe-inspired backbone of Meridian.
 *
 * Every domain capability lives in a self-contained module under
 * `src/modules/<name>` exposing a service layer. This manifest describes
 * each module so the platform (and the Super Admin "Modules" screen) can
 * introspect what is installed, which models it owns and which permissions
 * it defines. See docs/architecture.md and docs/modules.md.
 */

export interface ModuleManifest {
  name: string;
  title: string;
  description: string;
  icon: string;
  models: string[];
  permissions: string[];
  routes: string[];
}

export const MODULES: ModuleManifest[] = [
  {
    name: "users",
    title: "Users & Access",
    description:
      "Accounts, role-based access control, student/parent profiles and the parent-child graph.",
    icon: "users",
    models: ["User", "StudentProfile", "ParentProfile", "ParentChildLink"],
    permissions: ["users.read", "users.manage", "admins.manage"],
    routes: ["/api/v1/users", "/api/v1/auth/*"],
  },
  {
    name: "curriculum",
    title: "Curriculum",
    description:
      "Subjects, courses, chapters and lessons — the K-10 learning content tree.",
    icon: "book-open",
    models: ["Subject", "Course", "Chapter", "Lesson"],
    permissions: ["curriculum.read", "curriculum.manage"],
    routes: ["/api/v1/subjects", "/api/v1/courses/*"],
  },
  {
    name: "activities",
    title: "Activities & Assessment",
    description:
      "Quizzes, assignments, worksheets and projects with auto-grading and manual review.",
    icon: "clipboard-check",
    models: ["Activity", "Question", "ActivityAttempt"],
    permissions: ["activities.attempt", "activities.grade"],
    routes: ["/api/v1/activities/*", "/api/v1/attempts/*"],
  },
  {
    name: "enrollment",
    title: "Enrollment & Progress",
    description:
      "Course enrollment and per-lesson progress tracking for every student.",
    icon: "graduation-cap",
    models: ["Enrollment", "LessonProgress"],
    permissions: ["enrollment.manage"],
    routes: ["/api/v1/enrollments", "/api/v1/progress"],
  },
  {
    name: "live-classes",
    title: "Live Classes",
    description:
      "Zoom-integrated live class scheduling with per-student attendance.",
    icon: "video",
    models: ["LiveClass", "Attendance"],
    permissions: ["live-classes.read", "live-classes.manage"],
    routes: ["/api/v1/live-classes/*"],
  },
  {
    name: "communications",
    title: "Communications",
    description:
      "Customizable email templates, delivery log, announcements and in-app notifications.",
    icon: "mail",
    models: ["EmailTemplate", "EmailLog", "Announcement", "Notification"],
    permissions: ["email.manage", "announcements.manage"],
    routes: [
      "/api/v1/email-templates/*",
      "/api/v1/announcements",
      "/api/v1/notifications",
    ],
  },
  {
    name: "analytics",
    title: "Analytics",
    description:
      "Child performance dashboards for parents and platform-wide statistics for admins.",
    icon: "bar-chart",
    models: [],
    permissions: ["analytics.own-children", "analytics.platform"],
    routes: ["/api/v1/analytics/*"],
  },
  {
    name: "platform",
    title: "Platform",
    description:
      "Runtime settings, module registry and the immutable audit trail.",
    icon: "settings",
    models: ["Setting", "AuditLog"],
    permissions: ["settings.manage", "audit.read"],
    routes: ["/api/v1/settings", "/api/v1/audit-logs"],
  },
];
