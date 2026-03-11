import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import ScheduleCard from "../../schedule-card/[sessionId]/ScheduleCard";
import "./floor-cards.css";

interface PageProps {
  params: Promise<{ eventId: string; venueId: string }>;
}

async function getFloorSessions(eventId: string, venueId: string) {
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

  const venue = await db.scheduleVenue.findFirst({
    where: { id: venueId, eventId: event.id },
    select: { id: true, name: true },
  });

  if (!venue) return null;

  const sessions = await db.scheduleSession.findMany({
    where: {
      eventId: event.id,
      venueId: venue.id,
      isPublished: true,
    },
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
    orderBy: [{ startTime: "asc" }, { order: "asc" }],
  });

  return { sessions, venue, event };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId, venueId } = await params;
  const data = await getFloorSessions(eventId, venueId);

  if (!data) {
    return { title: "Floor Not Found" };
  }

  return {
    title: `${data.venue.name} Schedule Cards - ${data.event.name}`,
  };
}

export default async function FloorCardsPage({ params }: PageProps) {
  const { eventId, venueId } = await params;
  const data = await getFloorSessions(eventId, venueId);

  if (!data) {
    notFound();
  }

  if (data.sessions.length === 0) {
    return (
      <div className="fc-page">
        <div className="fc-empty">
          No published sessions for {data.venue.name}
        </div>
      </div>
    );
  }

  return (
    <div className="fc-page">
      {data.sessions.map((session) => (
        <div key={session.id} className="fc-card-wrapper">
          <ScheduleCard session={session} eventName={data.event.name} />
        </div>
      ))}
    </div>
  );
}
