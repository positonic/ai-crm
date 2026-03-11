"use client";

import { useState } from "react";
import {
  Button,
  Group,
  Text,
  Alert,
  Paper,
  Stack,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconShieldCheck,
  IconShieldX,
  IconTrash,
  IconClock,
  IconSettings,
  IconInfoCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import TelegramSetupModal from "./TelegramSetupModal";

interface TelegramAuthStatusProps {
  onAuthChanged?: () => void;
}

export default function TelegramAuthStatus({
  onAuthChanged,
}: TelegramAuthStatusProps) {
  const [setupModalOpened, setSetupModalOpened] = useState(false);

  const { data: authStatus, refetch } =
    api.telegramAuth.getAuthStatus.useQuery();
  const deleteAuth = api.telegramAuth.deleteAuth.useMutation();

  const handleDeleteAuth = async () => {
    if (
      confirm(
        "Are you sure you want to remove your Telegram authentication? You'll need to set it up again to import contacts.",
      )
    ) {
      try {
        await deleteAuth.mutateAsync();
        await refetch();
        onAuthChanged?.();
      } catch (error) {
        console.error("Failed to delete Telegram auth:", error);
      }
    }
  };

  const handleSetupSuccess = async () => {
    await refetch();
    onAuthChanged?.();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!authStatus?.isAuthenticated) {
    return (
      <>
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Group>
              <IconShieldX size={20} color="var(--mantine-color-yellow-6)" />
              <Text fw={500} size="sm">
                Telegram Not Connected
              </Text>
            </Group>

            <Text size="xs" c="dimmed">
              Set up Telegram authentication to import your contacts
              automatically.
            </Text>

            <Button
              size="xs"
              variant="light"
              leftSection={<IconSettings size={14} />}
              onClick={() => setSetupModalOpened(true)}
            >
              Set Up Telegram
            </Button>
          </Stack>
        </Paper>

        <TelegramSetupModal
          opened={setupModalOpened}
          onClose={() => setSetupModalOpened(false)}
          onSuccess={handleSetupSuccess}
        />
      </>
    );
  }

  const daysUntilExpiry = authStatus.expiresAt
    ? getDaysUntilExpiry(authStatus.expiresAt)
    : 0;
  const isExpiringSoon = daysUntilExpiry <= 7;

  return (
    <>
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <IconShieldCheck size={20} color="var(--mantine-color-green-6)" />
              <Text fw={500} size="sm">
                Telegram Connected
              </Text>
            </Group>

            <Group gap="xs">
              <Tooltip label="Reconnect Telegram">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => setSetupModalOpened(true)}
                >
                  <IconSettings size={14} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Remove Telegram authentication">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={handleDeleteAuth}
                  loading={deleteAuth.isPending}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Group gap="xs">
            <IconClock size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              Expires in {daysUntilExpiry} days (
              {authStatus.expiresAt ? formatDate(authStatus.expiresAt) : "N/A"})
            </Text>
          </Group>

          {isExpiringSoon && (
            <Alert
              icon={<IconInfoCircle size={14} />}
              color="yellow"
              variant="light"
            >
              <Text size="xs">
                Your Telegram authentication expires soon. Consider setting up a
                new connection.
              </Text>
            </Alert>
          )}

          <Text size="xs" c="dimmed">
            Connected on{" "}
            {authStatus.createdAt
              ? formatDate(authStatus.createdAt)
              : "Unknown"}
            {authStatus.updatedAt &&
              authStatus.createdAt &&
              authStatus.updatedAt !== authStatus.createdAt &&
              ` • Updated ${formatDate(authStatus.updatedAt)}`}
          </Text>
        </Stack>
      </Paper>

      <TelegramSetupModal
        opened={setupModalOpened}
        onClose={() => setSetupModalOpened(false)}
        onSuccess={handleSetupSuccess}
      />
    </>
  );
}
