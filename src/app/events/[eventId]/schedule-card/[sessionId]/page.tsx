import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import ScheduleCard from "./ScheduleCard";

interface PageProps {
  params: Promise<{ eventId: string; sessionId: string }>;
}

async function getSession(eventId: string, sessionId: string) {
  // Resolve event by id or slug
  let event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, slug: true },
  });

  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: { id: true, name: true, slug: true },
  });

  if (!event) return null;

  const session = await db.scheduleSession.findUnique({
    where: { id: sessionId },
    include: {
      venue: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      sessionType: { select: { id: true, name: true, color: true } },
      track: { select: { id: true, name: true, color: true } },
      sessionSpeakers: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              profile: {
                select: { company: true, jobTitle: true },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  // Validate session belongs to this event
  if (!session || session.eventId !== event.id) return null;

  return { session, event };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId, sessionId } = await params;
  const data = await getSession(eventId, sessionId);

  if (!data) {
    return { title: "Session Not Found" };
  }

  return {
    title: `${data.session.title} - ${data.event.name}`,
    description: data.session.description ?? undefined,
  };
}

export default async function ScheduleCardPage({ params }: PageProps) {
  const { eventId, sessionId } = await params;
  const data = await getSession(eventId, sessionId);

  if (!data) {
    notFound();
  }

  return <ScheduleCard session={data.session} eventName={data.event.name} />;
}
