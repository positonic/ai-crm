'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Drawer,
  Stack,
  Group,
  Text,
  Textarea,
  ActionIcon,
  Paper,
  Box,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconSend,
  IconPlayerStop,
  IconTrash,
  IconBug,
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AgentMessageFeedback } from './AgentMessageFeedback';
import { BugReportForm } from './BugReportForm';
import { useAIChat } from '~/hooks/useAIChat';
import { api } from '~/trpc/react';
import { type ConsoleEntry } from '~/hooks/useConsoleCapture';

interface AIChatDrawerProps {
  opened: boolean;
  onClose: () => void;
  pathname: string;
  eventId?: string;
  getConsoleLogs: () => ConsoleEntry[];
  onTemporaryClose: () => void;
  onTemporaryReopen: () => void;
}

const DEFAULT_PROMPTS = [
  'What events are coming up?',
  'How do I apply to speak?',
  "Show me today's schedule",
];

const ADMIN_PROMPTS = [
  'How many applications are pending?',
  'Who are the speakers for this event?',
  'Show me the event schedule',
];

const FLOOR_LEAD_PROMPTS = [
  "Show me my venue's schedule",
  "Who's speaking in my room today?",
  'How do I manage sessions?',
];

const SPEAKER_PROMPTS = [
  'When is my speaking session?',
  "What's the schedule for today?",
  'Where is my session located?',
];

function getSuggestedPrompts(
  globalRole: string | undefined,
  eventRoles: string[] | undefined,
): string[] {
  // Admin/staff get admin prompts
  if (globalRole === 'admin' || globalRole === 'staff') {
    return ADMIN_PROMPTS;
  }

  // Event-specific roles
  if (eventRoles && eventRoles.length > 0) {
    if (eventRoles.includes('floor lead')) {
      return FLOOR_LEAD_PROMPTS;
    }
    if (eventRoles.includes('speaker')) {
      return SPEAKER_PROMPTS;
    }
  }

  return DEFAULT_PROMPTS;
}

export function AIChatDrawer({
  opened,
  onClose,
  pathname,
  eventId,
  getConsoleLogs,
  onTemporaryClose,
  onTemporaryReopen,
}: AIChatDrawerProps) {
  const { messages, isStreaming, sendMessage, stop, clearMessages, updateMessageFeedback } = useAIChat({
    pathname,
    eventId,
  });
  const { data: session } = useSession();
  const { data: eventRolesData } = api.role.getMyRolesForEvent.useQuery(
    { eventId: eventId ?? '' },
    { enabled: !!eventId && !!session?.user },
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bugReportOpened, setBugReportOpened] = useState(false);

  const suggestedPrompts = useMemo(
    () => getSuggestedPrompts(session?.user?.role ?? undefined, eventRolesData ?? undefined),
    [session?.user?.role, eventRolesData],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const value = inputRef.current?.value.trim();
    console.log('[AI Chat] handleSend called:', { value, isStreaming });
    if (!value || isStreaming) return;
    sendMessage(value).catch((err: unknown) => {
      console.error('[AI Chat] sendMessage threw:', err);
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size="md"
        title={
          <Group gap="xs">
            <Text fw={600} size="lg">AI Assistant</Text>
            <Tooltip label="Report a bug">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => setBugReportOpened(true)}
              >
                <IconBug size={16} />
              </ActionIcon>
            </Tooltip>
            {messages.length > 0 && (
              <Tooltip label="Clear conversation">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={clearMessages}
                  disabled={isStreaming}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        }
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 60px)',
            padding: 0,
          },
          header: {
            borderBottom: '1px solid var(--mantine-color-default-border)',
          },
        }}
      >
        {/* Messages area */}
        <Box
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--mantine-spacing-md)',
          }}
        >
          {messages.length === 0 ? (
            /* Welcome state */
            <Stack gap="md" mt="xl" align="center">
              <Text size="lg" fw={500} c="dimmed" ta="center">
                How can I help you?
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={300}>
                Ask me about events, schedules, how to use the platform, or anything else.
              </Text>
              <Stack gap="xs" mt="md" w="100%" maw={320}>
                {suggestedPrompts.map((prompt) => (
                  <UnstyledButton
                    key={prompt}
                    onClick={() => {
                      console.log('[AI Chat] Suggested prompt clicked:', prompt);
                      sendMessage(prompt).catch((err: unknown) => {
                        console.error('[AI Chat] sendMessage threw:', err);
                      });
                    }}
                    style={{
                      padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: '1px solid var(--mantine-color-default-border)',
                      transition: 'background-color 150ms ease',
                    }}
                    styles={{
                      root: {
                        '&:hover': {
                          backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                      },
                    }}
                  >
                    <Text size="sm">{prompt}</Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </Stack>
          ) : (
            /* Message list */
            <Stack gap="md">
              {messages.map((message) => (
                <Box
                  key={message.id}
                  style={{
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <Paper
                    p="sm"
                    radius="lg"
                    style={{
                      background:
                        message.role === 'user'
                          ? 'var(--theme-chat-user-bg, var(--mantine-color-blue-6))'
                          : 'var(--theme-chat-assistant-bg, var(--mantine-color-gray-0))',
                      color: message.role === 'user' ? 'white' : undefined,
                    }}
                  >
                    {message.role === 'assistant' ? (
                      message.content ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <Text size="sm" c="dimmed" fs="italic">
                          Thinking...
                        </Text>
                      )
                    ) : (
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Text>
                    )}
                  </Paper>
                  {message.role === 'assistant' &&
                    message.content &&
                    message.interactionId &&
                    !isStreaming && (
                      <AgentMessageFeedback
                        interactionId={message.interactionId}
                        onFeedbackSubmitted={(rating) =>
                          updateMessageFeedback(message.id, rating)
                        }
                      />
                    )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Input area */}
        <Box
          p="md"
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
            background: 'var(--theme-chat-input-bg, var(--mantine-color-body))',
          }}
        >
          <Group gap="xs" align="flex-end">
            <Textarea
              ref={inputRef}
              placeholder="Ask anything about the platform..."
              autosize
              minRows={1}
              maxRows={4}
              style={{ flex: 1 }}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Tooltip label="Stop">
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="lg"
                  radius="xl"
                  onClick={stop}
                >
                  <IconPlayerStop size={18} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Tooltip label="Send">
                <ActionIcon
                  variant="filled"
                  color="blue"
                  size="lg"
                  radius="xl"
                  onClick={handleSend}
                >
                  <IconSend size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Box>
      </Drawer>

      <BugReportForm
        opened={bugReportOpened}
        onClose={() => setBugReportOpened(false)}
        getConsoleLogs={getConsoleLogs}
        pathname={pathname}
        eventId={eventId}
        profileUrl={session?.user?.id ? `https://platform.fundingthecommons.io/profiles/${session.user.id}` : undefined}
        onTemporaryClose={onTemporaryClose}
        onTemporaryReopen={onTemporaryReopen}
      />
    </>
  );
}
