'use client';

import { useState, useCallback } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  Collapse,
  Image,
  ActionIcon,
  Box,
} from '@mantine/core';
import {
  IconCamera,
  IconX,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '~/trpc/react';
import { type ConsoleEntry } from '~/hooks/useConsoleCapture';

interface BugReportFormProps {
  opened: boolean;
  onClose: () => void;
  getConsoleLogs: () => ConsoleEntry[];
  pathname: string;
  eventId?: string;
  profileUrl?: string;
  onTemporaryClose: () => void;
  onTemporaryReopen: () => void;
}

export function BugReportForm({
  opened,
  onClose,
  getConsoleLogs,
  pathname,
  eventId,
  onTemporaryClose,
  onTemporaryReopen,
  profileUrl,
}: BugReportFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [temporarilyHidden, setTemporarilyHidden] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [actionUrl, setActionUrl] = useState<string | null>(null);

  const consoleLogs = getConsoleLogs();

  const submitMutation = api.bugReport.submit.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setActionUrl(data.actionUrl);
    },
    onError: (error) => {
      notifications.show({
        title: 'Failed to submit bug report',
        message: error.message,
        color: 'red',
      });
    },
  });

  const captureScreenshot = useCallback(async () => {
    setCapturing(true);
    setTemporarilyHidden(true);
    onTemporaryClose();

    // Wait for drawer + modal close animation
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(document.documentElement, {
        quality: 0.8,
        pixelRatio: 1,
        filter: (node: HTMLElement) => {
          // Exclude the FAB button from capture
          return !node.classList?.contains?.('ai-chat-fab');
        },
      });
      setScreenshot(dataUrl);
    } catch {
      notifications.show({
        title: 'Screenshot failed',
        message: 'Could not capture the page. You can still submit without a screenshot.',
        color: 'yellow',
      });
    } finally {
      onTemporaryReopen();
      // Small delay to let drawer reopen before showing modal on top
      await new Promise((resolve) => setTimeout(resolve, 300));
      setTemporarilyHidden(false);
      setCapturing(false);
    }
  }, [onTemporaryClose, onTemporaryReopen]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    submitMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      screenshot: screenshot ?? undefined,
      consoleLogs: consoleLogs.length > 0 ? consoleLogs : undefined,
      metadata: {
        pathname,
        userAgent: navigator.userAgent,
        screenSize: `${String(window.innerWidth)}x${String(window.innerHeight)}`,
        eventId,
        timestamp: new Date().toISOString(),
        profileUrl,
      },
    });
  };

  const handleClose = () => {
    if (!submitMutation.isPending) {
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setShowLogs(false);
      setSubmitted(false);
      setActionUrl(null);
      onClose();
    }
  };

  if (submitted) {
    return (
      <Modal opened={opened && !temporarilyHidden} onClose={handleClose} title="Bug Reported" centered size="sm">
        <Stack align="center" gap="md" py="md">
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--mantine-color-green-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={24} color="var(--mantine-color-green-6)" />
          </Box>
          <Text fw={500}>Bug report submitted!</Text>
          <Text size="sm" c="dimmed" ta="center">
            Thank you for helping us improve the platform.
          </Text>
          {actionUrl && (
            <Button
              component="a"
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              size="sm"
            >
              View in Exponential
            </Button>
          )}
          <Button variant="subtle" onClick={handleClose}>
            Close
          </Button>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened && !temporarilyHidden}
      onClose={handleClose}
      title="Report a Bug"
      centered
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="What went wrong?"
          placeholder="Brief summary of the issue"
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          disabled={submitMutation.isPending}
        />

        <Textarea
          label="Steps to reproduce"
          placeholder="What were you doing when the bug occurred?"
          minRows={3}
          maxRows={6}
          autosize
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          disabled={submitMutation.isPending}
        />

        {/* Screenshot section */}
        <Box>
          <Group gap="xs" mb="xs">
            <Text size="sm" fw={500}>
              Screenshot
            </Text>
            {screenshot ? (
              <Badge size="sm" color="green" variant="light">
                Attached
              </Badge>
            ) : (
              <Badge size="sm" color="gray" variant="light">
                Optional
              </Badge>
            )}
          </Group>

          {screenshot ? (
            <Box pos="relative" style={{ maxWidth: 300 }}>
              <Image
                src={screenshot}
                alt="Bug screenshot"
                radius="sm"
                style={{ border: '1px solid var(--mantine-color-default-border)' }}
              />
              <ActionIcon
                variant="filled"
                color="red"
                size="xs"
                radius="xl"
                pos="absolute"
                top={4}
                right={4}
                onClick={() => setScreenshot(null)}
              >
                <IconX size={12} />
              </ActionIcon>
            </Box>
          ) : (
            <Button
              variant="light"
              leftSection={<IconCamera size={16} />}
              size="sm"
              onClick={() => void captureScreenshot()}
              loading={capturing}
            >
              Capture Screenshot
            </Button>
          )}
        </Box>

        {/* Console logs section */}
        <Box>
          <Group
            gap="xs"
            mb="xs"
            style={{ cursor: consoleLogs.length > 0 ? 'pointer' : undefined }}
            onClick={() => {
              if (consoleLogs.length > 0) setShowLogs((v) => !v);
            }}
          >
            <Text size="sm" fw={500}>
              Console Logs
            </Text>
            <Badge
              size="sm"
              color={consoleLogs.length > 0 ? 'orange' : 'gray'}
              variant="light"
            >
              {consoleLogs.length > 0
                ? `${String(consoleLogs.length)} captured`
                : 'None'}
            </Badge>
            {consoleLogs.length > 0 &&
              (showLogs ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              ))}
          </Group>
          <Collapse in={showLogs}>
            <Box
              p="xs"
              style={{
                background: 'var(--mantine-color-dark-9, #1a1b1e)',
                borderRadius: 'var(--mantine-radius-sm)',
                maxHeight: 150,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
            >
              {consoleLogs.map((entry, i) => (
                <Text
                  key={`${entry.timestamp}-${String(i)}`}
                  size="xs"
                  c={entry.level === 'error' ? 'red' : 'yellow'}
                  style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  [{entry.level}] {entry.message.slice(0, 200)}
                </Text>
              ))}
            </Box>
          </Collapse>
        </Box>

        {/* Auto-captured metadata */}
        <Text size="xs" c="dimmed">
          Page: {pathname} | Screen: {typeof window !== 'undefined' ? `${String(window.innerWidth)}x${String(window.innerHeight)}` : 'N/A'}
        </Text>

        {/* Actions */}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleSubmit}
            loading={submitMutation.isPending}
            disabled={!title.trim()}
          >
            Submit Bug Report
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
