"use client";

import { useMemo } from "react";
import { Text } from "@mantine/core";
import Link from "next/link";
import { type ScheduleSession } from "./SchedulePageClient";

interface TimetableViewProps {
  sessions: ScheduleSession[];
  venues: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  eventId: string;
}

type Column = { venueId: string; roomId: string | null; label: string };

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const ROW_HEIGHT_PX = 40;

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function formatTimeShort(date: Date): string {
  const d = new Date(date);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  if (minutes === 0) {
    return `${hours}:00`;
  }
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export default function TimetableView({
  sessions,
  venues,
  eventId,
}: TimetableViewProps) {
  // Compute flat column list: venues with rooms expand to room-per-column
  const { columns, hasAnyRooms, venueSpans } = useMemo(() => {
    const cols: Column[] = [];
    let anyRooms = false;
    const spans: Array<{
      venueId: string;
      name: string;
      startCol: number;
      span: number;
    }> = [];

    for (const venue of venues) {
      const startCol = cols.length;
      if (venue.rooms.length > 0) {
        anyRooms = true;
        for (const room of venue.rooms) {
          cols.push({ venueId: venue.id, roomId: room.id, label: room.name });
        }
        spans.push({
          venueId: venue.id,
          name: venue.name,
          startCol,
          span: venue.rooms.length,
        });
      } else {
        cols.push({ venueId: venue.id, roomId: null, label: venue.name });
        spans.push({ venueId: venue.id, name: venue.name, startCol, span: 1 });
      }
    }

    // Add "General" column for sessions without a venue
    const hasUnassigned = sessions.some((s) => !s.venueId);
    if (hasUnassigned) {
      const startCol = cols.length;
      cols.push({ venueId: "__unassigned__", roomId: null, label: "General" });
      spans.push({
        venueId: "__unassigned__",
        name: "General",
        startCol,
        span: 1,
      });
    }

    return { columns: cols, hasAnyRooms: anyRooms, venueSpans: spans };
  }, [venues, sessions]);

  const headerRows = hasAnyRooms ? 2 : 1;

  const { timeSlots, sessionsGrid, slotCount } = useMemo(() => {
    if (sessions.length === 0) {
      return { timeSlots: [], sessionsGrid: [], slotCount: 0 };
    }

    let earliest = Infinity;
    let latest = -Infinity;
    for (const s of sessions) {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    }

    const referenceDate = new Date(earliest);
    const dayStart = new Date(referenceDate);
    dayStart.setUTCHours(9, 30, 0, 0);
    const dayEnd = new Date(referenceDate);
    dayEnd.setUTCHours(19, 0, 0, 0);

    const paddedEarliest = Math.min(earliest, dayStart.getTime());
    const paddedLatest = Math.max(latest, dayEnd.getTime());

    const roundedEarliest =
      Math.floor(paddedEarliest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
    const roundedLatest =
      Math.ceil(paddedLatest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;

    const slots: Array<{ time: Date; row: number }> = [];
    let current = roundedEarliest;
    let row = 1;
    while (current < roundedLatest) {
      slots.push({ time: new Date(current), row });
      current += FIFTEEN_MIN_MS;
      row++;
    }

    const grid = sessions.map((session) => {
      const startMs = new Date(session.startTime).getTime();
      const endMs = new Date(session.endTime).getTime();
      const startRow =
        Math.floor((startMs - roundedEarliest) / FIFTEEN_MIN_MS) +
        headerRows +
        1;
      const endRow = Math.max(
        startRow + 1,
        Math.ceil((endMs - roundedEarliest) / FIFTEEN_MIN_MS) + headerRows + 1,
      );
      return { session, startRow, endRow };
    });

    return {
      timeSlots: slots,
      sessionsGrid: grid,
      slotCount: row - 1,
    };
  }, [sessions, headerRows]);

  if (sessions.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions to display in timetable view.
      </Text>
    );
  }

  return (
    <div className="timetable-wrapper">
      <div
        className="timetable-grid"
        style={{
          gridTemplateColumns: `60px repeat(${columns.length}, minmax(140px, 1fr))`,
          gridTemplateRows: `${hasAnyRooms ? "auto auto" : "auto"} repeat(${slotCount}, ${ROW_HEIGHT_PX}px)`,
        }}
      >
        {/* Corner cell */}
        <div
          className="timetable-corner"
          style={{ gridRow: `1 / ${headerRows + 1}`, gridColumn: 1 }}
        />

        {/* Venue headers (row 1) — span across room columns */}
        {venueSpans.map((vs) => (
          <div
            key={vs.venueId}
            className="timetable-venue-header"
            style={{
              gridRow: 1,
              gridColumn: `${vs.startCol + 2} / span ${vs.span}`,
              borderBottom: hasAnyRooms
                ? "1px solid var(--timetable-header-border)"
                : undefined,
            }}
          >
            <Text fw={600} size="sm" ta="center">
              {vs.name}
            </Text>
          </div>
        ))}

        {/* Room sub-headers (row 2) — only if any venue has rooms */}
        {hasAnyRooms &&
          columns.map((col, i) => (
            <div
              key={`room-${col.venueId}-${col.roomId ?? "main"}`}
              className="timetable-room-header"
              style={{ gridRow: 2, gridColumn: i + 2 }}
            >
              {col.roomId && (
                <Text size="xs" c="dimmed" ta="center" fw={500}>
                  {col.label}
                </Text>
              )}
            </div>
          ))}

        {/* Time labels — hour and half-hour only */}
        {timeSlots
          .filter((slot) => slot.time.getUTCMinutes() % 30 === 0)
          .map((slot) => {
            const isHour = slot.time.getUTCMinutes() === 0;
            return (
              <div
                key={slot.row}
                className="timetable-time-label"
                style={{ gridRow: slot.row + headerRows, gridColumn: 1 }}
              >
                <Text
                  size="xs"
                  fw={isHour ? 700 : 400}
                  c="dimmed"
                  style={isHour ? { fontSize: 13 } : { fontSize: 11 }}
                >
                  {formatTimeShort(slot.time)}
                </Text>
              </div>
            );
          })}

        {/* Horizontal gridlines — every hour */}
        {timeSlots
          .filter((slot) => slot.time.getUTCMinutes() === 0)
          .map((slot) => (
            <div
              key={`line-${slot.row}`}
              className="timetable-gridline"
              style={{
                gridRow: slot.row + headerRows,
                gridColumn: `1 / ${columns.length + 2}`,
              }}
            />
          ))}

        {/* Session blocks */}
        {sessionsGrid.map(({ session, startRow, endRow }) => {
          // Find the matching column
          let colIndex: number;
          if (session.roomId) {
            colIndex = columns.findIndex(
              (col) => col.roomId === session.roomId,
            );
          } else if (session.venueId) {
            // No room assigned: place in the first column of the venue
            colIndex = columns.findIndex(
              (col) => col.venueId === session.venueId,
            );
          } else {
            // No venue assigned: place in the "General" column
            colIndex = columns.findIndex(
              (col) => col.venueId === "__unassigned__",
            );
          }
          if (colIndex === -1) return null;
          const color =
            session.sessionType?.color ?? session.track?.color ?? "#94a3b8";

          return (
            <Link
              key={session.id}
              href={`/events/${eventId}/schedule/${session.id}`}
              className="timetable-session-block"
              style={{
                gridRow: `${startRow} / ${endRow}`,
                gridColumn: colIndex + 2,
                backgroundColor: `${color}30`,
                borderLeft: `3px solid ${color}`,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Text
                fw={600}
                size="xs"
                lineClamp={3}
                style={{ lineHeight: 1.3 }}
              >
                {session.title}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                style={{ fontSize: 10, lineHeight: 1.2 }}
              >
                {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </Text>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
