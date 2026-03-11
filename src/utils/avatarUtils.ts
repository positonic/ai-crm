/**
 * Utility functions for avatar display logic
 */

export interface AvatarData {
  customAvatarUrl?: string | null;
  oauthImageUrl?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Get the best available avatar URL with fallback priority:
 * 1. Custom uploaded avatar (profile.avatarUrl)
 * 2. OAuth provider image (user.image)
 * 3. null (will show initials)
 */
export function getAvatarUrl(data: AvatarData): string | null {
  // Priority 1: Custom uploaded avatar
  if (data.customAvatarUrl) {
    return data.customAvatarUrl;
  }

  // Priority 2: OAuth provider image
  if (data.oauthImageUrl) {
    return data.oauthImageUrl;
  }

  // Priority 3: No image (will show initials fallback)
  return null;
}

/**
 * Get fallback initials for avatar display
 */
export function getAvatarInitials(data: AvatarData): string {
  if (data.name) {
    const nameParts = data.name.trim().split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0]![0]?.toUpperCase() ?? ""}${nameParts[nameParts.length - 1]![0]?.toUpperCase() ?? ""}`;
    }
    return nameParts[0]![0]?.toUpperCase() ?? "";
  }

  if (data.email) {
    return data.email[0]?.toUpperCase() ?? "U";
  }

  return "U";
}

/**
 * Get avatar source description for UI display
 */
export function getAvatarSourceDescription(data: AvatarData): string {
  if (data.customAvatarUrl) {
    return "Custom avatar";
  }

  if (data.oauthImageUrl) {
    return "OAuth provider image";
  }

  return "Initials";
}
