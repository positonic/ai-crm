import { Suspense } from "react";
import PrintScheduleClient from "./PrintScheduleClient";

export default async function PrintSchedulePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading schedule...</p>}>
      <PrintScheduleClient eventId={eventId} />
    </Suspense>
  );
}
