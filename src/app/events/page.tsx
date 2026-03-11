import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ParticipantEventsClient from "./ParticipantEventsClient";

export default async function EventsPage() {
  // Check authentication
  const session = await auth();

  // Must be authenticated to view events
  if (!session?.user) {
    redirect("/signin?callbackUrl=/events");
  }

  return <ParticipantEventsClient />;
}
