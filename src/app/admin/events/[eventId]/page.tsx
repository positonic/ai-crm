import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import AdminEventDetailClient from "./AdminEventDetailClient";

interface AdminEventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventDetailPage({ params }: AdminEventDetailPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}`);
  }
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  const eventSelect = {
    id: true,
    slug: true,
    name: true,
    description: true,
    type: true,
    startDate: true,
    endDate: true,
    location: true,
    isOnline: true,
    status: true,
    featureApplicantVetting: true,
    featureSpeakerVetting: true,
    featureMentorVetting: true,
    featurePraise: true,
    featureProjects: true,
    featureAsksOffers: true,
    featureNewsfeed: true,
    featureImpactAnalytics: true,
    featureSponsorManagement: true,
    featureScheduleManagement: true,
    featureFloorManagement: true,
    featureDeliberation: true,
    registrationUrl: true,
    lumaEventId: true,
    _count: {
      select: {
        applications: true,
        sponsors: true,
      },
    },
  } as const;

  let event = await db.event.findUnique({
    where: { id: eventId },
    select: eventSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: eventSelect,
  });

  if (!event) {
    notFound();
  }

  return <AdminEventDetailClient event={event} />;
}
