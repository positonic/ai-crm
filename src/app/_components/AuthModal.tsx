"use client";

import { Modal, Stack, Text, Group, ThemeIcon } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconX, IconUserPlus } from "@tabler/icons-react";
import AuthForm from "./AuthForm";

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
  callbackUrl?: string;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({
  opened,
  onClose,
  callbackUrl,
  title = "Get Started",
  subtitle = "Sign in to your account or create a new one",
}: AuthModalProps) {
  // Detect mobile devices for responsive behavior
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isSmallMobile = useMediaQuery("(max-width: 480px)");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="md" radius="xl" color="blue" variant="light">
            <IconUserPlus size={16} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="lg"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      fullScreen={isSmallMobile}
      styles={{
        content: {
          maxWidth: isSmallMobile ? "100%" : "600px",
          width: isSmallMobile
            ? "100%"
            : isMobile
              ? "calc(100vw - 32px)"
              : "100%",
          maxHeight: isSmallMobile ? "100vh" : "95vh",
          margin: isSmallMobile ? "0" : isMobile ? "16px" : "auto",
        },
        header: {
          paddingBottom: "12px",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          marginBottom: "16px",
          padding: isMobile ? "16px 16px 12px 16px" : "20px 20px 12px 20px",
        },
        body: {
          padding: isMobile ? "0 16px 16px 16px" : "0 20px 20px 20px",
          maxHeight: isSmallMobile
            ? "calc(100vh - 100px)"
            : "calc(95vh - 140px)",
          overflowY: "auto",
        },
      }}
      closeButtonProps={{
        icon: <IconX size={20} />,
        size: isMobile ? "lg" : "md",
      }}
    >
      <Stack gap="md">
        <AuthForm
          callbackUrl={callbackUrl ?? "/"}
          className="border-0 p-0 shadow-none"
        />

        <Text size="xs" ta="center" c="dimmed">
          By continuing, you agree to our{" "}
          <Text
            component="a"
            href="/terms"
            target="_blank"
            td="underline"
            c="blue"
            size="xs"
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            component="a"
            href="/privacy"
            target="_blank"
            td="underline"
            c="blue"
            size="xs"
          >
            Privacy Policy
          </Text>
        </Text>
      </Stack>
    </Modal>
  );
}
