import { Suspense } from "react";
import type { Metadata } from "next";
import { Center, Loader } from "@mantine/core";
import SchedulePageClient from "~/app/events/[eventId]/schedule/SchedulePageClient";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Event schedule embed",
};

export default async function ScheduleEmbedPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <Suspense
      fallback={
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      }
    >
      <SchedulePageClient eventId={eventId} embed />
    </Suspense>
  );
}
