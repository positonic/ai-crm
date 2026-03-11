"use client";

import {
  Paper,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  Alert,
  Button,
} from "@mantine/core";
import {
  IconBrandTwitter,
  IconAlertCircle,
  IconExternalLink,
  IconClock,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface SDSTabProps {
  projectId: string;
  canEdit: boolean;
}

export default function SDSTab({
  projectId: _projectId,
  canEdit,
}: SDSTabProps) {
  const { data: connectionStatus, isLoading: statusLoading } =
    api.atproto.getConnectionStatus.useQuery();
  const {
    data: posts,
    isLoading: postsLoading,
    error,
  } = api.atproto.getMyPosts.useQuery(
    { limit: 50 },
    { enabled: connectionStatus?.isConnected ?? false },
  );

  if (statusLoading) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading SDS connection...</Text>
        </Stack>
      </Paper>
    );
  }

  if (!connectionStatus?.isConnected) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Title order={2}>AT Proto / SDS Posts</Title>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Not Connected"
            color="blue"
            variant="light"
          >
            <Stack gap="md">
              <Text>
                Connect your AT Proto account to view and share posts on your
                custom SDS (Shared Data Server).
              </Text>
              <Text size="sm" c="dimmed">
                AT Proto is the protocol powering Bluesky and custom Personal
                Data Servers. Your posts will be stored on your own server.
              </Text>
              {canEdit && (
                <Text size="sm">
                  Go to the <strong>Overview</strong> tab and click{" "}
                  <strong>&quot;Connect AT Proto&quot;</strong> to get started.
                </Text>
              )}
            </Stack>
          </Alert>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2}>AT Proto / SDS Posts</Title>
            <Group gap="xs">
              <Badge
                variant="light"
                color="blue"
                leftSection={<IconBrandTwitter size={12} />}
              >
                @{connectionStatus.handle}
              </Badge>
              {connectionStatus.pdsUrl &&
                connectionStatus.pdsUrl !== "https://bsky.social" && (
                  <Badge variant="outline" color="gray" size="sm">
                    Custom PDS
                  </Badge>
                )}
            </Group>
          </Stack>
        </Group>

        {postsLoading && (
          <Stack align="center" gap="md" py="xl">
            <Loader size="lg" />
            <Text c="dimmed">Loading your SDS posts...</Text>
          </Stack>
        )}

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error Loading Posts"
            color="red"
          >
            <Text>{error.message}</Text>
          </Alert>
        )}

        {posts && posts.length === 0 && (
          <Alert title="No Posts Yet" color="blue" variant="light">
            <Stack gap="sm">
              <Text>You haven&apos;t created any posts yet.</Text>
              <Text size="sm" c="dimmed">
                Use the &quot;Share on AT Proto&quot; button in the Overview tab
                to create your first post!
              </Text>
            </Stack>
          </Alert>
        )}

        {posts && posts.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Showing {posts.length} post{posts.length !== 1 ? "s" : ""} from
              your SDS
            </Text>

            {posts.map((post) => (
              <Card
                key={post.uri}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      <IconClock size={14} />
                      <Text size="xs" c="dimmed">
                        {new Date(post.createdAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Group>
                    <Button
                      component="a"
                      href={`https://bsky.app/profile/${connectionStatus.did}/post/${post.uri.split("/").pop() ?? ""}`}
                      target="_blank"
                      size="xs"
                      variant="subtle"
                      rightSection={<IconExternalLink size={14} />}
                    >
                      View on Bluesky
                    </Button>
                  </Group>

                  <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {post.text}
                  </Text>

                  <Group gap="xs">
                    <Badge size="xs" variant="dot" color="gray">
                      {post.uri.split("/").pop()}
                    </Badge>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {connectionStatus.pdsUrl && (
          <Alert title="Your SDS Information" color="blue" variant="light">
            <Stack gap="xs">
              <Text size="sm">
                <strong>Server:</strong> {connectionStatus.pdsUrl}
              </Text>
              <Text size="sm">
                <strong>DID:</strong>{" "}
                <Text component="span" size="xs" ff="monospace">
                  {connectionStatus.did}
                </Text>
              </Text>
              <Text size="sm" c="dimmed">
                All posts are stored on your Personal Data Server and federated
                via the AT Protocol.
              </Text>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
