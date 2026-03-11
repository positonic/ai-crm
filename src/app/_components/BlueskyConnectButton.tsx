"use client";

import { useState } from "react";
import {
  Button,
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Text,
  Group,
  Alert,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconBrandTwitter,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface BlueskyConnectButtonProps {
  projectTitle: string;
  projectUrl?: string;
}

export default function BlueskyConnectButton({
  projectTitle,
  projectUrl,
}: BlueskyConnectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get connection status
  const { data: connectionStatus, refetch: refetchStatus } =
    api.atproto.getConnectionStatus.useQuery();

  // Connect mutation
  const connectMutation = api.atproto.connectAccount.useMutation({
    onSuccess: async (data) => {
      notifications.show({
        title: "Connected to AT Proto!",
        message: `Successfully connected as @${data.handle}`,
        color: "blue",
        icon: <IconCheck size={16} />,
      });
      setIsModalOpen(false);
      form.reset();
      await refetchStatus();
    },
    onError: (error) => {
      notifications.show({
        title: "Connection Failed",
        message: error.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = api.atproto.disconnectAccount.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Disconnected",
        message: "Disconnected from AT Proto",
        color: "gray",
      });
      await refetchStatus();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  // Share project mutation
  const shareProjectMutation = api.atproto.shareProject.useMutation({
    onSuccess: (data) => {
      console.log("✅ Post created successfully:", data);
      console.log("📍 Post URI:", data.uri);
      console.log("🔗 Post CID:", data.cid);

      notifications.show({
        title: "Posted to AT Proto!",
        message: `Successfully shared your project. URI: ${data.uri}`,
        color: "blue",
        icon: <IconCheck size={16} />,
        autoClose: 10000, // Keep notification visible longer
      });
    },
    onError: (error) => {
      console.error("❌ Post failed:", error);

      notifications.show({
        title: "Post Failed",
        message: error.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  const form = useForm({
    initialValues: {
      handle: "",
      password: "", // App password, not main account password
    },
    validate: {
      handle: (value) => {
        if (!value) return "Handle is required";
        const cleanHandle = value.replace("@", "");
        if (!cleanHandle.includes(".")) {
          return "Handle must include domain (e.g., user.bsky.social or user.custom-pds.com)";
        }
        return null;
      },
      password: (value) => {
        if (!value) return "App password is required";
        if (value.length < 4) return "App password seems too short";
        return null;
      },
    },
  });

  const handleConnect = async (values: typeof form.values) => {
    await connectMutation.mutateAsync({
      handle: values.handle,
      appPassword: values.password,
    });
  };

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync();
  };

  const handlePost = async () => {
    if (!projectUrl) {
      notifications.show({
        title: "Error",
        message: "Project URL is required to share",
        color: "red",
      });
      return;
    }

    await shareProjectMutation.mutateAsync({
      projectTitle,
      projectUrl,
    });
  };

  if (connectionStatus?.isConnected && connectionStatus.handle) {
    return (
      <Group gap="md">
        <Group gap="xs">
          <Badge variant="light" color="blue" size="sm">
            <Group gap={4}>
              <IconBrandTwitter size={12} />@{connectionStatus.handle}
            </Group>
          </Badge>
          {connectionStatus.pdsUrl &&
            connectionStatus.pdsUrl !== "https://bsky.social" && (
              <Badge variant="outline" color="gray" size="xs">
                Custom PDS
              </Badge>
            )}
        </Group>
        <Group gap="xs">
          <Button
            size="sm"
            variant="light"
            color="blue"
            onClick={handlePost}
            loading={shareProjectMutation.isPending}
            leftSection={<IconBrandTwitter size={14} />}
          >
            Share on AT Proto
          </Button>
          <Button
            size="sm"
            variant="subtle"
            color="gray"
            onClick={handleDisconnect}
            loading={disconnectMutation.isPending}
          >
            Disconnect
          </Button>
        </Group>
      </Group>
    );
  }

  return (
    <>
      <Button
        variant="light"
        color="blue"
        size="sm"
        leftSection={<IconBrandTwitter size={14} />}
        onClick={() => setIsModalOpen(true)}
      >
        Connect AT Proto
      </Button>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect to AT Proto"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleConnect)}>
          <Stack gap="md">
            <Alert color="blue" variant="light">
              <Text size="sm">
                Connect your AT Proto account (Bluesky or custom PDS) to share
                updates about your project. You&apos;ll need to use an{" "}
                <strong>App Password</strong> (not your main password).
              </Text>
            </Alert>

            <TextInput
              label="Handle"
              placeholder="your-handle.bsky.social"
              description="Your AT Proto handle (with or without @)"
              required
              {...form.getInputProps("handle")}
            />

            <PasswordInput
              label="App Password"
              placeholder="Enter your app password"
              description={
                <Text size="xs" c="dimmed">
                  Create an app password in your AT Proto client settings
                </Text>
              }
              required
              {...form.getInputProps("password")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={connectMutation.isPending}>
                Connect
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
