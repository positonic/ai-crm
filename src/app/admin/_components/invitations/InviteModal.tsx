import { type ReactNode } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Group,
  Button,
  Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconMail, IconUser } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";

interface InviteModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  form: UseFormReturnType<{
    email: string;
    firstName: string;
    expiresAt: Date | undefined;
  }>;
  onSubmit: (values: {
    email: string;
    firstName: string;
    expiresAt: Date | undefined;
  }) => void;
  isLoading: boolean;
  emailPlaceholder?: string;
  extraFields?: ReactNode;
}

export default function InviteModal({
  opened,
  onClose,
  title,
  description,
  form,
  onSubmit,
  isLoading,
  emailPlaceholder,
  extraFields,
}: InviteModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          {description && (
            <>
              <Text size="sm" c="dimmed">
                {description}
              </Text>
              <Divider />
            </>
          )}
          <TextInput
            label="First Name"
            description="Used in the email greeting (e.g. Dear John...)"
            placeholder="John"
            leftSection={<IconUser size={16} />}
            {...form.getInputProps("firstName")}
          />
          <TextInput
            label="Email"
            placeholder={emailPlaceholder ?? "user@example.com"}
            leftSection={<IconMail size={16} />}
            {...form.getInputProps("email")}
            required
          />
          {extraFields}
          <DatePickerInput
            label="Expires At (optional)"
            description="If not set, invitation will expire in 30 days"
            placeholder="Select expiration date"
            {...form.getInputProps("expiresAt")}
            minDate={new Date()}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              leftSection={<IconMail size={16} />}
            >
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
