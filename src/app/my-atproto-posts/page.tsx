"use client";

import {
  Container,
  Title,
  Card,
  Text,
  Stack,
  Badge,
  Group,
  Loader,
  Alert,
  Button,
} from "@mantine/core";
import {
  IconBrandTwitter,
  IconAlertCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function MyAtProtoPostsPage() {
  const router = useRouter();
  const { data: connectionStatus, isLoading: statusLoading } =
    api.atproto.getConnectionStatus.useQuery();
  const {
    data: posts,
    isLoading: postsLoading,
    error,
  } = api.atproto.getMyPosts.useQuery(
    { limit: 20 },
    { enabled: connectionStatus?.isConnected ?? false },
  );

  if (statusLoading) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading...</Text>
        </Stack>
      </Container>
    );
  }

  if (!connectionStatus?.isConnected) {
    return (
      <Container size="md" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Not Connected"
          color="yellow"
        >
          <Stack gap="md">
            <Text>
              You need to connect your AT Proto account first to view your
              posts.
            </Text>
            <Button
              leftSection={<IconBrandTwitter size={16} />}
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard to Connect
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Stack gap="xs">
            <Title order={1}>My AT Proto Posts</Title>
            <Group gap="xs">
              <Badge variant="light" color="blue">
                @{connectionStatus.handle}
              </Badge>
              {connectionStatus.pdsUrl &&
                connectionStatus.pdsUrl !== "https://bsky.social" && (
                  <Badge variant="outline" color="gray">
                    Custom PDS
                  </Badge>
                )}
            </Group>
          </Stack>
        </Group>

        {postsLoading && (
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading your posts...</Text>
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
          <Alert title="No Posts Yet" color="blue">
            <Text>
              You haven&apos;t created any posts yet. Share a project to create
              your first post!
            </Text>
          </Alert>
        )}

        {posts && posts.length > 0 && (
          <Stack gap="md">
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
                    <Text size="sm" c="dimmed">
                      {new Date(post.createdAt).toLocaleString()}
                    </Text>
                    <Group gap="xs">
                      <Button
                        component="a"
                        href={`https://bsky.app/profile/${connectionStatus.did}/post/${post.uri.split("/").pop()}`}
                        target="_blank"
                        size="xs"
                        variant="subtle"
                        rightSection={<IconExternalLink size={14} />}
                      >
                        View on Bluesky
                      </Button>
                    </Group>
                  </Group>

                  <Text style={{ whiteSpace: "pre-wrap" }}>{post.text}</Text>

                  <Group gap="xs">
                    <Badge size="xs" variant="outline">
                      {post.uri}
                    </Badge>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {connectionStatus.pdsUrl && (
          <Alert title="PDS Information" color="blue" variant="light">
            <Stack gap="xs">
              <Text size="sm">
                <strong>PDS Server:</strong> {connectionStatus.pdsUrl}
              </Text>
              <Text size="sm">
                <strong>DID:</strong> {connectionStatus.did}
              </Text>
              <Text size="sm" c="dimmed">
                Posts are stored on your custom Personal Data Server
              </Text>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
