"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Container, Title, Text, Stack, Loader, Center } from "@mantine/core";
import { AsksOffersTab } from "../AsksOffersTab";
import { api } from "~/trpc/react";

interface AsksOffersPageProps {
  params: Promise<{ eventId: string }>;
}

export default function AsksOffersPage({ params }: AsksOffersPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const { data: session, status } = useSession();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { data: event, isLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  if (status === "loading" || isLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container size="lg" py="xl">
        <Title order={1}>Event Not Found</Title>
        <Text c="dimmed">
          The event you&apos;re looking for doesn&apos;t exist.
        </Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} mb="xs">
            Asks & Offers
          </Title>
          <Text c="dimmed">
            Browse what participants are looking for help with and what they can
            offer to the community.
          </Text>
        </div>

        <AsksOffersTab eventId={eventId} session={session} />
      </Stack>
    </Container>
  );
}
