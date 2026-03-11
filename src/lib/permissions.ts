import { type Session } from "next-auth";

export type UserRole = "user" | "staff" | "admin";

/**
 * Check if user has a specific role
 */
export function hasRole(session: Session | null, roleName: UserRole): boolean {
  if (!session?.user?.role) return false;
  return session.user.role === roleName;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  session: Session | null,
  roles: UserRole[],
): boolean {
  if (!session?.user?.role) return false;
  return roles.includes(session.user.role as UserRole);
}

/**
 * Check if user has staff access (staff or admin role)
 */
export function hasStaffAccess(session: Session | null): boolean {
  return hasAnyRole(session, ["staff", "admin"]);
}

/**
 * Check if user has admin access
 */
export function hasAdminAccess(session: Session | null): boolean {
  return hasRole(session, "admin");
}

/**
 * Check if user can access events pages
 */
export function canAccessEvents(session: Session | null): boolean {
  return hasStaffAccess(session);
}

/**
 * Check if user can access contacts pages
 */
export function canAccessContacts(session: Session | null): boolean {
  return hasStaffAccess(session);
}

/**
 * Check if user can access import pages
 */
export function canAccessImports(session: Session | null): boolean {
  return hasStaffAccess(session);
}
