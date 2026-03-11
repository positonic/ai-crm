"use client";

/**
 * Hyperboard Client Component
 * Fetches sponsor data and renders the Hyperboard visualization
 */

import { Container, Title, Text, Loader, Center, Stack } from "@mantine/core";
import { Hyperboard } from "~/app/_components/Hyperboard";
import { api } from "~/trpc/react";

interface HyperboardClientProps {
  eventId: string;
}

export function HyperboardClient({ eventId }: HyperboardClientProps) {
  const { data: sponsors, isLoading } =
    api.sponsor.getSponsorsForHyperboard.useQuery({
      eventId,
    });

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!sponsors || sponsors.length === 0) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="md">
          <Title order={1}>Hyperboard</Title>
          <Text c="dimmed">No sponsors found for this event.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Event Hyperboard
          </Title>
          <Text c="dimmed">
            Visualizing sponsors and their impact. Tile size represents market
            cap or contribution level.
          </Text>
        </div>

        <Hyperboard
          data={sponsors}
          height={800}
          label="Sponsors"
          onClickLabel={() => {
            console.log("Label clicked");
          }}
          grayscaleImages={true}
          borderColor="white"
        />
      </Stack>
    </Container>
  );
}
