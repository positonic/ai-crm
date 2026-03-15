"use client";

import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Loader,
  Center,
  Box,
  ThemeIcon,
  Card,
  Tooltip,
} from "@mantine/core";
import {
  IconTrophy,
  IconThumbUp,
  IconMessage,
  IconFileText,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getKudosTier } from "~/utils/kudosCalculation";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";

export function KudosLeaderboardClient() {
  const { data: leaderboard, isLoading: leaderboardLoading } =
    api.kudos.getLeaderboard.useQuery({ limit: 50 });

  const { data: myStats } = api.kudos.getUserStats.useQuery({});

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>
              <Group gap="sm">
                <IconTrophy size={36} />
                Kudos
              </Group>
            </Title>
            <Text c="dimmed" mt="xs">
              Social credit economy - recognition that matters
            </Text>
          </div>

          {myStats && (
            <Card withBorder p="md">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Your Kudos
                </Text>
                <Group gap="xs">
                  <Badge
                    size="xl"
                    variant="gradient"
                    gradient={{
                      from: getKudosTier(myStats.currentKudos).color,
                      to: "blue",
                    }}
                  >
                    {myStats.currentKudos.toFixed(1)}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {getKudosTier(myStats.currentKudos).label}
                  </Text>
                </Group>
              </Stack>
            </Card>
          )}
        </Group>

        {/* Leaderboard Content */}
        <div>
          {leaderboardLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Stack gap="md">
              {leaderboard?.map((entry, index) => {
                const tier = getKudosTier(entry.kudos);
                const displayName = getDisplayName(entry.user);

                return (
                  <Paper key={entry.user.id} withBorder p="lg" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="lg" wrap="nowrap">
                        {/* Rank Badge */}
                        <Box style={{ minWidth: 40, textAlign: "center" }}>
                          {index < 3 ? (
                            <ThemeIcon
                              size="xl"
                              variant="gradient"
                              gradient={
                                index === 0
                                  ? { from: "yellow", to: "orange" }
                                  : index === 1
                                    ? { from: "gray", to: "dark" }
                                    : { from: "orange", to: "red" }
                              }
                            >
                              <IconTrophy size={24} />
                            </ThemeIcon>
                          ) : (
                            <Text size="xl" fw={700} c="dimmed">
                              #{index + 1}
                            </Text>
                          )}
                        </Box>

                        {/* User Info */}
                        <Group gap="md" wrap="nowrap">
                          <UserAvatar
                            user={{
                              customAvatarUrl: entry.user.profile?.avatarUrl,
                              oauthImageUrl: entry.user.image,
                              name: entry.user.name,
                              email: entry.user.email,
                              firstName: entry.user.firstName,
                              surname: entry.user.surname,
                            }}
                            size="lg"
                            radius="xl"
                          />
                          <div>
                            <Text fw={600} size="lg">
                              {displayName}
                            </Text>
                            <Group gap="xs" mt={4}>
                              <Tooltip label="Project Updates">
                                <Badge
                                  size="sm"
                                  variant="light"
                                  leftSection={<IconFileText size={12} />}
                                >
                                  {entry.breakdown.updateCount} updates
                                </Badge>
                              </Tooltip>
                              <Tooltip label="Praise Received">
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color="pink"
                                  leftSection={<IconMessage size={12} />}
                                >
                                  {entry.breakdown.praiseReceivedCount} praise
                                </Badge>
                              </Tooltip>
                              <Tooltip label="Likes Received">
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color="grape"
                                  leftSection={<IconThumbUp size={16} />}
                                >
                                  {entry.breakdown.likesReceivedCount} likes
                                </Badge>
                              </Tooltip>
                            </Group>
                          </div>
                        </Group>
                      </Group>

                      {/* Kudos Score */}
                      <Stack gap={4} align="flex-end">
                        <Badge
                          size="xl"
                          variant="gradient"
                          gradient={{ from: tier.color, to: "blue" }}
                        >
                          {entry.kudos.toFixed(1)} kudos
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {tier.label}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </div>
      </Stack>
    </Container>
  );
}
