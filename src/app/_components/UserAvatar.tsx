"use client";

import { Avatar, type AvatarProps } from "@mantine/core";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName, getFullName } from "~/utils/userDisplay";

interface UserData {
  customAvatarUrl?: string | null;
  oauthImageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  surname?: string | null;
}

interface UserAvatarProps
  extends Omit<AvatarProps, "src" | "alt" | "children"> {
  user: UserData;
  showInitials?: boolean;
}

/**
 * Reusable avatar component that consistently handles:
 * - Custom uploaded avatars
 * - OAuth provider images
 * - Fallback initials when no image available
 * - Proper alt text for accessibility
 */
export function UserAvatar({
  user,
  showInitials = true,
  ...avatarProps
}: UserAvatarProps) {
  const avatarUrl = getAvatarUrl({
    customAvatarUrl: user.customAvatarUrl,
    oauthImageUrl: user.oauthImageUrl,
    name: user.name,
    email: user.email,
  });

  const avatarInitials = showInitials
    ? getAvatarInitials({
        name: getFullName(user),
        email: user.email,
      })
    : "";

  const displayName = getDisplayName(
    {
      name: user.name,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
    },
    "User",
  );

  return (
    <Avatar src={avatarUrl} alt={displayName} {...avatarProps}>
      {avatarInitials}
    </Avatar>
  );
}
