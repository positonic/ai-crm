"use client";

import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Paper,
  Badge,
  Divider,
  Alert,
  Code,
  Tabs,
} from "@mantine/core";
import {
  IconSend,
  IconX,
  IconEye,
  IconAlertTriangle,
  IconShield,
} from "@tabler/icons-react";

interface EmailPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  email: {
    id: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    toEmail: string;
    type: string;
    missingFields?: string[];
  };
  emailSafety: {
    safe: boolean;
    reason: string;
    mode: string;
  };
  onSend: (emailId: string, confirmed?: boolean) => Promise<void>;
  sending?: boolean;
}

export default function EmailPreviewModal({
  opened,
  onClose,
  email,
  emailSafety,
  onSend,
  sending = false,
}: EmailPreviewModalProps) {
  const handleSend = async (bypassSafety = false) => {
    await onSend(email.id, bypassSafety);
  };

  const isProductionMode = emailSafety.mode === "production";
  const requiresConfirmation = isProductionMode && !emailSafety.safe;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Email Preview"
      size="xl"
      padding="xl"
    >
      <Stack gap="lg">
        {/* Email Safety Alert */}
        <Alert
          icon={emailSafety.safe ? <IconShield /> : <IconAlertTriangle />}
          color={
            emailSafety.safe ? "green" : isProductionMode ? "red" : "orange"
          }
          variant="light"
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>
                {emailSafety.safe ? "Safe Testing Mode" : "Production Mode"}
              </Text>
              <Badge color={emailSafety.safe ? "green" : "red"} variant="light">
                {emailSafety.mode.toUpperCase()}
              </Badge>
            </Group>
            <Text size="sm">{emailSafety.reason}</Text>
            {!emailSafety.safe && (
              <Text size="xs" c="red" fw={500}>
                ⚠️ This email will be sent to the actual recipient:{" "}
                {email.toEmail}
              </Text>
            )}
          </Stack>
        </Alert>

        {/* Email Metadata */}
        <Paper p="md" withBorder radius="md" bg="gray.0">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Email Details
              </Text>
              <Badge variant="outline" color="gray">
                {email.type.replace("_", " ")}
              </Badge>
            </Group>

            <Group gap="lg">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={500}>
                  To:
                </Text>
                <Code>{email.toEmail}</Code>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={500}>
                  Subject:
                </Text>
                <Text size="sm" fw={500}>
                  {email.subject}
                </Text>
              </Stack>
            </Group>

            {email.missingFields && email.missingFields.length > 0 && (
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={500}>
                  Missing Fields:
                </Text>
                <Group gap="xs">
                  {email.missingFields.map((field) => (
                    <Badge key={field} size="sm" variant="light" color="orange">
                      {field
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Email Content Preview */}
        <Tabs defaultValue="html">
          <Tabs.List>
            <Tabs.Tab value="html" leftSection={<IconEye size={16} />}>
              HTML Preview
            </Tabs.Tab>
            <Tabs.Tab value="text">Text Version</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="html" mt="md">
            <Paper
              p="md"
              withBorder
              radius="md"
              style={{
                maxHeight: "400px",
                overflow: "auto",
                backgroundColor: "white",
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: email.htmlContent }}
                style={{
                  fontSize: "14px",
                  lineHeight: 1.5,
                  fontFamily: "Arial, sans-serif",
                }}
              />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="text" mt="md">
            <Paper
              p="md"
              withBorder
              radius="md"
              bg="gray.0"
              style={{
                maxHeight: "400px",
                overflow: "auto",
              }}
            >
              <Text
                size="sm"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}
              >
                {email.textContent ?? "No text version available"}
              </Text>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        <Divider />

        {/* Action Buttons */}
        <Group justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            onClick={onClose}
            leftSection={<IconX size={16} />}
          >
            Cancel
          </Button>

          <Group gap="sm">
            {requiresConfirmation && (
              <Button
                color="red"
                variant="outline"
                onClick={() => void handleSend(true)}
                loading={sending}
                leftSection={<IconAlertTriangle size={16} />}
              >
                Send to Real Recipient
              </Button>
            )}

            <Button
              color={emailSafety.safe ? "blue" : "orange"}
              variant="filled"
              onClick={() => void handleSend(false)}
              loading={sending}
              leftSection={<IconSend size={16} />}
            >
              {emailSafety.safe
                ? "Send (Safe Mode)"
                : requiresConfirmation
                  ? "Send to Test Email"
                  : "Send Email"}
            </Button>
          </Group>
        </Group>

        {/* Production Warning */}
        {isProductionMode && !emailSafety.safe && (
          <Alert color="red" variant="light">
            <Text size="sm" fw={500}>
              🚨 Production Mode Warning
            </Text>
            <Text size="xs">
              You are in production mode. This email will be sent to the actual
              recipient unless you click &quot;Send to Test Email&quot; or set
              up email redirection.
            </Text>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
