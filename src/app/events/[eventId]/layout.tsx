import { headers } from "next/headers";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import EventSubNavigation from "~/app/_components/EventSubNavigation";
import { ChromeWrapper } from "~/app/_components/ChromeWrapper";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { eventId } = await params;
  const headersList = await headers();
  const pathname =
    headersList.get("x-nextjs-url") ??
    headersList.get("x-invoke-path") ??
    headersList.get("referer") ??
    "";
  const isScheduleCard =
    pathname.includes("/schedule-card/") ||
    pathname.includes("/schedule-cards/");
  const isPrintSchedule = pathname.includes("/print-schedule");

  if (isScheduleCard || isPrintSchedule) {
    return <>{children}</>;
  }

  const session = await auth();

  const featureFlagSelect = {
    id: true,
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
    featureDeliberation: true,
  } as const;

  let event = await db.event.findUnique({
    where: { id: eventId },
    select: featureFlagSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: featureFlagSelect,
  });

  // Check floor lead status for current user
  let isFloorOwner = false;
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "staff";

  if (session?.user?.id && event) {
    const ownership = await db.venueOwner.findFirst({
      where: { userId: session.user.id, eventId: event.id },
    });
    isFloorOwner = !!ownership;
  }

  return (
    <>
      <ChromeWrapper>
        <EventSubNavigation
          eventId={event?.slug ?? eventId}
          eventName={event?.name}
          eventType={event?.type ?? undefined}
          featureFlags={event ?? undefined}
          isFloorOwner={isFloorOwner}
          isAdmin={isAdmin}
        />
      </ChromeWrapper>
      {children}
    </>
  );
}
