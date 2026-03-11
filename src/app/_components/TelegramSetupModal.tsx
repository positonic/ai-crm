"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Button,
  Alert,
  Stepper,
  Group,
  Paper,
  PasswordInput,
  Loader,
  Center,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconShieldCheck,
  IconAlertCircle,
  IconCheck,
  IconPhone,
  IconMessageCircle,
  IconLock,
  IconInfoCircle,
  IconTrash,
  IconCloudDownload,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface TelegramSetupModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SetupStep =
  | "welcome"
  | "credentials"
  | "phone"
  | "code"
  | "password"
  | "success"
  | "authenticated";

export default function TelegramSetupModal({
  opened,
  onClose,
  onSuccess,
}: TelegramSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [sessionId, setSessionId] = useState<string>("");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState("");

  // tRPC queries and mutations
  const { data: authStatus, refetch: refetchAuthStatus } =
    api.telegramAuth.getAuthStatus.useQuery();
  const importTelegramContacts =
    api.contact.importTelegramContacts.useMutation();
  const deleteAuth = api.telegramAuth.deleteAuth.useMutation();
  const startAuth = api.telegramAuth.startAuth.useMutation();
  const sendPhoneCode = api.telegramAuth.sendPhoneCode.useMutation();
  const verifyAndStore = api.telegramAuth.verifyAndStore.useMutation();

  // Check authentication status when modal opens
  useEffect(() => {
    if (opened) {
      if (authStatus?.isAuthenticated) {
        setCurrentStep("authenticated");
      } else {
        setCurrentStep("welcome");
      }
      setError("");
    }
  }, [opened, authStatus?.isAuthenticated]);

  const reset = () => {
    setCurrentStep("welcome");
    setSessionId("");
    setApiId("");
    setApiHash("");
    setPhoneNumber("");
    setVerificationCode("");
    setPassword("");
    setNeedsPassword(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStartAuth = async () => {
    setError("");
    try {
      const result = await startAuth.mutateAsync();
      setSessionId(result.sessionId);
      setCurrentStep("credentials");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start authentication",
      );
    }
  };

  const handleCredentialsSubmit = async () => {
    if (!apiId.trim() || !apiHash.trim()) {
      setError("Please enter both API ID and API Hash");
      return;
    }

    setError("");
    setCurrentStep("phone");
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setError("");
    try {
      await sendPhoneCode.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
        apiId: apiId.trim(),
        apiHash: apiHash.trim(),
      });
      setCurrentStep("code");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send verification code",
      );
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setError("");
    try {
      await verifyAndStore.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
        phoneCode: verificationCode.trim(),
        password: needsPassword ? password : undefined,
      });
      setCurrentStep("success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";

      if (
        errorMessage.includes("Two-factor authentication password required")
      ) {
        setNeedsPassword(true);
        setCurrentStep("password");
      } else {
        setError(errorMessage);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError("Please enter your two-factor authentication password");
      return;
    }

    setError("");
    try {
      await verifyAndStore.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
        phoneCode: verificationCode.trim(),
        password: password.trim(),
      });
      setCurrentStep("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password verification failed",
      );
    }
  };

  const handleSuccess = () => {
    reset();
    onSuccess();
    onClose();
  };

  const handleImportContacts = async () => {
    setError("");
    try {
      const result = await importTelegramContacts.mutateAsync();
      // Show success message and close modal
      alert(`Successfully imported ${result.count} contacts from Telegram!`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import contacts",
      );
    }
  };

  const handleDeleteAuth = async () => {
    if (
      confirm(
        "Are you sure you want to remove your Telegram authentication? You'll need to set it up again.",
      )
    ) {
      setError("");
      try {
        await deleteAuth.mutateAsync();
        await refetchAuthStatus();
        setCurrentStep("welcome");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete authentication",
        );
      }
    }
  };

  const handleSetupNewAuth = () => {
    setCurrentStep("welcome");
    setError("");
  };

  const getStepperStep = () => {
    switch (currentStep) {
      case "welcome":
        return 0;
      case "credentials":
        return 1;
      case "phone":
        return 2;
      case "code":
      case "password":
        return 3;
      case "success":
      case "authenticated":
        return 4;
      default:
        return 0;
    }
  };

  const isLoading =
    startAuth.isPending ||
    sendPhoneCode.isPending ||
    verifyAndStore.isPending ||
    importTelegramContacts.isPending ||
    deleteAuth.isPending;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Set up Telegram Authentication"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Stepper active={getStepperStep()} size="sm">
          <Stepper.Step icon={<IconInfoCircle size={16} />} label="Welcome" />
          <Stepper.Step icon={<IconShieldCheck size={16} />} label="API Keys" />
          <Stepper.Step icon={<IconPhone size={16} />} label="Phone" />
          <Stepper.Step icon={<IconMessageCircle size={16} />} label="Verify" />
          <Stepper.Step icon={<IconCheck size={16} />} label="Complete" />
        </Stepper>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {currentStep === "welcome" && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group>
                  <ThemeIcon color="blue" variant="light">
                    <IconShieldCheck size={20} />
                  </ThemeIcon>
                  <Text fw={500}>Secure Authentication Setup</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  We&apos;ll help you securely connect your Telegram account to
                  import your contacts. Your credentials will be encrypted and
                  stored safely.
                </Text>
              </Stack>
            </Paper>

            <Text fw={500} size="sm">
              What happens during setup:
            </Text>
            <List spacing="xs" size="sm">
              <List.Item>We&apos;ll ask for your phone number</List.Item>
              <List.Item>Telegram will send you a verification code</List.Item>
              <List.Item>
                If you have 2FA enabled, we&apos;ll ask for your password
              </List.Item>
              <List.Item>
                Your session will be encrypted and stored securely
              </List.Item>
            </List>

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text fw={500} size="sm">
                Privacy & Security
              </Text>
              <Text size="xs" mt={4}>
                Your Telegram credentials are encrypted with your user ID and
                stored securely. Sessions automatically expire after 30 days and
                can be revoked at any time.
              </Text>
            </Alert>

            <Button
              onClick={handleStartAuth}
              loading={isLoading}
              disabled={isLoading}
              leftSection={<IconShieldCheck size={16} />}
            >
              Start Setup
            </Button>
          </Stack>
        )}

        {currentStep === "credentials" && (
          <Stack gap="md">
            <Text fw={500}>Enter your Telegram API credentials</Text>
            <Text size="sm" c="dimmed">
              You&apos;ll need to get these from the Telegram website. This
              ensures your data stays private and secure.
            </Text>

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text fw={500} size="sm">
                How to get your API credentials:
              </Text>
              <Text size="xs" mt={4}>
                1. Visit{" "}
                <Text component="span" fw={500}>
                  https://my.telegram.org/apps
                </Text>
                <br />
                2. Log in with your phone number
                <br />
                3. Create a new application
                <br />
                4. Copy the API ID and API Hash below
              </Text>
            </Alert>

            <TextInput
              label="API ID"
              placeholder="1234567"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              leftSection={<IconShieldCheck size={16} />}
              disabled={isLoading}
              description="Numeric ID from my.telegram.org"
            />

            <TextInput
              label="API Hash"
              placeholder="abcdef1234567890abcdef1234567890"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              leftSection={<IconShieldCheck size={16} />}
              disabled={isLoading}
              description="Long string hash from my.telegram.org"
            />

            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCredentialsSubmit}
                disabled={isLoading || !apiId.trim() || !apiHash.trim()}
                leftSection={<IconShieldCheck size={16} />}
              >
                Continue
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "phone" && (
          <Stack gap="md">
            <Text fw={500}>Enter your phone number</Text>
            <Text size="sm" c="dimmed">
              Enter the phone number associated with your Telegram account.
              Include the country code (e.g., +1 for US, +44 for UK).
            </Text>

            <TextInput
              label="Phone Number"
              placeholder="+1 234 567 8900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              leftSection={<IconPhone size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                loading={isLoading}
                disabled={isLoading || !phoneNumber.trim()}
              >
                Send Code
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "code" && (
          <Stack gap="md">
            <Text fw={500}>Enter verification code</Text>
            <Text size="sm" c="dimmed">
              We&apos;ve sent a verification code to {phoneNumber}. Enter the
              code you received via SMS or in your Telegram app.
            </Text>

            <TextInput
              label="Verification Code"
              placeholder="12345"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              leftSection={<IconMessageCircle size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyCode}
                loading={isLoading}
                disabled={isLoading || !verificationCode.trim()}
              >
                Verify Code
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "password" && (
          <Stack gap="md">
            <Text fw={500}>Two-factor authentication</Text>
            <Text size="sm" c="dimmed">
              Your account has two-factor authentication enabled. Please enter
              your Telegram password to complete the setup.
            </Text>

            <PasswordInput
              label="Telegram Password"
              placeholder="Enter your 2FA password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftSection={<IconLock size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                loading={isLoading}
                disabled={isLoading || !password.trim()}
              >
                Complete Setup
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "authenticated" && (
          <Stack gap="md">
            <Center>
              <ThemeIcon color="green" size="xl" variant="light">
                <IconShieldCheck size={24} />
              </ThemeIcon>
            </Center>

            <Text ta="center" fw={500} size="lg">
              Telegram Already Connected
            </Text>

            <Text ta="center" size="sm" c="dimmed">
              Your Telegram authentication is active and ready to use. You can
              import contacts or manage your authentication below.
            </Text>

            {authStatus?.expiresAt && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                <Text fw={500} size="sm">
                  Authentication Status
                </Text>
                <Text size="xs" mt={4}>
                  Connected on{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(authStatus.createdAt ?? new Date()))}
                  {authStatus.expiresAt &&
                    ` • Expires ${new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(authStatus.expiresAt))}`}
                </Text>
              </Alert>
            )}

            <Group grow>
              <Button
                onClick={handleImportContacts}
                loading={importTelegramContacts.isPending}
                disabled={isLoading}
                leftSection={<IconCloudDownload size={16} />}
                variant="filled"
              >
                Import Contacts
              </Button>

              <Button
                onClick={handleSetupNewAuth}
                disabled={isLoading}
                leftSection={<IconShieldCheck size={16} />}
                variant="light"
              >
                Re-authenticate
              </Button>
            </Group>

            <Group justify="space-between">
              <Button
                onClick={handleDeleteAuth}
                loading={deleteAuth.isPending}
                disabled={isLoading}
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={16} />}
                size="sm"
              >
                Remove Authentication
              </Button>

              <Button variant="subtle" onClick={onClose} disabled={isLoading}>
                Close
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "success" && (
          <Stack gap="md">
            <Center>
              <ThemeIcon color="green" size="xl" variant="light">
                <IconCheck size={24} />
              </ThemeIcon>
            </Center>

            <Text ta="center" fw={500} size="lg">
              Setup Complete!
            </Text>

            <Text ta="center" size="sm" c="dimmed">
              Your Telegram authentication has been set up successfully. You can
              now import contacts from your Telegram account.
            </Text>

            <Alert
              icon={<IconShieldCheck size={16} />}
              color="green"
              variant="light"
            >
              <Text fw={500} size="sm">
                Your data is secure
              </Text>
              <Text size="xs" mt={4}>
                Your session credentials are encrypted and will automatically
                expire in 30 days. You can revoke access at any time from your
                account settings.
              </Text>
            </Alert>

            <Button
              onClick={handleSuccess}
              leftSection={<IconCheck size={16} />}
            >
              Done
            </Button>
          </Stack>
        )}

        {isLoading &&
          currentStep !== "success" &&
          currentStep !== "authenticated" && (
            <Center>
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  {currentStep === "phone"
                    ? "Sending verification code..."
                    : currentStep === "code" || currentStep === "password"
                      ? "Verifying..."
                      : "Setting up..."}
                </Text>
              </Group>
            </Center>
          )}
      </Stack>
    </Modal>
  );
}
