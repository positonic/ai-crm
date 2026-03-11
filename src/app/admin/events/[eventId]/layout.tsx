import { db } from "~/server/db";
import EventSubNavigation from "~/app/_components/EventSubNavigation";

interface AdminEventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventLayout({
  children,
  params,
}: AdminEventLayoutProps) {
  const { eventId } = await params;

  const featureFlagSelect = {
    name: true,
    slug: true,
    type: true,
    featureAsksOffers: true,
    featureProjects: true,
    featureNewsfeed: true,
    featurePraise: true,
    featureImpactAnalytics: true,
    featureScheduleManagement: true,
    featureSpeakerVetting: true,
    featureApplicantVetting: true,
    featureSponsorManagement: true,
    featureMentorVetting: true,
    featureFloorManagement: true,
  } as const;

  let event = await db.event.findUnique({
    where: { id: eventId },
    select: featureFlagSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: featureFlagSelect,
  });

  const slug = event?.slug ?? eventId;

  return (
    <>
      <EventSubNavigation
        eventId={slug}
        eventName={event?.name}
        eventType={event?.type ?? undefined}
        featureFlags={event ?? undefined}
        isAdmin={true}
        adminBasePath={`/admin/events/${eventId}`}
      />
      {children}
    </>
  );
}
