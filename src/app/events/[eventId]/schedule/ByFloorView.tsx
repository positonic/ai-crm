"use client";

import { useMemo } from "react";
import { Text, Stack } from "@mantine/core";
import Link from "next/link";
import { type ScheduleSession } from "./SchedulePageClient";

interface ByFloorViewProps {
  sessions: ScheduleSession[];
  venues: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  eventId: string;
  venueColorMap?: Record<string, string>;
}

function formatTimeShort(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export default function ByFloorView({
  sessions,
  venues,
  eventId,
  venueColorMap,
}: ByFloorViewProps) {
  const sessionsByVenue = useMemo(() => {
    const byVenue = new Map<string, ScheduleSession[]>();

    // Initialize all venues (even empty ones)
    for (const venue of venues) {
      byVenue.set(venue.id, []);
    }

    // Group sessions by venue
    for (const session of sessions) {
      if (session.venueId) {
        const existing = byVenue.get(session.venueId) ?? [];
        existing.push(session);
        byVenue.set(session.venueId, existing);
      }
    }

    // Sort sessions within each venue by time
    for (const [, venueSessions] of byVenue) {
      venueSessions.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }

    return byVenue;
  }, [sessions, venues]);

  const unassignedSessions = useMemo(() => {
    return sessions
      .filter((s) => !s.venueId)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [sessions]);

  if (venues.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No floors configured for this event.
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {venues.map((venue) => {
        const venueSessions = sessionsByVenue.get(venue.id) ?? [];

        const hasRooms = venue.rooms.length > 0;

        return (
          <div key={venue.id} className="by-floor-venue-group">
            <Text className="by-floor-venue-label" fw={600} size="sm" c="blue">
              {venue.name}
            </Text>
            <Stack gap={hasRooms ? "sm" : 4}>
              {venueSessions.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  No sessions scheduled
                </Text>
              ) : hasRooms ? (
                <>
                  {venue.rooms.map((room) => {
                    const roomSessions = venueSessions.filter(
                      (s) => s.roomId === room.id,
                    );
                    if (roomSessions.length === 0) return null;
                    return (
                      <div key={room.id}>
                        <Text size="xs" fw={500} c="dimmed" mb={2}>
                          {room.name}
                        </Text>
                        <Stack gap={4}>
                          {roomSessions.map((session) => (
                            <SessionBar
                              key={session.id}
                              session={session}
                              eventId={eventId}
                            />
                          ))}
                        </Stack>
                      </div>
                    );
                  })}
                  {/* Sessions without a room assignment */}
                  {venueSessions.some((s) => !s.roomId) && (
                    <Stack gap={4}>
                      {venueSessions
                        .filter((s) => !s.roomId)
                        .map((session) => (
                          <SessionBar
                            key={session.id}
                            session={session}
                            eventId={eventId}
                          />
                        ))}
                    </Stack>
                  )}
                </>
              ) : (
                venueSessions.map((session) => (
                  <SessionBar
                    key={session.id}
                    session={session}
                    eventId={eventId}
                  />
                ))
              )}
            </Stack>
          </div>
        );
      })}
      {unassignedSessions.length > 0 && (
        <div className="by-floor-venue-group">
          <Text className="by-floor-venue-label" fw={600} size="sm" c="dimmed">
            General
          </Text>
          <Stack gap={4}>
            {unassignedSessions.map((session) => (
              <SessionBar
                key={session.id}
                session={session}
                eventId={eventId}
                venueColorMap={venueColorMap}
              />
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

function SessionBar({
  session,
  eventId,
  venueColorMap,
}: {
  session: ScheduleSession;
  eventId: string;
  venueColorMap?: Record<string, string>;
}) {
  const color = venueColorMap?.[session.venueId ?? ""] ?? session.sessionType?.color ?? "#94a3b8";

  return (
    <Link
      href={`/events/${eventId}/schedule/${session.id}`}
      className="by-floor-session-bar"
      style={{
        backgroundColor: `${color}50`,
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <Text fw={500} size="sm">
        <Text span fw={700} size="sm">
          {formatTimeShort(session.startTime)}
        </Text>
        {" \u2022 "}
        {session.title}
      </Text>
    </Link>
  );
}
