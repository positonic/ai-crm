import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import EventsClient from "./EventsClient";

export default async function EventsPage() {
  // Check authentication and role
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/events");
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <EventsClient />;
}
