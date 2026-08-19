import type { Role } from "@prisma/client";

/**
 * Central role-based access control matrix.
 *
 * Permissions are named `<module>.<action>`. Every API handler and server
 * action declares the permission it requires; the matrix below is the single
 * source of truth for which role can do what (see docs/roles-and-permissions.md).
 */
export type Permission =
  | "users.read"
  | "users.manage"
  | "admins.manage"
  | "curriculum.read"
  | "curriculum.manage"
  | "activities.attempt"
  | "activities.grade"
  | "enrollment.manage"
  | "live-classes.read"
  | "live-classes.manage"
  | "analytics.own-children"
  | "analytics.platform"
  | "email.manage"
  | "announcements.manage"
  | "settings.manage"
  | "audit.read";

const MATRIX: Record<Role, Permission[]> = {
  STUDENT: ["curriculum.read", "activities.attempt", "live-classes.read"],
  PARENT: ["analytics.own-children", "live-classes.read"],
  ADMIN: [
    "users.read",
    "users.manage",
    "curriculum.read",
    "curriculum.manage",
    "activities.grade",
    "enrollment.manage",
    "live-classes.read",
    "live-classes.manage",
    "analytics.platform",
    "email.manage",
    "announcements.manage",
  ],
  SUPER_ADMIN: [
    "users.read",
    "users.manage",
    "admins.manage",
    "curriculum.read",
    "curriculum.manage",
    "activities.grade",
    "enrollment.manage",
    "live-classes.read",
    "live-classes.manage",
    "analytics.platform",
    "email.manage",
    "announcements.manage",
    "settings.manage",
    "audit.read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role] ?? [];
}

/** The portal a role lands on after login. */
export function homePathFor(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "/student";
    case "PARENT":
      return "/parent";
    case "ADMIN":
      return "/admin";
    case "SUPER_ADMIN":
      return "/superadmin";
  }
}
