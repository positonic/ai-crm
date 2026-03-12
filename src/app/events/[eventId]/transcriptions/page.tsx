"use client";

import { useState, useEffect } from "react";
import { Container, Center, Loader } from "@mantine/core";
import { api } from "~/trpc/react";
import TranscriptionsTab from "../TranscriptionsTab";

interface TranscriptionsPageProps {
  params: Promise<{ eventId: string }>;
}

export default function TranscriptionsPage({
  params,
}: TranscriptionsPageProps) {
  const [eventIdParam, setEventIdParam] = useState<string>("");

  useEffect(() => {
    void params.then(({ eventId: id }) => setEventIdParam(id));
  }, [params]);

  const { data: event, isLoading } = api.event.getEvent.useQuery(
    { id: eventIdParam },
    { enabled: !!eventIdParam },
  );

  if (!eventIdParam || isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (!event) return null;

  return (
    <Container size="lg" py="xl">
      <TranscriptionsTab eventId={event.id} />
    </Container>
  );
}
