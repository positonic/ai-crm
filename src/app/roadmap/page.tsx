"use client";
import { Container, Title, Text, Badge, Stack, Paper } from "@mantine/core";
import { IconBug, IconSparkles, IconTools } from "@tabler/icons-react";
import { GitCommitTimeline } from "~/app/_components/GitCommitTimeline";

export default function RoadmapPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Development Roadmap
          </Title>
          <Text c="dimmed">
            Recent features and fixes shipped in the last 7 days
          </Text>
        </div>

        <Paper p="lg" withBorder>
          <GitCommitTimeline />
        </Paper>

        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Legend
            </Text>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Badge
                size="sm"
                color="blue"
                variant="light"
                leftSection={<IconSparkles size={14} />}
              >
                Feature
              </Badge>
              <Badge
                size="sm"
                color="red"
                variant="light"
                leftSection={<IconBug size={14} />}
              >
                Fix
              </Badge>
              <Badge
                size="sm"
                color="gray"
                variant="light"
                leftSection={<IconTools size={14} />}
              >
                Chore
              </Badge>
            </div>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
