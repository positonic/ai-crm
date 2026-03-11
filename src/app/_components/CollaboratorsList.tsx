"use client";

import {
  Group,
  Avatar,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Paper,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { getDisplayName } from "~/utils/userDisplay";

interface User {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Collaborator {
  id: string;
  userId: string;
  user: User;
  addedAt: Date;
}

interface CollaboratorsListProps {
  collaborators: Collaborator[];
  ownerId: string;
  currentUserId: string;
  isOwner: boolean;
  onRemove?: (userId: string) => void;
  loading?: boolean;
}

export function CollaboratorsList({
  collaborators,
  ownerId: _ownerId,
  currentUserId,
  isOwner,
  onRemove,
  loading = false,
}: CollaboratorsListProps) {
  if (collaborators.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          No collaborators yet
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="xs">
      {collaborators.map((collaborator) => {
        const isCurrentUser = collaborator.userId === currentUserId;
        const user = collaborator.user;

        return (
          <Paper key={collaborator.id} p="xs" withBorder>
            <Group justify="apart">
              <Group gap="sm">
                <Avatar
                  src={user.image}
                  alt={getDisplayName(user, "User")}
                  size="sm"
                />
                <div>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {getDisplayName(user, "Unknown")}
                      {isCurrentUser && (
                        <Text span c="dimmed" fw={400}>
                          {" "}
                          (You)
                        </Text>
                      )}
                    </Text>
                    <Badge size="xs" variant="light" color="blue">
                      Member
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {user.email}
                  </Text>
                </div>
              </Group>

              {isOwner && onRemove && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onRemove(collaborator.userId)}
                  disabled={loading}
                  aria-label="Remove collaborator"
                >
                  <IconX size={16} />
                </ActionIcon>
              )}
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
}
