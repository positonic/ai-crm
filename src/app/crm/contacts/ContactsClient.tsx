"use client";

import { useState } from "react";
import {
  Button,
  Paper,
  Stack,
  Text,
  Alert,
  Group,
  Loader,
} from "@mantine/core";
import {
  IconCloudDownload,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import TelegramAuthStatus from "~/app/_components/TelegramAuthStatus";

export default function ContactsClient() {
  const { refetch } = api.contact.getContacts.useQuery();
  const importContacts = api.contact.importGoogleContacts.useMutation();
  const importNotionContacts = api.contact.importNotionContacts.useMutation();
  const importTelegramContacts =
    api.contact.importTelegramContacts.useMutation();
  const matchEventApplicants = api.contact.matchEventApplicants.useMutation();
  const disconnectGoogleAccount =
    api.contact.disconnectGoogleAccount.useMutation();
  const { data: telegramAuthStatus, refetch: refetchTelegramAuth } =
    api.telegramAuth.getAuthStatus.useQuery();
  const [syncing, setSyncing] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [syncingTelegram, setSyncingTelegram] = useState(false);
  const [matchingApplicants, setMatchingApplicants] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await importContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts`);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleNotionSync = async () => {
    setSyncingNotion(true);
    try {
      const result = await importNotionContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts from Notion`);
    } catch (e) {
      console.error("Notion sync failed:", e);
    } finally {
      setSyncingNotion(false);
    }
  };

  const handleTelegramSync = async () => {
    setSyncingTelegram(true);
    try {
      const result = await importTelegramContacts.mutateAsync();
      await refetch();
      console.log(`Successfully synced ${result.count} contacts from Telegram`);
    } catch (e) {
      console.error("Telegram sync failed:", e);
    } finally {
      setSyncingTelegram(false);
    }
  };

  const handleMatchApplicants = async () => {
    setMatchingApplicants(true);
    try {
      const result = await matchEventApplicants.mutateAsync();
      await refetch();
      console.log(
        `Successfully processed ${result.applicationsProcessed} applications: ${result.contactsCreated} contacts created, ${result.contactsUpdated} updated, ${result.errors} errors`,
      );
    } catch (e) {
      console.error("Match applicants failed:", e);
    } finally {
      setMatchingApplicants(false);
    }
  };

  const handleReconnectGoogle = async () => {
    setReconnecting(true);
    try {
      console.log("Disconnecting existing Google account...");
      await disconnectGoogleAccount.mutateAsync();
      console.log("Google account disconnected, redirecting to OAuth...");

      // Small delay to ensure the disconnect is processed
      setTimeout(() => {
        window.location.href = "/api/auth/signin?provider=google";
      }, 500);
    } catch (e) {
      console.error("Failed to disconnect Google account:", e);
      setReconnecting(false);
    }
  };

  return (
    <>
      {/* Match Event Applicants Section */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Match Event Applicants
            </Text>
            <Button
              leftSection={
                matchingApplicants ? (
                  <Loader size="xs" />
                ) : (
                  <IconCloudDownload size={16} />
                )
              }
              onClick={handleMatchApplicants}
              disabled={matchingApplicants || matchEventApplicants.isPending}
              loading={matchingApplicants || matchEventApplicants.isPending}
            >
              {matchingApplicants || matchEventApplicants.isPending
                ? "Processing..."
                : "Match Event Applicants"}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Extract contact information from event applications and sync with
            the contacts database. This will process all applications and create
            or update contact records based on application data.
          </Text>
          {matchEventApplicants.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully processed applications!
              {matchEventApplicants.data && (
                <Text size="sm" mt="xs">
                  Processed {matchEventApplicants.data.applicationsProcessed}{" "}
                  applications:
                  {matchEventApplicants.data.contactsCreated} contacts created,
                  {matchEventApplicants.data.contactsUpdated} updated
                  {matchEventApplicants.data.errors > 0 &&
                    `, ${matchEventApplicants.data.errors} errors`}
                </Text>
              )}
            </Alert>
          )}
          {matchEventApplicants.error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text fw={500}>Processing error:</Text>
              <Text size="sm">{matchEventApplicants.error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Google Contacts Sync
            </Text>
            <Button
              leftSection={
                syncing ? <Loader size="xs" /> : <IconCloudDownload size={16} />
              }
              onClick={handleSync}
              disabled={syncing || importContacts.isPending}
              loading={syncing || importContacts.isPending}
            >
              {syncing || importContacts.isPending
                ? "Syncing..."
                : "Sync Google Contacts"}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Import contacts from your Google account to automatically populate
            the contacts database. Contacts will be automatically associated
            with sponsors based on their email domains.
          </Text>
          {importContacts.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully synced contacts from Google!
            </Alert>
          )}
          {importContacts.error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text fw={500}>Sync error:</Text>
              <Text size="sm" mb="sm">
                {importContacts.error.message === "GOOGLE_AUTH_EXPIRED"
                  ? "Your Google account connection has expired. Please reconnect to sync contacts."
                  : importContacts.error.message === "GOOGLE_NOT_CONNECTED"
                    ? "No Google account connected. Please sign in with Google to sync contacts."
                    : importContacts.error.message ===
                        "GOOGLE_PERMISSIONS_INSUFFICIENT"
                      ? "Insufficient permissions to access Google Contacts. Please reconnect and grant contacts access."
                      : importContacts.error.message}
              </Text>
              {(importContacts.error.message === "GOOGLE_AUTH_EXPIRED" ||
                importContacts.error.message === "GOOGLE_NOT_CONNECTED" ||
                importContacts.error.message ===
                  "GOOGLE_PERMISSIONS_INSUFFICIENT") && (
                <Button
                  size="xs"
                  variant="outline"
                  leftSection={
                    reconnecting ? (
                      <Loader size={14} />
                    ) : (
                      <IconRefresh size={14} />
                    )
                  }
                  onClick={handleReconnectGoogle}
                  disabled={reconnecting || disconnectGoogleAccount.isPending}
                  loading={reconnecting || disconnectGoogleAccount.isPending}
                >
                  {reconnecting || disconnectGoogleAccount.isPending
                    ? "Reconnecting..."
                    : "Disconnect & Reconnect Google"}
                </Button>
              )}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Notion Contacts Sync Section */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Notion Contacts Sync
            </Text>
            <Button
              leftSection={
                syncingNotion ? (
                  <Loader size="xs" />
                ) : (
                  <IconCloudDownload size={16} />
                )
              }
              onClick={handleNotionSync}
              disabled={syncingNotion || importNotionContacts.isPending}
              loading={syncingNotion || importNotionContacts.isPending}
            >
              {syncingNotion || importNotionContacts.isPending
                ? "Syncing..."
                : "Sync Notion Contacts"}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Import contacts from your Notion database. You will need to provide
            a Notion integration token and database ID in the backend
            configuration.
          </Text>
          {importNotionContacts.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully synced contacts from Notion!
            </Alert>
          )}
          {importNotionContacts.error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text fw={500}>Sync error:</Text>
              <Text size="sm">{importNotionContacts.error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Telegram Contacts Sync Section */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Telegram Contacts Sync
            </Text>
            <Button
              leftSection={
                syncingTelegram ? (
                  <Loader size="xs" />
                ) : (
                  <IconCloudDownload size={16} />
                )
              }
              onClick={handleTelegramSync}
              disabled={
                !telegramAuthStatus?.isAuthenticated ||
                syncingTelegram ||
                importTelegramContacts.isPending
              }
              loading={syncingTelegram || importTelegramContacts.isPending}
            >
              {syncingTelegram || importTelegramContacts.isPending
                ? "Syncing..."
                : "Sync Telegram Contacts"}
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Import contacts from your Telegram account using your secure
            authentication.
          </Text>

          {/* Authentication Status */}
          <TelegramAuthStatus
            onAuthChanged={() => void refetchTelegramAuth()}
          />

          {importTelegramContacts.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Successfully synced contacts from Telegram!
            </Alert>
          )}
          {importTelegramContacts.error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text fw={500}>Sync error:</Text>
              <Text size="sm">{importTelegramContacts.error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>
    </>
  );
}
