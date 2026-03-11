"use client";

import {
  Timeline,
  Badge,
  Text,
  Stack,
  Loader,
  Center,
  Alert,
} from "@mantine/core";
import {
  IconGitCommit,
  IconBug,
  IconSparkles,
  IconTools,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface Commit {
  hash: string;
  date: string;
  time: string;
  message: string;
  type: "feat" | "fix" | "chore" | "other";
}

interface CommitResponse {
  success: boolean;
  commits: Array<{
    hash: string;
    datetime: string;
    message: string;
  }>;
  error?: string;
}

// Parse git commit messages to extract type and description
function parseCommitMessage(message: string): {
  type: Commit["type"];
  description: string;
} {
  const regex = /^(feat|fix|chore|refactor|docs|style|test|perf):(.+)$/;
  const match = regex.exec(message);

  if (match) {
    const type = match[1] as "feat" | "fix" | "chore";
    const description = match[2]?.trim() ?? message;
    return { type, description };
  }

  return { type: "other", description: message };
}

function parseCommits(data: CommitResponse): Commit[] {
  if (!data.success || !data.commits) {
    return [];
  }

  return data.commits.map((commit) => {
    const [date, time] = commit.datetime.split(" ");
    const parsed = parseCommitMessage(commit.message);

    return {
      hash: commit.hash,
      date: date ?? "",
      time: time ?? "",
      message: commit.message,
      type: parsed.type,
    };
  });
}

// Get icon based on commit type
function getCommitIcon(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return <IconSparkles size={16} />;
    case "fix":
      return <IconBug size={16} />;
    case "chore":
      return <IconTools size={16} />;
    default:
      return <IconGitCommit size={16} />;
  }
}

// Get color based on commit type
function getCommitColor(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return "blue";
    case "fix":
      return "red";
    case "chore":
      return "gray";
    default:
      return "gray";
  }
}

// Get badge label based on commit type
function getCommitLabel(type: Commit["type"]) {
  switch (type) {
    case "feat":
      return "Feature";
    case "fix":
      return "Fix";
    case "chore":
      return "Chore";
    default:
      return "Other";
  }
}

interface GitCommitTimelineProps {
  githubUrl?: string | null;
}

export function GitCommitTimeline({ githubUrl }: GitCommitTimelineProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommits() {
      if (!githubUrl) {
        setError("No GitHub repository URL provided");
        setLoading(false);
        return;
      }

      try {
        const url = new URL("/api/roadmap/commits", window.location.origin);
        url.searchParams.set("repo", githubUrl);

        const response = await fetch(url.toString());
        const data = (await response.json()) as CommitResponse;

        if (data.success) {
          setCommits(parseCommits(data));
        } else {
          setError(data.error ?? "Failed to fetch commits");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch commits",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchCommits();
  }, [githubUrl]);

  if (loading) {
    return (
      <Center style={{ minHeight: "200px" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Git History Unavailable"
        color="blue"
      >
        {error === "No GitHub repository URL provided"
          ? "Add a GitHub repository URL to this project to see the development timeline."
          : error === "Repository not found or not accessible"
            ? "The GitHub repository is not accessible. Please check the repository URL and ensure it's public."
            : "Unable to load development timeline at this time."}
      </Alert>
    );
  }

  if (commits.length === 0) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="No commits"
        color="blue"
      >
        No recent commits found in the last 7 days.
      </Alert>
    );
  }

  return (
    <Timeline active={commits.length} bulletSize={24} lineWidth={2}>
      {commits.map((commit) => {
        const parsed = parseCommitMessage(commit.message);

        return (
          <Timeline.Item
            key={commit.hash}
            bullet={getCommitIcon(parsed.type)}
            title={
              <Stack gap={4}>
                <div>
                  <Badge
                    size="xs"
                    color={getCommitColor(parsed.type)}
                    variant="light"
                    mr="xs"
                  >
                    {getCommitLabel(parsed.type)}
                  </Badge>
                  <Text span size="sm" fw={500}>
                    {parsed.description}
                  </Text>
                </div>
              </Stack>
            }
          >
            <Text size="xs" c="dimmed" mt={4}>
              {commit.date} at {commit.time}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Commit: {commit.hash}
            </Text>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
