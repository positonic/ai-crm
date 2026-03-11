"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Tabs,
  Card,
  Text,
  Group,
  Avatar,
  Stack,
  Paper,
  Loader,
  Center,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { getDisplayName } from "~/utils/userDisplay";
import { PraiseQuantifyPanel } from "./components/PraiseQuantifyPanel";
import { PraiseInstanceQuantifyPanel } from "./components/PraiseInstanceQuantifyPanel";

interface PraisePageProps {
  params: Promise<{ eventId: string }>;
}

export default function PraisePage({ params }: PraisePageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string | null>("stats");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  const { data: receivedPraise, isLoading: loadingReceived } =
    api.praise.getMyReceivedPraise.useQuery();
  const { data: sentPraise, isLoading: loadingSent } =
    api.praise.getMySentPraise.useQuery();
  const { data: stats } = api.praise.getMyStats.useQuery();
  const { data: transactions, isLoading: loadingTransactions } =
    api.praise.getAllTransactions.useQuery({
      limit: 100,
    });

  // Get event details
  const { isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  if (eventLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Praise
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="stats">Stats</Tabs.Tab>
          <Tabs.Tab value="transactions">Transactions</Tabs.Tab>
          <Tabs.Tab value="received">Received</Tabs.Tab>
          <Tabs.Tab value="sent">Sent</Tabs.Tab>
          <Tabs.Tab value="quantify">Quantify</Tabs.Tab>
          <Tabs.Tab value="quantify-instances">By Instance</Tabs.Tab>
        </Tabs.List>

        {/* Stats Tab */}
        <Tabs.Panel value="stats" pt="md">
          {stats ? (
            <Group grow>
              <Paper p="lg" withBorder>
                <Text size="sm" c="dimmed" mb="xs">
                  Praise Received
                </Text>
                <Text size="2xl" fw={700}>
                  {stats.receivedCount}
                </Text>
              </Paper>
              <Paper p="lg" withBorder>
                <Text size="sm" c="dimmed" mb="xs">
                  Praise Sent
                </Text>
                <Text size="2xl" fw={700}>
                  {stats.sentCount}
                </Text>
              </Paper>
            </Group>
          ) : (
            <Center>
              <Loader />
            </Center>
          )}
        </Tabs.Panel>

        {/* Transactions Tab */}
        <Tabs.Panel value="transactions" pt="md">
          {loadingTransactions ? (
            <Center>
              <Loader />
            </Center>
          ) : transactions && transactions.length > 0 ? (
            <Stack gap="md">
              {transactions.map((transaction) => (
                <Card key={transaction.id} withBorder p="md">
                  <Group justify="space-between" mb="sm">
                    <Group>
                      <Avatar
                        src={transaction.recipient?.image}
                        alt={getDisplayName(transaction.recipient, "Unknown")}
                        radius="xl"
                      />
                      <Text fw={500}>
                        {getDisplayName(transaction.recipient) ??
                          transaction.recipientName}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {formatDistanceToNow(new Date(transaction.createdAt), {
                        addSuffix: true,
                      })}
                    </Text>
                  </Group>
                  {transaction.message && (
                    <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                      &quot;{transaction.message}&quot;
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                No praise transactions yet. Be the first to send praise! 💝
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Received Tab */}
        <Tabs.Panel value="received" pt="md">
          {loadingReceived ? (
            <Center>
              <Loader />
            </Center>
          ) : receivedPraise && receivedPraise.length > 0 ? (
            <Stack gap="md">
              {receivedPraise.map((praise) => (
                <Card key={praise.id} withBorder p="md">
                  <Group justify="space-between" mb="sm">
                    <Group>
                      <Avatar
                        src={praise.sender?.image}
                        alt={getDisplayName(praise.sender, "Unknown")}
                        radius="xl"
                      />
                      <div>
                        <Text fw={500}>
                          {getDisplayName(praise.sender, "Unknown")}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {praise.sender.email}
                        </Text>
                      </div>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {formatDistanceToNow(new Date(praise.createdAt), {
                        addSuffix: true,
                      })}
                    </Text>
                  </Group>
                  {praise.message && (
                    <Text size="sm" style={{ fontStyle: "italic" }}>
                      &quot;{praise.message}&quot;
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                No praise received yet. Keep contributing! 🌟
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Sent Tab */}
        <Tabs.Panel value="sent" pt="md">
          {loadingSent ? (
            <Center>
              <Loader />
            </Center>
          ) : sentPraise && sentPraise.length > 0 ? (
            <Stack gap="md">
              {sentPraise.map((praise) => (
                <Card key={praise.id} withBorder p="md">
                  <Group justify="space-between" mb="sm">
                    <Group>
                      <Avatar
                        src={praise.recipient?.image}
                        alt={getDisplayName(praise.recipient, "Unknown")}
                        radius="xl"
                      />
                      <div>
                        <Text fw={500}>
                          {getDisplayName(praise.recipient, "Unknown")}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {praise.recipient?.email}
                        </Text>
                      </div>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {formatDistanceToNow(new Date(praise.createdAt), {
                        addSuffix: true,
                      })}
                    </Text>
                  </Group>
                  {praise.message && (
                    <Text size="sm" style={{ fontStyle: "italic" }}>
                      &quot;{praise.message}&quot;
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Text c="dimmed" ta="center">
                You haven&apos;t sent any praise yet. Spread the love! 💖
              </Text>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Quantify Tab */}
        <Tabs.Panel value="quantify" pt="md">
          <PraiseQuantifyPanel />
        </Tabs.Panel>

        {/* Quantify By Instance Tab */}
        <Tabs.Panel value="quantify-instances" pt="md">
          <PraiseInstanceQuantifyPanel />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
