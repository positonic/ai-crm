import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import EventOnboardingClient from "./EventOnboardingClient";

interface EventOnboardingPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventOnboardingPage({
  params,
}: EventOnboardingPageProps) {
  // Await params in Next.js 15
  const { eventId } = await params;

  // Check authentication and admin access
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/onboarding`);
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Fetch event details - try by ID first, then by slug for backward compatibility
  let event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startDate: true,
      endDate: true,
    },
  });

  // If not found by ID, try by slug
  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Get onboarding submissions for this specific event
  const onboardingData = await db.applicationOnboarding.findMany({
    where: {
      application: {
        eventId: event.id, // Filter by specific event (use resolved ID)
      },
    },
    include: {
      application: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return (
    <EventOnboardingClient event={event} onboardingData={onboardingData} />
  );
}
