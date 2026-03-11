"use client";

import {
  Modal,
  Group,
  Text,
  Avatar,
  Stack,
  Box,
  ActionIcon,
  Divider,
  Button,
  ScrollArea,
} from "@mantine/core";
import {
  IconMail,
  IconBrandTelegram,
  IconX,
  IconShare,
  IconCornerUpLeft,
  IconCornerUpRight,
  IconChevronDown,
} from "@tabler/icons-react";

interface MessageViewerModalProps {
  opened: boolean;
  onClose: () => void;
  message: {
    id: string;
    channel: string;
    subject?: string | null;
    textContent?: string | null;
    htmlContent?: string | null;
    fromEmail?: string | null;
    toEmail?: string | null;
    fromTelegram?: string | null;
    toTelegram?: string | null;
    sentAt?: Date | null;
    createdAt: Date;
    contact?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}

export default function MessageViewerModal({
  opened,
  onClose,
  message,
}: MessageViewerModalProps) {
  if (!message) return null;

  const isTelegram = message.channel === "TELEGRAM";
  const senderName = message.contact
    ? `${message.contact.firstName} ${message.contact.lastName}`
    : isTelegram
      ? `@${message.fromTelegram}`
      : (message.fromEmail ?? "Unknown");

  const recipient = isTelegram
    ? message.toTelegram
      ? `@${message.toTelegram}`
      : "Unknown"
    : (message.toEmail ?? "Unknown");

  const timestamp = message.sentAt ?? message.createdAt;
  const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      padding={0}
      radius="md"
      withCloseButton={false}
      styles={{
        content: {
          background: "var(--theme-crm-surface)",
          border: "1px solid var(--theme-crm-border)",
        },
        body: {
          padding: 0,
        },
      }}
    >
      {/* Modal Header */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
        }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            {isTelegram ? (
              <IconBrandTelegram size={18} />
            ) : (
              <IconMail size={18} />
            )}
            <Text size="sm" fw={500}>
              View {isTelegram ? "message" : "email"}
            </Text>
          </Group>
          <ActionIcon variant="subtle" onClick={onClose} size="sm">
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Subject Line */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
        }}
      >
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            {message.subject ??
              (isTelegram ? "Telegram Message" : "No subject")}
          </Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconShare size={14} />}
            disabled
          >
            Share
          </Button>
        </Group>
      </Box>

      {/* Sender Info */}
      <Box
        px="md"
        py="md"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Avatar size={40} radius="xl" color={isTelegram ? "cyan" : "blue"}>
              {senderName[0]?.toUpperCase() ?? "?"}
            </Avatar>
            <Stack gap={2}>
              <Text size="sm" fw={600}>
                {senderName}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  to {recipient}
                </Text>
                <IconChevronDown size={12} style={{ opacity: 0.5 }} />
              </Group>
            </Stack>
          </Group>
          <Group gap="sm">
            <ActionIcon variant="subtle" size="sm" disabled>
              <IconCornerUpLeft size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" disabled>
              <IconCornerUpRight size={16} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {formattedDate}
            </Text>
          </Group>
        </Group>
      </Box>

      {/* Message Content */}
      <ScrollArea h={400}>
        <Box p="md">
          {message.htmlContent ? (
            <Box
              dangerouslySetInnerHTML={{ __html: message.htmlContent }}
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            />
          ) : (
            <Text
              size="sm"
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {message.textContent ?? "No content"}
            </Text>
          )}
        </Box>
      </ScrollArea>

      {/* Footer with metadata */}
      <Divider />
      <Box px="md" py="sm">
        <Group gap="md">
          {isTelegram ? (
            <>
              {message.fromTelegram && (
                <Text size="xs" c="dimmed">
                  From: @{message.fromTelegram}
                </Text>
              )}
              {message.toTelegram && (
                <Text size="xs" c="dimmed">
                  To: @{message.toTelegram}
                </Text>
              )}
            </>
          ) : (
            <>
              {message.fromEmail && (
                <Text size="xs" c="dimmed">
                  From: {message.fromEmail}
                </Text>
              )}
              {message.toEmail && (
                <Text size="xs" c="dimmed">
                  To: {message.toEmail}
                </Text>
              )}
            </>
          )}
        </Group>
      </Box>
    </Modal>
  );
}
