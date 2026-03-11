"use client";

import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import {
  Textarea,
  Loader,
  Paper,
  Avatar,
  Text,
  Group,
  Stack,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { getDisplayName, getInitials } from "~/utils/userDisplay";

interface MentionUser {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
  error?: string;
  description?: string;
}

export function MentionTextarea({
  value,
  onChange,
  label,
  placeholder,
  required,
  minRows = 4,
  error,
  description,
}: MentionTextareaProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users when @ is typed
  const { data: users, isLoading } = api.user.searchUsers.useQuery(
    { query: mentionQuery, limit: 10 },
    { enabled: showMentions && mentionQuery.length > 0 },
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.currentTarget.value;
      const cursorPos = event.currentTarget.selectionStart ?? 0;

      onChange(newValue);

      // Check if user typed @ symbol
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

      if (lastAtSymbol !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

        // Check if there's a space or newline after the @ (which would close the mention)
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMentionQuery(textAfterAt);
          setMentionStartPos(lastAtSymbol);
          setShowMentions(true);
          setSelectedIndex(0);
          return;
        }
      }

      // Close mention dropdown
      setShowMentions(false);
    },
    [onChange],
  );

  const insertMention = useCallback(
    (user: MentionUser) => {
      if (!textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart ?? 0;
      const textBefore = value.substring(0, mentionStartPos);
      const textAfter = value.substring(cursorPos);

      // Create mention markdown: [@Name](mention:userId)
      const mentionText = `[@${getDisplayName(user)}](mention:${user.id})`;
      const newValue = textBefore + mentionText + " " + textAfter;
      const newCursorPos = textBefore.length + mentionText.length + 1;

      onChange(newValue);
      setShowMentions(false);
      setMentionQuery("");

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, mentionStartPos, onChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showMentions || !users || users.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % users.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
          break;
        case "Enter":
          if (showMentions) {
            event.preventDefault();
            insertMention(users[selectedIndex]!);
          }
          break;
        case "Escape":
          event.preventDefault();
          setShowMentions(false);
          break;
      }
    },
    [showMentions, users, selectedIndex, insertMention],
  );

  return (
    <div style={{ position: "relative" }}>
      <Textarea
        ref={textareaRef}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        required={required}
        minRows={minRows}
        error={error}
        description={description}
        autosize
      />

      {showMentions && (
        <Paper
          shadow="md"
          p="xs"
          style={{
            position: "absolute",
            zIndex: 1000,
            width: "100%",
            maxHeight: "300px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {isLoading ? (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          ) : users && users.length > 0 ? (
            <Stack gap="xs">
              {users.map((user, index) => (
                <Paper
                  key={user.id}
                  p="xs"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      index === selectedIndex
                        ? "var(--mantine-color-gray-1)"
                        : "transparent",
                  }}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Group gap="sm">
                    <Avatar src={user.image} size="sm" radius="xl">
                      {getInitials(user) || user.email?.[0]?.toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {getDisplayName(user, "Unknown User")}
                      </Text>
                      {user.email && (
                        <Text size="xs" c="dimmed">
                          {user.email}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" p="md" ta="center">
              {mentionQuery.length === 0
                ? "Type to search users..."
                : "No users found"}
            </Text>
          )}
        </Paper>
      )}
    </div>
  );
}
