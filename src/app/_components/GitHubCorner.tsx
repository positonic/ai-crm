"use client";
import { useState, useCallback } from "react";
import { ActionIcon, Tooltip, Stack, Affix } from "@mantine/core";
import { IconBrandGithub, IconAlertCircle } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BugReportForm } from "./BugReportForm";
import { useConsoleCapture } from "~/hooks/useConsoleCapture";

export function GitHubCorner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { getEntries: getConsoleLogs } = useConsoleCapture();
  const [bugReportOpened, setBugReportOpened] = useState(false);
  const [hidden, setHidden] = useState(false);

  const eventIdMatch = /\/events\/([^/]+)/.exec(pathname);
  const eventId = eventIdMatch?.[1];

  const profileUrl = session?.user?.id
    ? `https://platform.fundingthecommons.io/profiles/${session.user.id}`
    : undefined;

  const handleTemporaryClose = useCallback(() => setHidden(true), []);
  const handleTemporaryReopen = useCallback(() => setHidden(false), []);

  return (
    <>
      <Affix
        position={{ bottom: 20, left: 20 }}
        style={{ zIndex: 1000, display: hidden ? "none" : undefined }}
      >
        <Stack gap="xs">
          <Tooltip label="View on GitHub" position="right">
            <ActionIcon
              component={Link}
              href="https://github.com/fundingthecommons/impactful-events"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="filled"
              color="dark"
              style={{
                transition: "transform 0.2s ease",
              }}
              styles={{
                root: {
                  "&:hover": {
                    transform: "scale(1.1)",
                  },
                },
              }}
            >
              <IconBrandGithub size={24} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Report an Issue" position="right">
            <ActionIcon
              onClick={() => setBugReportOpened(true)}
              size="lg"
              variant="outline"
              color="dark"
              style={{
                transition: "transform 0.2s ease",
              }}
              styles={{
                root: {
                  "&:hover": {
                    transform: "scale(1.1)",
                  },
                },
              }}
            >
              <IconAlertCircle size={24} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </Affix>

      <BugReportForm
        opened={bugReportOpened}
        onClose={() => setBugReportOpened(false)}
        getConsoleLogs={getConsoleLogs}
        pathname={pathname}
        eventId={eventId}
        profileUrl={profileUrl}
        onTemporaryClose={handleTemporaryClose}
        onTemporaryReopen={handleTemporaryReopen}
      />
    </>
  );
}
