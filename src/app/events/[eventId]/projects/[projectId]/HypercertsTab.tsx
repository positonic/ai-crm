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
  Divider,
} from "@mantine/core";
import {
  IconCertificate,
  IconAlertCircle,
  IconExternalLink,
  IconClock,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface HypercertsTabProps {
  projectId: string;
  projectTitle: string;
  canEdit: boolean;
}

export default function HypercertsTab({
  projectId,
  projectTitle,
  canEdit,
}: HypercertsTabProps) {
  const { data: connectionStatus, isLoading: statusLoading } =
    api.atproto.getConnectionStatus.useQuery();
  const {
    data: hypercerts,
    isLoading: hypercertsLoading,
    error,
    refetch,
  } = api.hypercerts.listMyHypercerts.useQuery(
    { limit: 50 },
    { enabled: connectionStatus?.isConnected ?? false },
  );

  // Create hypercert mutation
  const createHypercert = api.hypercerts.createForProject.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Hypercert Created!",
        message: `Successfully created hypercert for "${data.projectTitle}"`,
        color: "green",
        icon: <IconCheck size={16} />,
        autoClose: 8000,
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Failed to Create Hypercert",
        message: error.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    },
  });

  const handleCreateHypercert = async () => {
    await createHypercert.mutateAsync({ projectId });
  };

  if (statusLoading) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading connection...</Text>
        </Stack>
      </Paper>
    );
  }

  if (!connectionStatus?.isConnected) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Title order={2}>Hypercerts</Title>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Not Connected"
            color="blue"
            variant="light"
          >
            <Stack gap="md">
              <Text>
                Connect your AT Proto account to create and view hypercerts on
                your custom PDS.
              </Text>
              <Text size="sm" c="dimmed">
                Hypercerts are verifiable impact certificates that track the
                work done, time frame, and scope of your projects. They are
                stored on your Personal Data Server using the AT Protocol.
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
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2}>Hypercerts</Title>
            <Group gap="xs">
              <Badge
                variant="light"
                color="green"
                leftSection={<IconCertificate size={12} />}
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

          {canEdit && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreateHypercert}
              loading={createHypercert.isPending}
              color="green"
            >
              Create Hypercert for this Project
            </Button>
          )}
        </Group>

        {/* What are Hypercerts */}
        <Alert title="What are Hypercerts?" color="blue" variant="light">
          <Text size="sm">
            Hypercerts are verifiable impact certificates stored on your
            Personal Data Server. They track <strong>what</strong> work was
            done, <strong>when</strong> it happened, and the{" "}
            <strong>scope</strong> of the impact. Create a hypercert to certify
            the impact work done on this project.
          </Text>
        </Alert>

        <Divider />

        {/* Loading state */}
        {hypercertsLoading && (
          <Stack align="center" gap="md" py="xl">
            <Loader size="lg" />
            <Text c="dimmed">Loading your hypercerts...</Text>
          </Stack>
        )}

        {/* Error state */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error Loading Hypercerts"
            color="red"
          >
            <Text>{error.message}</Text>
          </Alert>
        )}

        {/* Empty state */}
        {hypercerts && hypercerts.length === 0 && !hypercertsLoading && (
          <Alert title="No Hypercerts Yet" color="blue" variant="light">
            <Stack gap="sm">
              <Text>You haven&apos;t created any hypercerts yet.</Text>
              {canEdit && (
                <Text size="sm" c="dimmed">
                  Click &quot;Create Hypercert for this Project&quot; above to
                  create an impact certificate that tracks the work done on{" "}
                  {projectTitle}.
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        {/* Hypercerts list */}
        {hypercerts && hypercerts.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Showing {hypercerts.length} hypercert
              {hypercerts.length !== 1 ? "s" : ""} from your PDS
            </Text>

            {hypercerts.map((hypercert) => (
              <Card
                key={hypercert.uri}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Stack gap="md">
                  {/* Header */}
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      <IconCertificate size={20} color="green" />
                      <Text fw={600} size="lg">
                        {hypercert.value.title}
                      </Text>
                    </Group>
                    <Button
                      component="a"
                      href={`https://bsky.app/profile/${connectionStatus.did}/post/${hypercert.uri.split("/").pop() ?? ""}`}
                      target="_blank"
                      size="xs"
                      variant="subtle"
                      rightSection={<IconExternalLink size={14} />}
                    >
                      View on Bluesky
                    </Button>
                  </Group>

                  {/* Description */}
                  <Text
                    size="sm"
                    c="dimmed"
                    style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                  >
                    {hypercert.value.shortDescription}
                  </Text>

                  {hypercert.value.description && (
                    <Text
                      size="sm"
                      style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                    >
                      {hypercert.value.description}
                    </Text>
                  )}

                  {/* Metadata */}
                  <Group gap="xl">
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        Work Scope
                      </Text>
                      <Text size="sm">{hypercert.value.workScope}</Text>
                    </Stack>

                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        Time Frame
                      </Text>
                      <Group gap="xs">
                        <IconClock size={14} />
                        <Text size="sm">
                          {new Date(
                            hypercert.value.workTimeFrameFrom,
                          ).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                          })}{" "}
                          -{" "}
                          {new Date(
                            hypercert.value.workTimeFrameTo,
                          ).toLocaleDateString("en-US", { timeZone: "UTC" })}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>

                  {/* Image */}
                  {hypercert.value.image &&
                    typeof hypercert.value.image === "string" && (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "300px",
                        }}
                      >
                        <Image
                          src={hypercert.value.image}
                          alt={hypercert.value.title}
                          fill
                          style={{
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                    )}

                  {/* Footer */}
                  <Group gap="xs">
                    <Badge size="xs" variant="dot" color="gray">
                      {hypercert.uri.split("/").pop()}
                    </Badge>
                    <Badge size="xs" variant="outline" color="green">
                      org.hypercerts.claim
                    </Badge>
                    <Text size="xs" c="dimmed">
                      Created{" "}
                      {new Date(hypercert.value.createdAt).toLocaleString()}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {/* PDS Info */}
        {connectionStatus.pdsUrl && (
          <Alert title="Your PDS Information" color="green" variant="light">
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
                Hypercerts are stored on your Personal Data Server using the
                org.hypercerts.claim lexicon.
              </Text>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
