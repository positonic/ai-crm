"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Paper,
  Stack,
  Text,
  PasswordInput,
  Button,
  Alert,
  Group,
  Progress,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconLock,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
}

function getPasswordStrengthColor(strength: number): string {
  if (strength < 50) return "red";
  if (strength < 75) return "yellow";
  return "green";
}

function getPasswordStrengthLabel(strength: number): string {
  if (strength < 25) return "Very Weak";
  if (strength < 50) return "Weak";
  if (strength < 75) return "Good";
  return "Strong";
}

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const form = useForm<ResetPasswordFormData>({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      newPassword: (value) => {
        if (value.length < 8) {
          return "Password must be at least 8 characters long";
        }
        if (getPasswordStrength(value) < 50) {
          return "Password is too weak. Please use a stronger password.";
        }
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.newPassword ? "Passwords do not match" : null,
    },
  });

  // Validate token on component mount
  const validateTokenQuery = api.passwordReset.validateToken.useQuery(
    { token },
    {
      enabled: !!token,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const resetPasswordMutation = api.passwordReset.resetPassword.useMutation();

  useEffect(() => {
    if (validateTokenQuery.data) {
      setValidatingToken(false);
      if (validateTokenQuery.data.valid) {
        setTokenValid(true);
        setUserEmail(validateTokenQuery.data.user?.email ?? "");
      } else {
        setTokenValid(false);
        setError(validateTokenQuery.data.error ?? "Invalid reset token");
      }
    } else if (validateTokenQuery.error) {
      setValidatingToken(false);
      setTokenValid(false);
      setError("Invalid or expired reset token");
    }
  }, [validateTokenQuery.data, validateTokenQuery.error]);

  const handleSubmit = async (values: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPasswordMutation.mutateAsync({
        token,
        newPassword: values.newPassword,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (validatingToken) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg" ta="center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <IconLock size={32} className="text-blue-600" />
            </div>
            <Text size="xl" fw={600}>
              Validating Reset Link
            </Text>
            <Text c="dimmed">
              Please wait while we validate your password reset link...
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg" ta="center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <IconAlertCircle size={32} className="text-red-600" />
            </div>
            <div>
              <Text size="xl" fw={600} mb="xs">
                Invalid Reset Link
              </Text>
              <Text c="dimmed">{error}</Text>
            </div>
            <Text size="sm" c="dimmed">
              This link may have expired or already been used. You can request a
              new password reset link.
            </Text>
            <Group justify="center" gap="sm">
              <Link href="/auth/forgot-password">
                <Button variant="filled">Request New Reset Link</Button>
              </Link>
              <Link href="/signin">
                <Button
                  variant="light"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  Back to Sign In
                </Button>
              </Link>
            </Group>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Success state
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
                Password Reset Successfully
              </Text>
              <Text c="dimmed">
                Your password has been reset successfully. You can now sign in
                with your new password.
              </Text>
            </div>
            <Link href="/signin">
              <Button fullWidth>Sign In Now</Button>
            </Link>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Reset password form
  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <div>
            <Group gap="sm" mb="xs">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <IconLock size={20} className="text-blue-600" />
              </div>
              <Text size="xl" fw={600}>
                Set New Password
              </Text>
            </Group>
            <Text c="dimmed">
              {userEmail && `Resetting password for ${userEmail}`}
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
              <div>
                <PasswordInput
                  label="New Password"
                  placeholder="Enter your new password"
                  required
                  {...form.getInputProps("newPassword")}
                />
                {form.values.newPassword && (
                  <div>
                    <Group justify="space-between" mt="xs">
                      <Text size="xs" c="dimmed">
                        Password strength
                      </Text>
                      <Text size="xs" c="dimmed">
                        {getPasswordStrengthLabel(
                          getPasswordStrength(form.values.newPassword),
                        )}
                      </Text>
                    </Group>
                    <Progress
                      value={getPasswordStrength(form.values.newPassword)}
                      color={getPasswordStrengthColor(
                        getPasswordStrength(form.values.newPassword),
                      )}
                      size="sm"
                      mt="xs"
                    />
                  </div>
                )}
              </div>

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                required
                {...form.getInputProps("confirmPassword")}
              />

              <Text size="xs" c="dimmed">
                Password requirements: • At least 8 characters long • Mix of
                uppercase and lowercase letters • At least one number • Special
                characters recommended
              </Text>

              <Button type="submit" loading={isLoading} fullWidth>
                Reset Password
              </Button>
            </Stack>
          </form>

          {/* Footer */}
          <Group justify="center" gap="xs">
            <Text size="sm" c="dimmed">
              Remember your password?
            </Text>
            <Link href="/signin">
              <Text
                size="sm"
                component="span"
                c="blue"
                style={{ textDecoration: "underline" }}
              >
                Sign in
              </Text>
            </Link>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
