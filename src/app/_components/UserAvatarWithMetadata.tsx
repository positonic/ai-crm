"use client";

import { Group, Stack, Text, Badge, type AvatarProps } from "@mantine/core";
import { UserAvatar } from "./UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";

interface UserMetadataData {
  customAvatarUrl?: string | null;
  oauthImageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  surname?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  role?: string | null;
}

interface UserAvatarWithMetadataProps {
  user: UserMetadataData;
  avatarSize?: AvatarProps["size"];
  avatarRadius?: AvatarProps["radius"];
  showJobTitle?: boolean;
  showCompany?: boolean;
  showRole?: boolean;
  showEmail?: boolean;
  orientation?: "horizontal" | "vertical";
  nameSize?: "xs" | "sm" | "md" | "lg" | "xl";
  nameFontWeight?: number;
}

/**
 * Reusable component that displays user avatar with metadata
 * Matches the styling pattern from timeline updates
 */
export function UserAvatarWithMetadata({
  user,
  avatarSize = "md",
  avatarRadius = "xl",
  showJobTitle = false,
  showCompany = false,
  showRole = false,
  showEmail = false,
  orientation = "horizontal",
  nameSize = "sm",
  nameFontWeight = 500,
}: UserAvatarWithMetadataProps) {
  const displayName = getDisplayName(
    {
      name: user.name,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
    },
    "Unknown User",
  );

  const metadataLines: string[] = [];

  if (showJobTitle && user.jobTitle) {
    metadataLines.push(user.jobTitle);
  }

  if (showCompany && user.company) {
    metadataLines.push(user.company);
  }

  const Container = orientation === "horizontal" ? Group : Stack;
  const containerProps =
    orientation === "horizontal"
      ? { gap: "sm", align: "center" }
      : { gap: 4, align: "center" };

  return (
    <Container {...containerProps}>
      <UserAvatar
        user={{
          customAvatarUrl: user.customAvatarUrl,
          oauthImageUrl: user.oauthImageUrl,
          name: user.name,
          email: user.email,
          firstName: user.firstName,
          surname: user.surname,
        }}
        size={avatarSize}
        radius={avatarRadius}
      />
      <Stack gap={2}>
        <Group gap="xs" align="center">
          <Text size={nameSize} fw={nameFontWeight}>
            {displayName}
          </Text>
          {showRole && user.role && (
            <Badge size="xs" variant="light" color="blue">
              {user.role}
            </Badge>
          )}
        </Group>
        {metadataLines.length > 0 && (
          <Text size="xs" c="dimmed">
            {metadataLines.join(" • ")}
          </Text>
        )}
        {showEmail && user.email && (
          <Text size="xs" c="dimmed">
            {user.email}
          </Text>
        )}
      </Stack>
    </Container>
  );
}
