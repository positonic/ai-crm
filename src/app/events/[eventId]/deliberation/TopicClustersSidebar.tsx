"use client";

import {
  Paper,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  ThemeIcon,
} from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface TopicClustersSidebarProps {
  deliberationId: string;
}

export default function TopicClustersSidebar({
  deliberationId,
}: TopicClustersSidebarProps) {
  const { data: clusters } = api.deliberation.getTopicClusters.useQuery(
    { deliberationId },
    { enabled: !!deliberationId },
  );

  return (
    <Stack gap="md">
      <Group gap="xs">
        <ThemeIcon size="sm" variant="light" color="violet">
          <IconBrain size={14} />
        </ThemeIcon>
        <Title order={5}>Topic Clusters</Title>
      </Group>

      {!clusters?.length ? (
        <Paper p="md" radius="md" withBorder>
          <Stack gap="xs" align="center">
            <Text size="sm" c="dimmed" ta="center">
              Topic clusters will appear here as sessions are transcribed and
              analyzed.
            </Text>
          </Stack>
        </Paper>
      ) : (
        clusters.map((cluster) => (
          <Paper key={cluster.id} p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {cluster.label}
                </Text>
                <Badge size="xs" variant="light" color="violet">
                  {cluster.mentionCount} mentions
                </Badge>
              </Group>
              <Group gap={4}>
                {cluster.keywords.slice(0, 5).map((kw) => (
                  <Badge key={kw} size="xs" variant="outline" color="gray">
                    {kw}
                  </Badge>
                ))}
              </Group>
              {cluster.sourceExcerpts.length > 0 && (
                <Text size="xs" c="dimmed" lineClamp={2} fs="italic">
                  &ldquo;{cluster.sourceExcerpts[0]}&rdquo;
                </Text>
              )}
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
}
