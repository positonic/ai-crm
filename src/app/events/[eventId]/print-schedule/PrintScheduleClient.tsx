"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { type ScheduleSession } from "../schedule/SchedulePageClient";
import "./print-schedule.css";

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getUTCDateKey(date: Date): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getSpeakerNames(session: ScheduleSession): string {
  const linked = session.sessionSpeakers.map((s) => getDisplayName(s.user));
  const text = session.speakers.filter(
    (name) => !linked.some((ln) => ln.toLowerCase() === name.toLowerCase()),
  );
  return [...linked, ...text].join(", ");
}

interface PrintScheduleClientProps {
  eventId: string;
}

export default function PrintScheduleClient({
  eventId,
}: PrintScheduleClientProps) {
  const searchParams = useSearchParams();
  const venueFilter = searchParams.get("venue");

  const { data: scheduleData, isLoading } =
    api.schedule.getEventSchedule.useQuery({ eventId });
  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const venues = useMemo(() => filterData?.venues ?? [], [filterData?.venues]);

  // Resolve venue filter name to ID
  const filteredVenueId = useMemo(() => {
    if (!venueFilter || !venues.length) return null;
    const match =
      venues.find((v) => v.name === venueFilter) ??
      venues.find((v) => v.id === venueFilter);
    return match?.id ?? null;
  }, [venueFilter, venues]);

  // Group sessions: day -> venue -> sorted by time
  const grouped = useMemo(() => {
    if (!scheduleData?.sessions) return [];

    let sessions = scheduleData.sessions as ScheduleSession[];

    // Filter to venue if specified (skip for "all")
    if (filteredVenueId && venueFilter !== "all") {
      sessions = sessions.filter((s) => s.venueId === filteredVenueId);
    }

    // Group by day
    const byDay = new Map<string, ScheduleSession[]>();
    for (const session of sessions) {
      const key = getUTCDateKey(session.startTime);
      const arr = byDay.get(key) ?? [];
      arr.push(session);
      byDay.set(key, arr);
    }

    // Sort days
    const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return sortedDays.map(([dayKey, daySessions]) => {
      // Group by venue within day
      const byVenue = new Map<string, ScheduleSession[]>();
      const unassigned: ScheduleSession[] = [];

      for (const session of daySessions) {
        if (session.venueId) {
          const arr = byVenue.get(session.venueId) ?? [];
          arr.push(session);
          byVenue.set(session.venueId, arr);
        } else {
          unassigned.push(session);
        }
      }

      // Sort sessions within each venue by time
      for (const [, venueSessions] of byVenue) {
        venueSessions.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
      }
      unassigned.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      // Order venues by the venues list order
      const orderedVenues = venues
        .filter((v) => byVenue.has(v.id))
        .map((v) => ({
          id: v.id,
          name: v.name,
          sessions: byVenue.get(v.id)!,
        }));

      return {
        dayKey,
        label: formatDate(daySessions[0]!.startTime),
        venues: orderedVenues,
        unassigned,
      };
    });
  }, [scheduleData?.sessions, filteredVenueId, venues]);

  if (isLoading) {
    return <p style={{ padding: "2rem" }}>Loading schedule...</p>;
  }

  if (!scheduleData?.sessions.length) {
    return <p style={{ padding: "2rem" }}>No sessions found.</p>;
  }

  const eventName = scheduleData.event.name;

  // Index mode: no venue filter → show links to each floor's printable page
  if (!venueFilter) {
    return (
      <div className="print-schedule">
        <h1>{eventName}</h1>
        <p className="print-subtitle">Printable Schedules by Floor</p>

        <ul className="print-index-list">
          {venues.map((venue) => {
            const sessionCount = (scheduleData.sessions as ScheduleSession[]).filter(
              (s) => s.venueId === venue.id,
            ).length;
            return (
              <li key={venue.id}>
                <a
                  href={`/events/${eventId}/print-schedule?venue=${encodeURIComponent(venue.name)}`}
                >
                  {venue.name}
                </a>
                <span className="print-index-count">
                  {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                </span>
              </li>
            );
          })}
        </ul>

        <p style={{ marginTop: "1.5rem" }}>
          <a href={`/events/${eventId}/print-schedule?venue=all`}>
            View all floors (single page)
          </a>
        </p>
      </div>
    );
  }

  // "all" venue filter → show everything without filtering
  const showAllFloors = venueFilter === "all";
  const filteredVenueName = !showAllFloors
    ? (venues.find((v) => v.id === filteredVenueId)?.name ?? venueFilter)
    : null;

  return (
    <div className="print-schedule">
      <h1>{eventName}</h1>
      <p className="print-subtitle">
        Printable Schedule
        {filteredVenueName ? ` — ${filteredVenueName}` : ""}
      </p>

      <div className="print-actions">
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
        <a href={`/events/${eventId}/print-schedule`}>
          ← All Floors
        </a>
      </div>

      {grouped.map((day) => (
        <div key={day.dayKey} className="print-day-section">
          <h2>{day.label}</h2>

          {day.venues.map((venue) => (
            <div key={venue.id} className="print-venue-section">
              {(showAllFloors || !filteredVenueId) && <h3>{venue.name}</h3>}
              <SessionTable sessions={venue.sessions} />
            </div>
          ))}

          {day.unassigned.length > 0 && (
            <div className="print-venue-section">
              <h3>General</h3>
              <SessionTable sessions={day.unassigned} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SessionTable({ sessions }: { sessions: ScheduleSession[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Session</th>
          <th>Speakers</th>
          <th>Room</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => (
          <tr key={session.id}>
            <td className="col-time">
              {formatTime(session.startTime)}–{formatTime(session.endTime)}
            </td>
            <td className="col-title">{session.title}</td>
            <td className="col-speakers">
              {getSpeakerNames(session) || "—"}
            </td>
            <td className="col-room">{session.room?.name ?? "—"}</td>
            <td className="col-type">{session.sessionType?.name ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
