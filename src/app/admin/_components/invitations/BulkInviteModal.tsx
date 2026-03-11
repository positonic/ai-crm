import { type ReactNode } from "react";
import {
  Modal,
  Stack,
  Text,
  Textarea,
  Group,
  Button,
  Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconUpload } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";

interface BulkInviteModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  form: UseFormReturnType<{ emails: string; expiresAt: Date | undefined }>;
  onSubmit: (values: { emails: string; expiresAt: Date | undefined }) => void;
  isLoading: boolean;
  emailsLabel?: string;
  extraFields?: ReactNode;
}

export default function BulkInviteModal({
  opened,
  onClose,
  title,
  description,
  form,
  onSubmit,
  isLoading,
  emailsLabel,
  extraFields,
}: BulkInviteModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
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
          <Textarea
            label={emailsLabel ?? "Emails"}
            description="Enter one email per line or separate with commas"
            placeholder={
              "user1@example.com\nuser2@example.com\nuser3@example.com"
            }
            {...form.getInputProps("emails")}
            rows={6}
            required
          />
          {extraFields}
          <DatePickerInput
            label="Expires At (optional)"
            description="If not set, invitations will expire in 30 days"
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
              leftSection={<IconUpload size={16} />}
            >
              Send Invitations
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
