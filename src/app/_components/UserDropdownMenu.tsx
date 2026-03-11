"use client";

import {
  Menu,
  Avatar,
  Text,
  Group,
  Stack,
  Badge,
  Divider,
  rem,
} from "@mantine/core";
import {
  IconUser,
  IconEdit,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";

const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  staff: "orange",
  organizer: "violet",
  "floor lead": "teal",
  speaker: "blue",
  mentor: "green",
  sponsor: "yellow",
  resident: "grape",
  judge: "indigo",
};

function getRoleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? "gray";
}

interface UserDropdownMenuProps {
  session: Session;
}

export function UserDropdownMenu({ session }: UserDropdownMenuProps) {
  const params = useParams<{ eventId?: string }>();
  const eventId = params?.eventId;

  // Fetch user profile to get custom avatar
  const { data: profile } = api.profile.getMyProfile.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch event-specific roles when viewing an event
  const { data: eventRoles } = api.role.getMyRolesForEvent.useQuery(
    { eventId: eventId! },
    { enabled: !!eventId },
  );

  const handleSignOut = () => {
    void signOut();
  };

  // Compute role badges with loading/error fallback
  const roleBadges: string[] = (() => {
    if (eventId && eventRoles && eventRoles.length > 0) {
      return eventRoles;
    }
    if (eventId && !eventRoles) {
      // Event page but roles still loading/errored — show global role as fallback
      if (session.user.role && session.user.role !== "user") {
        return [session.user.role];
      }
      return [];
    }
    // Not on event page — show global role
    if (!eventId && session.user.role && session.user.role !== "user") {
      return [session.user.role];
    }
    return [];
  })();

  // Determine avatar URL with priority logic
  const avatarUrl = getAvatarUrl({
    customAvatarUrl: profile?.avatarUrl,
    oauthImageUrl: session.user.image,
    name: session.user.name,
    email: session.user.email,
  });

  const avatarInitials = getAvatarInitials({
    name: session.user.name,
    email: session.user.email,
  });

  return (
    <Menu shadow="md" width={220} position="bottom-end">
      <Menu.Target>
        <Group gap="xs" style={{ cursor: "pointer" }}>
          <Stack gap={0} align="flex-end">
            <Group gap="xs">
              <Text size="sm" fw={500}>
                {getDisplayName(session.user)}
              </Text>
              <Avatar src={avatarUrl} radius="xl" size={32}>
                {avatarInitials}
              </Avatar>
            </Group>
            {roleBadges.length > 0 && (
              <Group gap={4}>
                {roleBadges.map((role) => (
                  <Badge
                    key={role}
                    size="xs"
                    color={getRoleColor(role)}
                    variant="light"
                  >
                    {role.toUpperCase()}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Group>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Profile</Menu.Label>

        <Menu.Item
          leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href={`/profiles/${session.user.id}`}
        >
          View Profile
        </Menu.Item>

        <Menu.Item
          leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href="/profile/edit"
        >
          Edit Profile
        </Menu.Item>

        {/* <Divider />

        <Menu.Label>Community</Menu.Label> */}

        {/* <Menu.Item 
          leftSection={<IconUsers style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href="/profiles"
        >
          Member Directory
        </Menu.Item> */}

        {/* Admin items */}
        {(session.user.role === "admin" || session.user.role === "staff") && (
          <>
            <Divider />
            <Menu.Label>Administration</Menu.Label>

            <Menu.Item
              leftSection={
                <IconSettings style={{ width: rem(14), height: rem(14) }} />
              }
              component={Link}
              href="/admin"
            >
              Admin Dashboard
            </Menu.Item>
          </>
        )}

        <Divider />

        <Menu.Item
          color="red"
          leftSection={
            <IconLogout style={{ width: rem(14), height: rem(14) }} />
          }
          onClick={handleSignOut}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
