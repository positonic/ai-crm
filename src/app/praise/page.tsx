"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Tabs,
  Card,
  Text,
  Group,
  Avatar,
  Badge,
  Stack,
  Paper,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { getDisplayName } from "~/utils/userDisplay";

export default function PraisePage() {
  const [activeTab, setActiveTab] = useState<string | null>("leaderboard");

  const { data: receivedPraise, isLoading: loadingReceived } =
    api.praise.getMyReceivedPraise.useQuery();
  const { data: sentPraise, isLoading: loadingSent } =
    api.praise.getMySentPraise.useQuery();
  const { data: stats } = api.praise.getMyStats.useQuery();
  const { data: leaderboard, isLoading: loadingLeaderboard } =
    api.praise.getLeaderboard.useQuery({ limit: 10 });
  const { data: transactions, isLoading: loadingTransactions } =
    api.praise.getAllTransactions.useQuery({ limit: 50 });

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">
        Praise Dashboard
      </Title>

      {/* Stats Overview */}
      {stats && (
        <Group mb="xl" grow>
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed">
              Praise Received
            </Text>
            <Text size="xl" fw={700}>
              {stats.receivedCount}
            </Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed">
              Praise Sent
            </Text>
            <Text size="xl" fw={700}>
              {stats.sentCount}
            </Text>
          </Paper>
        </Group>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="leaderboard">Leaderboard</Tabs.Tab>
          <Tabs.Tab value="transactions">Transactions</Tabs.Tab>
          <Tabs.Tab value="received">Received</Tabs.Tab>
          <Tabs.Tab value="sent">Sent</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="leaderboard" pt="md">
          {loadingLeaderboard ? (
            <Text>Loading...</Text>
          ) : leaderboard && leaderboard.length > 0 ? (
            <Stack gap="sm">
              {leaderboard.map((entry, index) => (
                <Paper key={entry.user?.id ?? index} p="md" withBorder>
                  <Group justify="apart">
                    <Group>
                      <Text fw={700} size="xl" c="dimmed" w={30}>
                        #{index + 1}
                      </Text>
                      <Avatar
                        src={entry.user?.image}
                        alt={getDisplayName(entry.user, "Unknown")}
                        radius="xl"
                      />
                      <div>
                        <Text fw={500}>
                          {getDisplayName(entry.user, "Unknown")}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {entry.user?.email}
                        </Text>
                      </div>
                    </Group>
                    <Badge size="lg" color="grape" variant="filled">
                      {entry.praiseCount} praise
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                No praise leaderboard yet. Start sending praise! 🏆
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="transactions" pt="md">
          {loadingTransactions ? (
            <Text>Loading...</Text>
          ) : transactions && transactions.length > 0 ? (
            <Stack gap="md">
              {transactions.map((transaction) => (
                <Card key={transaction.id} withBorder>
                  <Group justify="apart" mb="xs">
                    <Group>
                      <Avatar
                        src={transaction.sender.image}
                        alt={getDisplayName(transaction.sender, "Unknown")}
                        radius="xl"
                      />
                      <Text fw={500}>
                        {getDisplayName(transaction.sender, "Unknown")}
                      </Text>
                      <Text c="dimmed">→</Text>
                      <Avatar
                        src={transaction.recipient?.image}
                        alt={
                          getDisplayName(transaction.recipient) ??
                          transaction.recipientName
                        }
                        radius="xl"
                      />
                      <Text fw={500}>
                        {getDisplayName(transaction.recipient) ??
                          `@${transaction.recipientName}`}
                      </Text>
                    </Group>
                    {transaction.event && (
                      <Badge color="blue" variant="light">
                        {transaction.event.name}
                      </Badge>
                    )}
                  </Group>
                  <Text>{transaction.message}</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    {formatDistanceToNow(new Date(transaction.createdAt), {
                      addSuffix: true,
                    })}
                  </Text>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                No praise transactions yet. Start spreading appreciation! 💝
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="received" pt="md">
          {loadingReceived ? (
            <Text>Loading...</Text>
          ) : receivedPraise && receivedPraise.length > 0 ? (
            <Stack gap="md">
              {receivedPraise.map((praise) => (
                <Card key={praise.id} withBorder>
                  <Group justify="apart" mb="xs">
                    <Group>
                      <Avatar
                        src={praise.sender.image}
                        alt={getDisplayName(praise.sender, "Unknown")}
                        radius="xl"
                      />
                      <div>
                        <Text fw={500}>
                          {getDisplayName(praise.sender, "Unknown")}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {formatDistanceToNow(new Date(praise.createdAt), {
                            addSuffix: true,
                          })}
                        </Text>
                      </div>
                    </Group>
                    {praise.event && (
                      <Badge color="blue" variant="light">
                        {praise.event.name}
                      </Badge>
                    )}
                  </Group>
                  <Text>{praise.message}</Text>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                No praise received yet. Keep being awesome! 🌟
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="sent" pt="md">
          {loadingSent ? (
            <Text>Loading...</Text>
          ) : sentPraise && sentPraise.length > 0 ? (
            <Stack gap="md">
              {sentPraise.map((praise) => (
                <Card key={praise.id} withBorder>
                  <Group justify="apart" mb="xs">
                    <Group>
                      <Avatar
                        src={praise.recipient?.image}
                        alt={
                          getDisplayName(praise.recipient) ??
                          praise.recipientName
                        }
                        radius="xl"
                      />
                      <div>
                        <Text fw={500}>
                          {getDisplayName(praise.recipient) ??
                            `@${praise.recipientName}`}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {formatDistanceToNow(new Date(praise.createdAt), {
                            addSuffix: true,
                          })}
                        </Text>
                      </div>
                    </Group>
                    {praise.event && (
                      <Badge color="blue" variant="light">
                        {praise.event.name}
                      </Badge>
                    )}
                  </Group>
                  <Text>{praise.message}</Text>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                You haven&apos;t sent any praise yet. Send some appreciation via
                Telegram! 💝
              </Text>
              <Text size="sm" c="dimmed" ta="center" mt="sm">
                Message the bot:{" "}
                <code>!Praise @username for being awesome</code>
              </Text>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
