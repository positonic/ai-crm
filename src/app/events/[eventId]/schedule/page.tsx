import { Suspense } from "react";
import type { Metadata } from "next";
import { Center, Loader } from "@mantine/core";
import SchedulePageClient from "./SchedulePageClient";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Event schedule",
};

export default async function SchedulePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <Suspense fallback={<Center h={400}><Loader size="lg" /></Center>}>
      <SchedulePageClient eventId={eventId} />
    </Suspense>
  );
}
