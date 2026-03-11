"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Button,
  Alert,
  Group,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconMail,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const requestResetMutation = api.passwordReset.requestReset.useMutation();

  const handleSubmit = async (values: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestResetMutation.mutateAsync({
        email: values.email.toLowerCase().trim(),
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } catch {
      // Always show generic message to prevent email enumeration
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg" ta="center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <IconCheck size={32} className="text-green-600" />
            </div>
            <div>
              <Text size="xl" fw={600} mb="xs">
                Check Your Email
              </Text>
              <Text c="dimmed">
                If an account with that email exists, we&apos;ve sent you a link
                to reset your password.
              </Text>
            </div>
            <Text size="sm" c="dimmed">
              Didn&apos;t receive an email? Check your spam folder or try again
              with a different email address.
            </Text>
            <Link href="/signin">
              <Button variant="light" leftSection={<IconArrowLeft size={16} />}>
                Back to Sign In
              </Button>
            </Link>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <div>
            <Group gap="sm" mb="xs">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <IconMail size={20} className="text-blue-600" />
              </div>
              <Text size="xl" fw={600}>
                Reset Password
              </Text>
            </Group>
            <Text c="dimmed">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </Text>
          </div>

          {/* Error Message */}
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Email Address"
                placeholder="your@email.com"
                required
                {...form.getInputProps("email")}
              />
              <Button type="submit" loading={isLoading} fullWidth>
                Send Reset Link
              </Button>
            </Stack>
          </form>

          {/* Footer */}
          <Group justify="center" gap="xs">
            <Text size="sm" c="dimmed">
              Remember your password?
            </Text>
            <Link href="/signin">
              <Anchor size="sm">Sign in</Anchor>
            </Link>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
