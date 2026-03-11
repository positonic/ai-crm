/**
 * Utility functions for displaying user information
 */

export interface UserNameFields {
  firstName?: string | null;
  surname?: string | null;
  name?: string | null; // Legacy field for backwards compatibility
  email?: string | null;
}

/**
 * Get the full name of a user from firstName and surname fields
 * Falls back to legacy name field if firstName/surname not available
 *
 * @param user - User object with firstName, surname, and optional legacy name field
 * @returns Full name string or null if no name available
 *
 * @example
 * getFullName({ firstName: "John", surname: "Doe" }) // "John Doe"
 * getFullName({ firstName: "Madonna", surname: "" }) // "Madonna"
 * getFullName({ firstName: "John", surname: null }) // "John"
 * getFullName({ name: "Legacy User" }) // "Legacy User"
 * getFullName({}) // null
 */
export function getFullName(
  user: UserNameFields | null | undefined,
): string | null {
  if (!user) return null;

  // Try firstName + surname first (new fields)
  if (user.firstName ?? user.surname) {
    return `${user.firstName ?? ""} ${user.surname ?? ""}`.trim();
  }

  // Fall back to legacy name field
  if (user.name) {
    return user.name;
  }

  return null;
}

/**
 * Get display name for a user with fallback chain
 * Falls back to email if no name available
 *
 * @param user - User object with name fields and email
 * @param fallback - Custom fallback text (default: "Anonymous")
 * @returns Display name string
 *
 * @example
 * getDisplayName({ firstName: "John", surname: "Doe" }) // "John Doe"
 * getDisplayName({ email: "user@example.com" }) // "user@example.com"
 * getDisplayName({}) // "Anonymous"
 * getDisplayName({}, "Unknown User") // "Unknown User"
 */
export function getDisplayName(
  user: UserNameFields | null | undefined,
  fallback = "Anonymous",
): string {
  const fullName = getFullName(user);
  if (fullName) return fullName;

  if (user?.email) return user.email;

  return fallback;
}

/**
 * Get initials from user's name
 *
 * @param user - User object with name fields
 * @returns Initials string (e.g., "JD" for "John Doe")
 *
 * @example
 * getInitials({ firstName: "John", surname: "Doe" }) // "JD"
 * getInitials({ firstName: "Madonna" }) // "M"
 * getInitials({ name: "John Doe" }) // "JD"
 * getInitials({}) // ""
 */
export function getInitials(user: UserNameFields | null | undefined): string {
  if (!user) return "";

  // Try firstName + surname first
  if (user.firstName ?? user.surname) {
    const firstInitial = user.firstName?.[0] ?? "";
    const lastInitial = user.surname?.[0] ?? "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  // Fall back to legacy name field
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0]?.[0]?.toUpperCase() ?? "";
    }
    const firstInitial = parts[0]?.[0] ?? "";
    const lastInitial = parts[parts.length - 1]?.[0] ?? "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  return "";
}
