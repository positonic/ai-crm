"use client";

import { useState, useMemo } from "react";
import {
  Badge,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Avatar,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconMessageCircle,
  IconSearch,
  IconFile,
} from "@tabler/icons-react";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { getDisplayName } from "~/utils/userDisplay";
import { type FloorSession } from "~/app/_components/EditSessionModal";

interface SessionTableViewProps {
  sessions: FloorSession[];
  rooms: Array<{ id: string; name: string }>;
  sessionTypes: Array<{ id: string; name: string; color: string }>;
  tracks: Array<{ id: string; name: string; color: string }>;
  onEdit: (session: FloorSession) => void;
  onDelete: (sessionId: string) => void;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
  isDeleting: boolean;
  onViewDetail?: (session: FloorSession) => void;
  showFloorColumn?: boolean;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getDurationMinutes(start: Date, end: Date): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${String(hours)}h ${String(mins)}m` : `${String(hours)}h`;
}

export function SessionTableView({
  sessions,
  rooms,
  sessionTypes,
  tracks,
  onEdit,
  onDelete,
  onOpenComments,
  isDeleting,
  onViewDetail,
  showFloorColumn,
}: SessionTableViewProps) {
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<FloorSession>
  >({
    columnAccessor: "startTime",
    direction: "asc",
  });

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Text search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          s.sessionSpeakers.some((sp) =>
            getDisplayName(sp.user, "").toLowerCase().includes(lower),
          ) ||
          s.speakers.some((sp) => sp.toLowerCase().includes(lower)),
      );
    }

    // Filters
    if (roomFilter) {
      result = result.filter((s) => s.roomId === roomFilter);
    }
    if (typeFilter) {
      result = result.filter((s) => s.sessionTypeId === typeFilter);
    }
    if (trackFilter) {
      result = result.filter((s) => s.trackId === trackFilter);
    }
    if (floorFilter) {
      result = result.filter((s) => s.venueId === floorFilter);
    }

    // Sorting
    const { columnAccessor, direction } = sortStatus;
    result.sort((a, b) => {
      let cmp = 0;
      switch (columnAccessor) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "startTime":
          cmp =
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case "endTime":
          cmp = new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
          break;
        case "duration":
          cmp =
            getDurationMinutes(a.startTime, a.endTime) -
            getDurationMinutes(b.startTime, b.endTime);
          break;
        case "room":
          cmp = (a.room?.name ?? "").localeCompare(b.room?.name ?? "");
          break;
        case "sessionType":
          cmp = (a.sessionType?.name ?? "").localeCompare(
            b.sessionType?.name ?? "",
          );
          break;
        case "track":
          cmp = (a.track?.name ?? "").localeCompare(b.track?.name ?? "");
          break;
        case "isPublished":
          cmp = (a.isPublished ? 1 : 0) - (b.isPublished ? 1 : 0);
          break;
        case "slides":
          cmp = (a.slidesUrl ? 1 : 0) - (b.slidesUrl ? 1 : 0);
          break;
        case "venue":
          cmp = (a.venue?.name ?? "").localeCompare(b.venue?.name ?? "");
          break;
        default:
          cmp = 0;
      }
      return direction === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    sessions,
    search,
    roomFilter,
    typeFilter,
    trackFilter,
    floorFilter,
    sortStatus,
  ]);

  const roomOptions = useMemo(
    () => rooms.map((r) => ({ value: r.id, label: r.name })),
    [rooms],
  );

  const typeOptions = useMemo(
    () => sessionTypes.map((t) => ({ value: t.id, label: t.name })),
    [sessionTypes],
  );

  const trackOptions = useMemo(
    () => tracks.map((t) => ({ value: t.id, label: t.name })),
    [tracks],
  );

  const floorOptions = useMemo(() => {
    const venueMap = new Map<string, string>();
    for (const s of sessions) {
      if (s.venueId && s.venue) {
        venueMap.set(s.venueId, s.venue.name);
      }
    }
    return Array.from(venueMap.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }));
  }, [sessions]);

  return (
    <div className="ms-table-container">
      {/* Filter bar */}
      <Group gap="xs" mb="sm" wrap="wrap">
        <TextInput
          placeholder="Search title or speaker..."
          leftSection={<IconSearch size={14} />}
          size="xs"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ minWidth: 200 }}
        />
        {roomOptions.length > 0 && (
          <Select
            placeholder="Room"
            size="xs"
            clearable
            data={roomOptions}
            value={roomFilter}
            onChange={setRoomFilter}
            style={{ minWidth: 130 }}
          />
        )}
        {typeOptions.length > 0 && (
          <Select
            placeholder="Session Type"
            size="xs"
            clearable
            data={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ minWidth: 150 }}
          />
        )}
        {trackOptions.length > 0 && (
          <Select
            placeholder="Track"
            size="xs"
            clearable
            data={trackOptions}
            value={trackFilter}
            onChange={setTrackFilter}
            style={{ minWidth: 130 }}
          />
        )}
        {showFloorColumn && floorOptions.length > 0 && (
          <Select
            placeholder="Floor"
            size="xs"
            clearable
            data={floorOptions}
            value={floorFilter}
            onChange={setFloorFilter}
            style={{ minWidth: 130 }}
          />
        )}
      </Group>

      <DataTable
        minHeight={200}
        noRecordsText="No sessions match your filters"
        records={filteredSessions}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        highlightOnHover
        onRowClick={
          onViewDetail ? ({ record }) => onViewDetail(record) : undefined
        }
        style={onViewDetail ? { cursor: "pointer" } : undefined}
        columns={[
          {
            accessor: "title",
            title: "Title",
            sortable: true,
            width: 250,
            render: (session) => (
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={500} lineClamp={1}>
                  {session.title}
                </Text>
                {!session.isPublished && (
                  <Badge size="xs" color="yellow" variant="light">
                    Draft
                  </Badge>
                )}
              </Group>
            ),
          },
          ...(showFloorColumn
            ? [
                {
                  accessor: "venue" as const,
                  title: "Floor",
                  sortable: true,
                  width: 120,
                  render: (session: FloorSession) =>
                    session.venue ? (
                      <Badge size="xs" variant="light" color="indigo">
                        {session.venue.name}
                      </Badge>
                    ) : (
                      <Text size="xs" c="dimmed">
                        -
                      </Text>
                    ),
                },
              ]
            : []),
          {
            accessor: "speakers",
            title: "Speakers",
            width: 200,
            render: (session) => {
              const names = [
                ...session.sessionSpeakers.map((s) =>
                  getDisplayName(s.user, "Unknown"),
                ),
                ...session.speakers,
              ];
              if (names.length === 0)
                return (
                  <Text size="xs" c="dimmed">
                    -
                  </Text>
                );
              return (
                <Group gap={4} wrap="nowrap">
                  {session.sessionSpeakers.slice(0, 3).map((s) => (
                    <Tooltip
                      key={s.user.id}
                      label={getDisplayName(s.user, "Unknown")}
                    >
                      <Avatar
                        src={s.user.image}
                        size={22}
                        radius="xl"
                        alt={getDisplayName(s.user, "Unknown")}
                      >
                        {(
                          s.user.firstName?.[0] ??
                          s.user.name?.[0] ??
                          "?"
                        ).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  ))}
                  <Text size="xs" lineClamp={1}>
                    {names.join(", ")}
                  </Text>
                </Group>
              );
            },
          },
          {
            accessor: "startTime",
            title: "Date",
            sortable: true,
            width: 110,
            render: (session) => (
              <Text size="xs">{formatDate(session.startTime)}</Text>
            ),
          },
          {
            accessor: "time",
            title: "Time",
            width: 130,
            render: (session) => (
              <Text size="xs">
                {formatTime(session.startTime)} – {formatTime(session.endTime)}
              </Text>
            ),
          },
          {
            accessor: "duration",
            title: "Dur.",
            sortable: true,
            width: 60,
            render: (session) => (
              <Text size="xs">
                {formatDuration(
                  getDurationMinutes(session.startTime, session.endTime),
                )}
              </Text>
            ),
          },
          {
            accessor: "room",
            title: "Room",
            sortable: true,
            width: 100,
            render: (session) =>
              session.room ? (
                <Badge size="xs" variant="light" color="teal">
                  {session.room.name}
                </Badge>
              ) : (
                <Text size="xs" c="dimmed">
                  -
                </Text>
              ),
          },
          {
            accessor: "sessionType",
            title: "Type",
            sortable: true,
            width: 110,
            render: (session) =>
              session.sessionType ? (
                <Badge
                  size="xs"
                  variant="light"
                  style={{
                    backgroundColor: `${session.sessionType.color}20`,
                    color: session.sessionType.color,
                  }}
                >
                  {session.sessionType.name}
                </Badge>
              ) : (
                <Text size="xs" c="dimmed">
                  -
                </Text>
              ),
          },
          {
            accessor: "track",
            title: "Track",
            sortable: true,
            width: 110,
            render: (session) =>
              session.track ? (
                <Badge
                  size="xs"
                  variant="light"
                  style={{
                    backgroundColor: `${session.track.color}20`,
                    color: session.track.color,
                  }}
                >
                  {session.track.name}
                </Badge>
              ) : (
                <Text size="xs" c="dimmed">
                  -
                </Text>
              ),
          },
          {
            accessor: "slides",
            title: "Slides",
            sortable: true,
            width: 90,
            render: (session) =>
              session.slidesUrl ? (
                <Tooltip label={session.slidesFileName ?? "Slides uploaded"}>
                  <Badge
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconFile size={10} />}
                  >
                    Uploaded
                  </Badge>
                </Tooltip>
              ) : (
                <Text size="xs" c="dimmed">
                  —
                </Text>
              ),
          },
          {
            accessor: "comments",
            title: "",
            width: 50,
            render: (session) => {
              const count = session._count?.comments ?? 0;
              return (
                <Tooltip
                  label={`${String(count)} comment${count !== 1 ? "s" : ""}`}
                >
                  <ActionIcon
                    variant="subtle"
                    color={count > 0 ? "blue" : "gray"}
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onOpenComments(session.id, session.title);
                    }}
                  >
                    <Group gap={2} wrap="nowrap">
                      <IconMessageCircle size={14} />
                      {count > 0 && (
                        <Text size="xs" fw={600}>
                          {count}
                        </Text>
                      )}
                    </Group>
                  </ActionIcon>
                </Tooltip>
              );
            },
          },
          {
            accessor: "actions",
            title: "",
            width: 70,
            render: (session) => (
              <Group gap={4} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onEdit(session);
                  }}
                >
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  loading={isDeleting}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
      />
    </div>
  );
}
