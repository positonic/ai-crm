"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { AIChatDrawer } from "./AIChatDrawer";
import { useConsoleCapture } from "~/hooks/useConsoleCapture";

const DRAWER_STORAGE_KEY = "ai-chat-drawer-opened";

export function AIChatFAB() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const hasRestoredRef = useRef(false);
  const { getEntries: getConsoleLogs } = useConsoleCapture();

  // Restore drawer state from sessionStorage on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      const saved = sessionStorage.getItem(DRAWER_STORAGE_KEY);
      if (saved === "true") {
        setOpened(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Persist drawer state to sessionStorage
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      sessionStorage.setItem(DRAWER_STORAGE_KEY, String(opened));
    } catch {
      // Ignore storage errors
    }
  }, [opened]);

  const handleOpen = useCallback(() => setOpened(true), []);
  const handleClose = useCallback(() => setOpened(false), []);
  const handleTemporaryClose = useCallback(() => setOpened(false), []);
  const handleTemporaryReopen = useCallback(() => setOpened(true), []);

  // Only show for authenticated users
  if (!session?.user) return null;

  // Extract eventId from pathname: /events/{eventId}/...
  const eventIdMatch = /\/events\/([^/]+)/.exec(pathname);
  const eventId = eventIdMatch?.[1];

  return (
    <>
      <Tooltip label="AI Assistant" position="left" offset={16}>
        <ActionIcon
          onClick={handleOpen}
          size="xl"
          radius="xl"
          variant="filled"
          color="violet"
          className="ai-chat-fab"
          style={{
            position: "fixed",
            bottom: "7rem",
            right: "2rem",
            zIndex: 1000,
            transition: "all 200ms ease",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
          aria-label="Open AI Assistant"
        >
          <IconMessageChatbot size={24} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
      <AIChatDrawer
        opened={opened}
        onClose={handleClose}
        pathname={pathname}
        eventId={eventId}
        getConsoleLogs={getConsoleLogs}
        onTemporaryClose={handleTemporaryClose}
        onTemporaryReopen={handleTemporaryReopen}
      />
    </>
  );
}
