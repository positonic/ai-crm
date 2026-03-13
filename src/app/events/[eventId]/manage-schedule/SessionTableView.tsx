"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Badge,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Avatar,
  Checkbox,
  Button,
  Loader,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconMessageCircle,
  IconSearch,
  IconFile,
  IconDoor,
  IconCheck,
  IconX,
  IconExternalLink,
} from "@tabler/icons-react";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { getDisplayName } from "~/utils/userDisplay";
import { type FloorSession } from "~/app/_components/EditSessionModal";

type EditableField =
  | "title"
  | "room"
  | "sessionType"
  | "track"
  | "time"
  | "venue";

interface EditingCell {
  sessionId: string;
  field: EditableField;
}

interface SessionUpdateData {
  id: string;
  title?: string;
  roomId?: string | null;
  sessionTypeId?: string | null;
  trackId?: string | null;
  startTime?: Date;
  endTime?: Date;
  venueId?: string | null;
}

interface SessionTableViewProps {
  sessions: FloorSession[];
  rooms: Array<{ id: string; name: string; venueId?: string }>;
  sessionTypes: Array<{ id: string; name: string; color: string }>;
  tracks: Array<{ id: string; name: string; color: string }>;
  onEdit: (session: FloorSession) => void;
  onDelete: (sessionId: string) => void;
  onBulkDelete?: (sessionIds: string[]) => void;
  onBulkAssignRoom?: (sessionIds: string[], roomId: string) => void;
  onOpenComments: (sessionId: string, sessionTitle: string) => void;
  isDeleting: boolean;
  isBulkDeleting?: boolean;
  isBulkAssigningRoom?: boolean;
  onViewDetail?: (session: FloorSession) => void;
  showFloorColumn?: boolean;
  onUpdateSession?: (data: SessionUpdateData) => void;
  isUpdating?: boolean;
  venues?: Array<{ id: string; name: string }>;
  eventId: string;
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

/** Get HH:mm string in UTC from a Date */
function toTimeString(date: Date): string {
  const d = new Date(date);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
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
  onBulkDelete,
  onBulkAssignRoom,
  onOpenComments,
  isDeleting,
  isBulkDeleting,
  isBulkAssigningRoom,
  onViewDetail,
  showFloorColumn,
  onUpdateSession,
  isUpdating,
  venues,
  eventId,
}: SessionTableViewProps) {
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRoomId, setBulkRoomId] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<FloorSession>
  >({
    columnAccessor: "startTime",
    direction: "asc",
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isEditing = useCallback(
    (sessionId: string, field: EditableField) =>
      editingCell?.sessionId === sessionId && editingCell.field === field,
    [editingCell],
  );

  const startEditing = useCallback(
    (session: FloorSession, field: EditableField, e: React.MouseEvent) => {
      if (!onUpdateSession) return;
      e.stopPropagation();
      if (field === "title") {
        setEditTitle(session.title);
      } else if (field === "time") {
        setEditStartTime(toTimeString(session.startTime));
        setEditEndTime(toTimeString(session.endTime));
      }
      setEditingCell({ sessionId: session.id, field });
    },
    [onUpdateSession],
  );

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const saveTitle = useCallback(
    (sessionId: string) => {
      const trimmed = editTitle.trim();
      if (trimmed && onUpdateSession) {
        onUpdateSession({ id: sessionId, title: trimmed });
      }
      setEditingCell(null);
    },
    [editTitle, onUpdateSession],
  );

  const saveTime = useCallback(
    (session: FloorSession) => {
      if (!onUpdateSession) return;
      const baseDate = new Date(session.startTime);
      const year = baseDate.getUTCFullYear();
      const month = baseDate.getUTCMonth();
      const day = baseDate.getUTCDate();

      const [startH, startM] = editStartTime.split(":").map(Number);
      const [endH, endM] = editEndTime.split(":").map(Number);

      if (
        startH == null ||
        startM == null ||
        endH == null ||
        endM == null ||
        isNaN(startH) ||
        isNaN(startM) ||
        isNaN(endH) ||
        isNaN(endM)
      ) {
        setEditingCell(null);
        return;
      }

      const newStart = new Date(Date.UTC(year, month, day, startH, startM));
      const newEnd = new Date(Date.UTC(year, month, day, endH, endM));

      if (newEnd > newStart) {
        onUpdateSession({
          id: session.id,
          startTime: newStart,
          endTime: newEnd,
        });
      }
      setEditingCell(null);
    },
    [editStartTime, editEndTime, onUpdateSession],
  );

  const handleSelectChange = useCallback(
    (
      sessionId: string,
      field: "roomId" | "sessionTypeId" | "trackId" | "venueId",
      value: string | null,
    ) => {
      if (!onUpdateSession) return;
      onUpdateSession({ id: sessionId, [field]: value });
      setEditingCell(null);
    },
    [onUpdateSession],
  );

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

  const roomOptionsByVenue = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string }>>();
    for (const r of rooms) {
      if (r.venueId) {
        const list = map.get(r.venueId) ?? [];
        list.push({ value: r.id, label: r.name });
        map.set(r.venueId, list);
      }
    }
    return map;
  }, [rooms]);

  const typeOptions = useMemo(
    () => sessionTypes.map((t) => ({ value: t.id, label: t.name })),
    [sessionTypes],
  );

  const trackOptions = useMemo(
    () => tracks.map((t) => ({ value: t.id, label: t.name })),
    [tracks],
  );

  const venueOptions = useMemo(() => {
    if (venues) {
      return venues.map((v) => ({ value: v.id, label: v.name }));
    }
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
  }, [sessions, venues]);

  const canEdit = !!onUpdateSession;

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
        {showFloorColumn && venueOptions.length > 0 && (
          <Select
            placeholder="Floor"
            size="xs"
            clearable
            data={venueOptions}
            value={floorFilter}
            onChange={setFloorFilter}
            style={{ minWidth: 130 }}
          />
        )}
      </Group>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <Group gap="sm" mb="sm">
          <Text size="sm" fw={500}>
            {selectedIds.size} selected
          </Text>
          {onBulkAssignRoom && roomOptions.length > 0 && (
            <>
              <Select
                placeholder="Room"
                size="xs"
                clearable
                data={roomOptions}
                value={bulkRoomId}
                onChange={setBulkRoomId}
                leftSection={<IconDoor size={14} />}
                style={{ minWidth: 150 }}
              />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDoor size={14} />}
                loading={isBulkAssigningRoom}
                disabled={!bulkRoomId}
                onClick={() => {
                  if (bulkRoomId) {
                    onBulkAssignRoom(Array.from(selectedIds), bulkRoomId);
                  }
                }}
              >
                Assign room for selected
              </Button>
            </>
          )}
          {onBulkDelete && (
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              loading={isBulkDeleting}
              onClick={() => onBulkDelete(Array.from(selectedIds))}
            >
              Delete selected
            </Button>
          )}
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </Group>
      )}

      <DataTable
        minHeight={200}
        noRecordsText="No sessions match your filters"
        records={filteredSessions}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        highlightOnHover
        onRowClick={
          editingCell
            ? undefined
            : onViewDetail
              ? ({ record }) => onViewDetail(record)
              : undefined
        }
        style={
          !editingCell && onViewDetail ? { cursor: "pointer" } : undefined
        }
        columns={[
          ...(onBulkDelete ?? onBulkAssignRoom
            ? [
                {
                  accessor: "select" as const,
                  title: (
                    <Checkbox
                      size="xs"
                      checked={
                        filteredSessions.length > 0 &&
                        filteredSessions.every((s) => selectedIds.has(s.id))
                      }
                      indeterminate={
                        filteredSessions.some((s) => selectedIds.has(s.id)) &&
                        !filteredSessions.every((s) => selectedIds.has(s.id))
                      }
                      onChange={() => {
                        const allSelected = filteredSessions.every((s) =>
                          selectedIds.has(s.id),
                        );
                        if (allSelected) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(
                            new Set(filteredSessions.map((s) => s.id)),
                          );
                        }
                      }}
                    />
                  ),
                  width: 40,
                  render: (session: FloorSession) => (
                    <Checkbox
                      size="xs"
                      checked={selectedIds.has(session.id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(session.id)) {
                            next.delete(session.id);
                          } else {
                            next.add(session.id);
                          }
                          return next;
                        });
                      }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  ),
                },
              ]
            : []),
          {
            accessor: "title",
            title: "Title",
            sortable: true,
            width: 250,
            render: (session) => {
              if (isEditing(session.id, "title")) {
                return (
                  <Group gap={4} wrap="nowrap">
                    <TextInput
                      ref={titleInputRef}
                      size="xs"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(session.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={() => saveTitle(session.id)}
                      autoFocus
                      style={{ flex: 1 }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  </Group>
                );
              }
              return (
                <Group
                  gap={6}
                  wrap="nowrap"
                  onClick={
                    canEdit
                      ? (e) => startEditing(session, "title", e)
                      : undefined
                  }
                  style={canEdit ? { cursor: "text" } : undefined}
                >
                  <Text size="sm" fw={500} lineClamp={1}>
                    {session.title}
                  </Text>
                  {!session.isPublished && (
                    <Badge size="xs" color="yellow" variant="light">
                      Draft
                    </Badge>
                  )}
                </Group>
              );
            },
          },
          ...(showFloorColumn
            ? [
                {
                  accessor: "venue" as const,
                  title: "Floor",
                  sortable: true,
                  width: 120,
                  render: (session: FloorSession) => {
                    if (isEditing(session.id, "venue")) {
                      return (
                        <Select
                          size="xs"
                          data={venueOptions}
                          value={session.venueId}
                          onChange={(val) =>
                            handleSelectChange(session.id, "venueId", val)
                          }
                          clearable
                          autoFocus
                          onClick={(e: React.MouseEvent) =>
                            e.stopPropagation()
                          }
                          onBlur={cancelEditing}
                          comboboxProps={{ withinPortal: true }}
                          style={{ minWidth: 100 }}
                        />
                      );
                    }
                    return (
                      <div
                        onClick={
                          canEdit
                            ? (e) => startEditing(session, "venue", e)
                            : undefined
                        }
                        style={canEdit ? { cursor: "pointer" } : undefined}
                      >
                        {session.venue ? (
                          <Badge size="xs" variant="light" color="indigo">
                            {session.venue.name}
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )}
                      </div>
                    );
                  },
                },
              ]
            : []),
          {
            accessor: "speakers",
            title: "Speakers",
            width: 200,
            render: (session) => {
              const names = [
                ...session.sessionSpeakers.map((s) => {
                  const name = getDisplayName(s.user, "Unknown");
                  const org = s.user.profile?.company;
                  return org ? `${name} (${org})` : name;
                }),
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
                  {session.sessionSpeakers.slice(0, 3).map((s) => {
                    const displayName = getDisplayName(s.user, "Unknown");
                    const org = s.user.profile?.company;
                    const tooltipLabel = org ? `${displayName} (${org})` : displayName;
                    return (
                    <Tooltip
                      key={s.user.id}
                      label={tooltipLabel}
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
                  );
                  })}
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
            width: 160,
            render: (session) => {
              if (isEditing(session.id, "time")) {
                return (
                  <Group gap={4} wrap="nowrap">
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: 55,
                        fontSize: 12,
                        padding: "2px 4px",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 4,
                        background: "var(--mantine-color-body)",
                        color: "var(--mantine-color-text)",
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      –
                    </Text>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 55,
                        fontSize: 12,
                        padding: "2px 4px",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: 4,
                        background: "var(--mantine-color-body)",
                        color: "var(--mantine-color-text)",
                      }}
                    />
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="green"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        saveTime(session);
                      }}
                    >
                      <IconCheck size={12} />
                    </ActionIcon>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        cancelEditing();
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                );
              }
              return (
                <Text
                  size="xs"
                  onClick={
                    canEdit
                      ? (e) => startEditing(session, "time", e)
                      : undefined
                  }
                  style={canEdit ? { cursor: "pointer" } : undefined}
                >
                  {formatTime(session.startTime)} –{" "}
                  {formatTime(session.endTime)}
                </Text>
              );
            },
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
            width: 130,
            render: (session) => {
              if (isEditing(session.id, "room")) {
                const venueRooms = session.venueId
                  ? (roomOptionsByVenue.get(session.venueId) ?? roomOptions)
                  : roomOptions;
                return (
                  <Select
                    size="xs"
                    data={venueRooms}
                    value={session.roomId}
                    onChange={(val) =>
                      handleSelectChange(session.id, "roomId", val)
                    }
                    clearable
                    autoFocus
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    onBlur={cancelEditing}
                    comboboxProps={{ withinPortal: true }}
                    style={{ minWidth: 100 }}
                  />
                );
              }
              return (
                <div
                  onClick={
                    canEdit
                      ? (e) => startEditing(session, "room", e)
                      : undefined
                  }
                  style={canEdit ? { cursor: "pointer" } : undefined}
                >
                  {session.room ? (
                    <Badge size="xs" variant="light" color="teal">
                      {session.room.name}
                    </Badge>
                  ) : (
                    <Text size="xs" c="dimmed">
                      -
                    </Text>
                  )}
                </div>
              );
            },
          },
          {
            accessor: "sessionType",
            title: "Type",
            sortable: true,
            width: 140,
            render: (session) => {
              if (isEditing(session.id, "sessionType")) {
                return (
                  <Select
                    size="xs"
                    data={typeOptions}
                    value={session.sessionTypeId}
                    onChange={(val) =>
                      handleSelectChange(session.id, "sessionTypeId", val)
                    }
                    clearable
                    autoFocus
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    onBlur={cancelEditing}
                    comboboxProps={{ withinPortal: true }}
                    style={{ minWidth: 110 }}
                  />
                );
              }
              return (
                <div
                  onClick={
                    canEdit
                      ? (e) => startEditing(session, "sessionType", e)
                      : undefined
                  }
                  style={canEdit ? { cursor: "pointer" } : undefined}
                >
                  {session.sessionType ? (
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
                  )}
                </div>
              );
            },
          },
          {
            accessor: "track",
            title: "Track",
            sortable: true,
            width: 140,
            render: (session) => {
              if (isEditing(session.id, "track")) {
                return (
                  <Select
                    size="xs"
                    data={trackOptions}
                    value={session.trackId}
                    onChange={(val) =>
                      handleSelectChange(session.id, "trackId", val)
                    }
                    clearable
                    autoFocus
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    onBlur={cancelEditing}
                    comboboxProps={{ withinPortal: true }}
                    style={{ minWidth: 110 }}
                  />
                );
              }
              return (
                <div
                  onClick={
                    canEdit
                      ? (e) => startEditing(session, "track", e)
                      : undefined
                  }
                  style={canEdit ? { cursor: "pointer" } : undefined}
                >
                  {session.track ? (
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
                  )}
                </div>
              );
            },
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
            title: isUpdating ? (
              <Loader size={14} />
            ) : (
              ""
            ),
            width: 100,
            render: (session) => (
              <Group gap={4} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  component="a"
                  href={`/events/${eventId}/schedule/${session.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <IconExternalLink size={14} />
                </ActionIcon>
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
