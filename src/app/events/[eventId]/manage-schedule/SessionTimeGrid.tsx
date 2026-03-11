"use client";

import { useMemo, useState } from "react";
import {
  Text,
  Tooltip,
  ActionIcon,
  Group,
  Loader,
  Center,
  SegmentedControl,
} from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getDisplayName } from "~/utils/userDisplay";
import { useSessionDragDrop } from "./useSessionDragDrop";
import { type FloorSession } from "~/app/_components/EditSessionModal";

interface SessionTimeGridProps {
  sessions: FloorSession[];
  rooms: Array<{ id: string; name: string }>;
  eventId: string;
  venueId: string;
  venueName: string;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
  isPending?: boolean;
  onViewDetail?: (session: FloorSession) => void;
}

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
  if (minutes === 0) return `${String(hours)}:00`;
  return `${String(hours)}:${String(minutes).padStart(2, "0")}`;
}

// Counter for droppable cell mount logging
let droppableMountCount = 0;
let droppableMountStart = 0;

// Droppable cell for a time-slot/room intersection
function DroppableCell({
  slotTime,
  roomId,
  row,
  col,
  headerRows,
}: {
  slotTime: Date;
  roomId: string | null;
  row: number;
  col: number;
  headerRows: number;
}) {
  if (droppableMountCount === 0) {
    droppableMountStart = performance.now();
    console.log("[DroppableCell] First cell mounting...");
  }
  droppableMountCount++;
  if (droppableMountCount % 100 === 0) {
    console.log(
      `[DroppableCell] ${String(droppableMountCount)} cells mounted so far, elapsed: ${String(Math.round(performance.now() - droppableMountStart))}ms`,
    );
  }

  const dropId = `cell-${slotTime.getTime()}-${roomId ?? "main"}`;
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { slotTime, roomId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`ms-grid-cell ${isOver ? "ms-droppable-active" : ""}`}
      style={{
        gridRow: row + headerRows,
        gridColumn: col + 2,
      }}
    />
  );
}

// Draggable session block
function DraggableSessionBlock({
  session,
  startRow,
  endRow,
  colIndex,
  color,
  isDragging,
  onOpenComments,
  onViewDetail,
}: {
  session: FloorSession;
  startRow: number;
  endRow: number;
  colIndex: number;
  color: string;
  isDragging: boolean;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
  onViewDetail?: (session: FloorSession) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: session.id,
    data: { session },
  });

  const style: React.CSSProperties = {
    gridRow: `${String(startRow)} / ${String(endRow)}`,
    gridColumn: colIndex + 2,
    backgroundColor: `${color}30`,
    borderLeft: `3px solid ${color}`,
    opacity: isDragging ? 0.4 : 1,
    transform: transform
      ? `translate(${String(transform.x)}px, ${String(transform.y)}px)`
      : undefined,
    zIndex: isDragging ? 10 : 1,
  };

  const speakerNames = [
    ...session.sessionSpeakers.map((s) => getDisplayName(s.user, "Unknown")),
    ...session.speakers,
  ];

  const commentCount = session._count?.comments ?? 0;

  return (
    <div
      ref={setNodeRef}
      className="ms-grid-session"
      style={{ ...style, cursor: onViewDetail ? "pointer" : undefined }}
      {...listeners}
      {...attributes}
      onClick={(e: React.MouseEvent) => {
        if (!isDragging && onViewDetail) {
          e.stopPropagation();
          onViewDetail(session);
        }
      }}
    >
      <Text fw={600} size="xs" lineClamp={2} style={{ lineHeight: 1.3 }}>
        {session.title}
      </Text>
      <Text size="xs" c="dimmed" style={{ fontSize: 10, lineHeight: 1.2 }}>
        {formatTime(session.startTime)} - {formatTime(session.endTime)}
      </Text>
      {speakerNames.length > 0 && (
        <Text size="xs" c="dimmed" lineClamp={1} style={{ fontSize: 10 }}>
          {speakerNames.join(", ")}
        </Text>
      )}
      {commentCount > 0 && (
        <Tooltip
          label={`${String(commentCount)} comment${commentCount !== 1 ? "s" : ""}`}
        >
          <ActionIcon
            variant="subtle"
            size="xs"
            color="blue"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenComments(session.id, session.title);
            }}
            style={{ position: "absolute", top: 2, right: 2 }}
          >
            <Group gap={1} wrap="nowrap">
              <IconMessageCircle size={10} />
              <Text size="xs" style={{ fontSize: 9 }}>
                {commentCount}
              </Text>
            </Group>
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}

// Session overlay during drag
function SessionDragOverlay({ session }: { session: FloorSession }) {
  const color = session.sessionType?.color ?? session.track?.color ?? "#94a3b8";
  return (
    <div
      className="ms-grid-session ms-drag-overlay"
      style={{
        backgroundColor: `${color}40`,
        borderLeft: `3px solid ${color}`,
        padding: "4px 6px",
        borderRadius: 4,
        minWidth: 140,
        maxWidth: 250,
      }}
    >
      <Text fw={600} size="xs" lineClamp={2} style={{ lineHeight: 1.3 }}>
        {session.title}
      </Text>
      <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
        {formatTime(session.startTime)} - {formatTime(session.endTime)}
      </Text>
    </div>
  );
}

type Column = { roomId: string | null; label: string };

export function SessionTimeGrid({
  sessions,
  rooms,
  eventId,
  venueId,
  venueName,
  onOpenComments,
  isPending,
  onViewDetail,
}: SessionTimeGridProps) {
  console.log("[SessionTimeGrid] RENDER START", {
    sessionCount: sessions.length,
    roomCount: rooms.length,
    isPending,
  });
  const renderStart = performance.now();

  const [activeDragSession, setActiveDragSession] =
    useState<FloorSession | null>(null);

  const { handleDrop, isPending: isRescheduling } = useSessionDragDrop(
    eventId,
    venueId,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Compute columns from rooms
  const columns = useMemo<Column[]>(() => {
    if (rooms.length > 0) {
      return rooms.map((r) => ({ roomId: r.id, label: r.name }));
    }
    return [{ roomId: null, label: venueName }];
  }, [rooms, venueName]);

  const hasRoomHeaders = rooms.length > 1;
  const headerRows = hasRoomHeaders ? 2 : 1;

  // Get unique days from sessions for day picker
  const uniqueDays = useMemo(() => {
    const daySet = new Set<string>();
    for (const s of sessions) {
      const t = new Date(s.startTime).getTime();
      if (!Number.isFinite(t) || t < 0) continue;
      const d = new Date(t);
      d.setUTCHours(0, 0, 0, 0);
      daySet.add(d.toISOString());
    }
    return Array.from(daySet)
      .sort()
      .map((iso) => new Date(iso));
  }, [sessions]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Compute time slots and session grid positions for the selected day only
  const { timeSlots, sessionsGrid, slotCount, dayFilteredSessions } =
    useMemo(() => {
      console.log("[SessionTimeGrid] useMemo START - computing time slots", {
        totalSessions: sessions.length,
        uniqueDaysCount: uniqueDays.length,
        selectedDayIndex,
      });
      const memoStart = performance.now();

      if (sessions.length === 0 || uniqueDays.length === 0) {
        console.log(
          "[SessionTimeGrid] useMemo: no sessions or days, returning empty",
        );
        return {
          timeSlots: [],
          sessionsGrid: [],
          slotCount: 0,
          dayFilteredSessions: [],
        };
      }

      const selectedDay =
        uniqueDays[Math.min(selectedDayIndex, uniqueDays.length - 1)];
      if (!selectedDay) {
        return {
          timeSlots: [],
          sessionsGrid: [],
          slotCount: 0,
          dayFilteredSessions: [],
        };
      }

      const dayStartMs = selectedDay.getTime();
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

      // Filter sessions to the selected day only
      const daySessions = sessions.filter((s) => {
        const t = new Date(s.startTime).getTime();
        return Number.isFinite(t) && t >= dayStartMs && t < dayEndMs;
      });

      console.log("[SessionTimeGrid] day sessions filtered", {
        daySessionCount: daySessions.length,
        selectedDay: selectedDay.toISOString(),
      });

      if (daySessions.length === 0) {
        return {
          timeSlots: [],
          sessionsGrid: [],
          slotCount: 0,
          dayFilteredSessions: [],
        };
      }

      let earliest = Infinity;
      let latest = -Infinity;
      for (const s of daySessions) {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        if (Number.isFinite(start) && start < earliest) earliest = start;
        if (Number.isFinite(end) && end > latest) latest = end;
      }

      // Pad to reasonable day bounds (8am–8pm)
      const dayBoundStart = new Date(selectedDay);
      dayBoundStart.setUTCHours(8, 0, 0, 0);
      const dayBoundEnd = new Date(selectedDay);
      dayBoundEnd.setUTCHours(20, 0, 0, 0);

      const paddedEarliest = Math.min(earliest, dayBoundStart.getTime());
      const paddedLatest = Math.max(latest, dayBoundEnd.getTime());

      const roundedEarliest =
        Math.floor(paddedEarliest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
      const roundedLatest =
        Math.ceil(paddedLatest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;

      // Safety cap: max 96 slots (24 hours of 15-min intervals)
      const maxSlots = 96;
      const cappedLatest = Math.min(
        roundedLatest,
        roundedEarliest + maxSlots * FIFTEEN_MIN_MS,
      );

      console.log("[SessionTimeGrid] time range computed", {
        earliest: new Date(roundedEarliest).toISOString(),
        latest: new Date(roundedLatest).toISOString(),
        cappedLatest: new Date(cappedLatest).toISOString(),
        estimatedSlots: (cappedLatest - roundedEarliest) / FIFTEEN_MIN_MS,
      });

      const slots: Array<{ time: Date; row: number }> = [];
      let current = roundedEarliest;
      let row = 1;
      while (current < cappedLatest) {
        slots.push({ time: new Date(current), row });
        current += FIFTEEN_MIN_MS;
        row++;
      }

      const grid = daySessions.map((session) => {
        const startMs = new Date(session.startTime).getTime();
        const endMs = new Date(session.endTime).getTime();
        const startRow =
          Math.floor((startMs - roundedEarliest) / FIFTEEN_MIN_MS) +
          headerRows +
          1;
        const endRow = Math.max(
          startRow + 1,
          Math.ceil((endMs - roundedEarliest) / FIFTEEN_MIN_MS) +
            headerRows +
            1,
        );
        // Clamp rows to grid bounds
        const clampedStartRow = Math.max(headerRows + 1, startRow);
        const clampedEndRow = Math.min(row - 1 + headerRows + 1, endRow);
        return { session, startRow: clampedStartRow, endRow: clampedEndRow };
      });

      const memoEnd = performance.now();
      const totalDroppableCells =
        slots.length * (rooms.length > 0 ? rooms.length : 1);
      console.log("[SessionTimeGrid] useMemo DONE", {
        slotCount: slots.length,
        gridItemCount: grid.length,
        totalDroppableCells,
        computeTimeMs: Math.round(memoEnd - memoStart),
      });

      return {
        timeSlots: slots,
        sessionsGrid: grid,
        slotCount: row - 1,
        dayFilteredSessions: daySessions,
      };
    }, [sessions, headerRows, uniqueDays, selectedDayIndex, rooms.length]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { session: FloorSession }
      | undefined;
    if (data?.session) {
      setActiveDragSession(data.session);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragSession(null);
    const { active, over } = event;
    if (!over) return;

    const overData = over.data.current as
      | { slotTime: Date; roomId: string | null }
      | undefined;
    if (!overData?.slotTime) return;

    const sessionId = active.id as string;
    handleDrop(sessionId, overData.slotTime, overData.roomId);
  };

  if (sessions.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions to display in grid view.
      </Text>
    );
  }

  const dayPickerData = uniqueDays.map((d, i) => ({
    value: String(i),
    label: d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));

  // Reset droppable counter for this render pass
  droppableMountCount = 0;

  const totalElements =
    timeSlots.length * columns.length + // droppable cells
    timeSlots.filter((s) => s.time.getUTCMinutes() % 30 === 0).length + // time labels
    timeSlots.filter((s) => s.time.getUTCMinutes() === 0).length + // hour gridlines
    timeSlots.filter((s) => s.time.getUTCMinutes() === 30).length + // half-hour gridlines
    sessionsGrid.length; // session blocks

  const renderEnd = performance.now();
  console.log("[SessionTimeGrid] RENDER COMPLETE - about to return JSX", {
    totalDOMElements: totalElements,
    droppableCells: timeSlots.length * columns.length,
    sessionBlocks: sessionsGrid.length,
    columnCount: columns.length,
    slotCount: timeSlots.length,
    renderComputeTimeMs: Math.round(renderEnd - renderStart),
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {(isPending ?? isRescheduling) && (
        <Center py="xs">
          <Loader size="xs" />
        </Center>
      )}

      {/* Day picker for multi-day events */}
      {uniqueDays.length > 1 && (
        <Group mb="sm">
          <SegmentedControl
            size="xs"
            value={String(selectedDayIndex)}
            onChange={(v) => setSelectedDayIndex(Number(v))}
            data={dayPickerData}
          />
          <Text size="xs" c="dimmed">
            {dayFilteredSessions.length} session
            {dayFilteredSessions.length !== 1 ? "s" : ""}
          </Text>
        </Group>
      )}

      <div className="ms-grid-wrapper">
        <div
          className="ms-grid"
          style={{
            gridTemplateColumns: `60px repeat(${String(columns.length)}, minmax(140px, 1fr))`,
            gridTemplateRows: `${hasRoomHeaders ? "auto auto" : "auto"} repeat(${String(slotCount)}, ${String(ROW_HEIGHT_PX)}px)`,
          }}
        >
          {/* Corner cell */}
          <div
            className="ms-grid-corner"
            style={{
              gridRow: `1 / ${String(headerRows + 1)}`,
              gridColumn: 1,
            }}
          />

          {/* Venue header (row 1) — spans all room columns */}
          <div
            className="ms-grid-venue-header"
            style={{
              gridRow: 1,
              gridColumn: `2 / span ${String(columns.length)}`,
              borderBottom: hasRoomHeaders
                ? "1px solid var(--ms-header-border)"
                : undefined,
            }}
          >
            <Text fw={600} size="sm" ta="center">
              {venueName}
            </Text>
          </div>

          {/* Room sub-headers (row 2) */}
          {hasRoomHeaders &&
            columns.map((col, i) => (
              <div
                key={`room-${col.roomId ?? "main"}`}
                className="ms-grid-room-header"
                style={{ gridRow: 2, gridColumn: i + 2 }}
              >
                <Text size="xs" c="dimmed" ta="center" fw={500}>
                  {col.label}
                </Text>
              </div>
            ))}

          {/* Time labels */}
          {timeSlots
            .filter((slot) => slot.time.getUTCMinutes() % 30 === 0)
            .map((slot) => {
              const isHour = slot.time.getUTCMinutes() === 0;
              return (
                <div
                  key={slot.row}
                  className="ms-grid-time-label"
                  style={{
                    gridRow: slot.row + headerRows,
                    gridColumn: 1,
                  }}
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

          {/* Gridlines */}
          {timeSlots
            .filter((slot) => slot.time.getUTCMinutes() === 0)
            .map((slot) => (
              <div
                key={`line-${String(slot.row)}`}
                className="ms-grid-line-hour"
                style={{
                  gridRow: slot.row + headerRows,
                  gridColumn: `1 / ${String(columns.length + 2)}`,
                }}
              />
            ))}

          {timeSlots
            .filter((slot) => slot.time.getUTCMinutes() === 30)
            .map((slot) => (
              <div
                key={`line-half-${String(slot.row)}`}
                className="ms-grid-line"
                style={{
                  gridRow: slot.row + headerRows,
                  gridColumn: `1 / ${String(columns.length + 2)}`,
                }}
              />
            ))}

          {/* Droppable cells — one per (time-slot, room) */}
          {timeSlots.map((slot) =>
            columns.map((col, colIdx) => (
              <DroppableCell
                key={`drop-${String(slot.row)}-${col.roomId ?? "main"}`}
                slotTime={slot.time}
                roomId={col.roomId}
                row={slot.row}
                col={colIdx}
                headerRows={headerRows}
              />
            )),
          )}

          {/* Draggable session blocks */}
          {sessionsGrid.map(({ session, startRow, endRow }) => {
            let colIndex: number;
            if (session.roomId) {
              colIndex = columns.findIndex(
                (col) => col.roomId === session.roomId,
              );
            } else {
              colIndex = 0;
            }
            if (colIndex === -1) colIndex = 0;

            const color =
              session.sessionType?.color ?? session.track?.color ?? "#94a3b8";

            return (
              <DraggableSessionBlock
                key={session.id}
                session={session}
                startRow={startRow}
                endRow={endRow}
                colIndex={colIndex}
                color={color}
                isDragging={activeDragSession?.id === session.id}
                onOpenComments={onOpenComments}
                onViewDetail={onViewDetail}
              />
            );
          })}
        </div>
      </div>

      {/* Drag overlay (ghost preview) */}
      <DragOverlay>
        {activeDragSession ? (
          <SessionDragOverlay session={activeDragSession} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
