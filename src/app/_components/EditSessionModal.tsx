"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Stack,
  Text,
  Group,
  Badge,
  Button,
  TextInput,
  Textarea,
  Select,
  Switch,
  ActionIcon,
  Avatar,
  Paper,
  Loader,
  Modal,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconX,
  IconSearch,
  IconUserPlus,
  IconLink,
  IconDoor,
  IconBuilding,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { UserSearchSelect } from "~/app/_components/UserSearchSelect";
import { getDisplayName } from "~/utils/userDisplay";
import { QuickAddSpeakerModal } from "~/app/_components/QuickAddSpeakerModal";

// ──────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────

export interface SelectedSpeaker {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

export const PARTICIPANT_ROLES = [
  "Speaker",
  "Facilitator",
  "Moderator",
  "Presenter",
  "Panelist",
  "Host",
] as const;

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export interface SelectedSpeakerWithRole {
  user: SelectedSpeaker;
  role: ParticipantRole;
}

export type FloorSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  roomId: string | null;
  sessionTypeId: string | null;
  trackId: string | null;
  order: number;
  isPublished: boolean;
  venue: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    role: string;
    user: SelectedSpeaker;
  }>;
  _count?: { comments: number };
  slidesUrl?: string | null;
  slidesFileName?: string | null;
  slidesUploadedAt?: Date | null;
};

export type VenueRoom = {
  id: string;
  name: string;
  capacity: number | null;
  order: number;
};

// ──────────────────────────────────────────
// UTC/Local date conversion helpers
// ──────────────────────────────────────────

/**
 * Convert a local Date (from DateTimePicker) to a UTC-equivalent Date.
 * When user picks "3:00 PM" in their local timezone, this ensures it's
 * stored as 15:00 UTC so that all UTC-based displays show "3:00 PM".
 */
export function localToUTC(date: Date | null | undefined): Date {
  if (!date) return new Date();
  const d = new Date(
    date instanceof Date ? date.getTime() : (date as string | number),
  );
  if (isNaN(d.getTime())) return new Date();
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    ),
  );
}

/**
 * Convert a UTC Date (from database) to a local-equivalent Date for DateTimePicker.
 * When the database has 15:00 UTC, this creates a local Date that shows "3:00 PM"
 * in the DateTimePicker regardless of the user's timezone.
 */
export function utcToLocal(date: Date | null | undefined): Date {
  if (!date) return new Date();
  const d = new Date(
    date instanceof Date ? date.getTime() : (date as string | number),
  );
  if (isNaN(d.getTime())) return new Date();
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

// ──────────────────────────────────────────
// FloorApplicantSearchSelect (internal)
// ──────────────────────────────────────────

interface FloorApplicantSearchSelectProps {
  venueId: string;
  onSelect: (user: SelectedSpeaker) => void;
  excludeUserIds?: string[];
  placeholder?: string;
}

function FloorApplicantSearchSelect({
  venueId,
  onSelect,
  excludeUserIds = [],
  placeholder = "Search floor applicants...",
}: FloorApplicantSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } =
    api.schedule.searchFloorApplicants.useQuery(
      { venueId, query: searchQuery, limit: 10 },
      { enabled: searchQuery.length > 0 },
    );

  const filteredResults =
    searchResults?.filter((user) => !excludeUserIds.includes(user.id)) ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (user: SelectedSpeaker) => {
    onSelect(user);
    setSearchQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(0);
  };

  return (
    <div style={{ position: "relative" }}>
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleInputChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
        leftSection={<IconSearch size={16} />}
        rightSection={isLoading ? <Loader size="xs" /> : null}
      />

      {isOpen && searchQuery.length > 0 && (
        <Paper
          ref={dropdownRef}
          shadow="md"
          p="xs"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          ) : filteredResults.length > 0 ? (
            <Stack gap="xs">
              {filteredResults.map((user, index) => (
                <Paper
                  key={user.id}
                  p="xs"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      index === selectedIndex
                        ? "var(--mantine-color-gray-1)"
                        : "transparent",
                  }}
                  onClick={() => handleSelect(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Group gap="sm">
                    <Avatar
                      src={user.image}
                      alt={getDisplayName(user, "User")}
                      size="sm"
                    />
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {getDisplayName(user, "Unknown")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" ta="center" p="md">
              No floor applicants found
            </Text>
          )}
        </Paper>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// SpeakerSelector
// ──────────────────────────────────────────

interface SpeakerSelectorProps {
  linkedSpeakers: SelectedSpeakerWithRole[];
  onAddLinkedSpeaker: (user: SelectedSpeaker) => void;
  onRemoveLinkedSpeaker: (userId: string) => void;
  onChangeSpeakerRole: (userId: string, role: ParticipantRole) => void;
  textSpeakers: string;
  onTextSpeakersChange: (value: string) => void;
  venueId?: string;
  isAdmin?: boolean;
  eventId: string;
  sessionTitle?: string;
  sessionDate?: string;
  sessionTime?: string;
  roomName?: string;
}

export function SpeakerSelector({
  linkedSpeakers,
  onAddLinkedSpeaker,
  onRemoveLinkedSpeaker,
  onChangeSpeakerRole,
  textSpeakers,
  onTextSpeakersChange,
  venueId,
  isAdmin,
  eventId,
  sessionTitle,
  sessionDate,
  sessionTime,
  roomName,
}: SpeakerSelectorProps) {
  const useFloorSearch = venueId && !isAdmin;
  const [quickAddOpened, { open: openQuickAdd, close: closeQuickAdd }] =
    useDisclosure(false);
  const [prefillName, setPrefillName] = useState<string | null>(null);

  // Parse text speakers for linking UI
  const textSpeakerNames = textSpeakers
    ? textSpeakers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Split a full name into first/last name parts (best-effort heuristic)
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
    const last = parts.pop() ?? "";
    return { first: parts.join(" "), last };
  };

  const handleQuickAddSuccess = (user: SelectedSpeaker) => {
    onAddLinkedSpeaker(user);
    // If triggered from a text speaker, remove that name from the text list
    if (prefillName) {
      const remaining = textSpeakerNames.filter(
        (name) => name.toLowerCase() !== prefillName.toLowerCase(),
      );
      onTextSpeakersChange(remaining.join(", "));
      setPrefillName(null);
    }
  };

  const handleLinkTextSpeaker = (name: string) => {
    setPrefillName(name);
    openQuickAdd();
  };

  const prefillParts = prefillName ? splitName(prefillName) : null;

  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Participants
        </Text>
        {useFloorSearch ? (
          <FloorApplicantSearchSelect
            venueId={venueId}
            onSelect={onAddLinkedSpeaker}
            excludeUserIds={linkedSpeakers.map((s) => s.user.id)}
            placeholder="Search floor applicants by name or email..."
          />
        ) : (
          <UserSearchSelect
            onSelect={onAddLinkedSpeaker}
            excludeUserIds={linkedSpeakers.map((s) => s.user.id)}
            placeholder="Search by name or email..."
          />
        )}
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconUserPlus size={14} />}
          onClick={() => {
            setPrefillName(null);
            openQuickAdd();
          }}
          mt={4}
        >
          Add new person
        </Button>
      </div>
      {linkedSpeakers.length > 0 && (
        <Stack gap={6}>
          {linkedSpeakers.map((speakerWithRole) => (
            <Group key={speakerWithRole.user.id} gap="xs" wrap="nowrap">
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() =>
                      onRemoveLinkedSpeaker(speakerWithRole.user.id)
                    }
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
                style={{ flex: 1, maxWidth: "fit-content" }}
              >
                {getDisplayName(speakerWithRole.user, "Unknown")}
              </Badge>
              <Select
                size="xs"
                w={130}
                data={PARTICIPANT_ROLES as unknown as string[]}
                value={speakerWithRole.role}
                onChange={(val) => {
                  if (val)
                    onChangeSpeakerRole(
                      speakerWithRole.user.id,
                      val as ParticipantRole,
                    );
                }}
                allowDeselect={false}
              />
            </Group>
          ))}
        </Stack>
      )}
      <TextInput
        label="Additional Names"
        description="Comma-separated names for people not in the system (no role assignment)"
        value={textSpeakers}
        onChange={(e) => onTextSpeakersChange(e.currentTarget.value)}
      />
      {textSpeakerNames.length > 0 && (
        <Group gap={4} wrap="wrap">
          {textSpeakerNames.map((name, idx) => (
            <Badge
              key={`${name}-${idx}`}
              variant="outline"
              size="sm"
              rightSection={
                <ActionIcon
                  size="xs"
                  variant="transparent"
                  onClick={() => handleLinkTextSpeaker(name)}
                  title={`Link "${name}" to a user account`}
                >
                  <IconLink size={10} />
                </ActionIcon>
              }
            >
              {name}
            </Badge>
          ))}
          <Text size="xs" c="dimmed">
            Click to link to a user account
          </Text>
        </Group>
      )}

      <QuickAddSpeakerModal
        opened={quickAddOpened}
        onClose={closeQuickAdd}
        eventId={eventId}
        venueId={venueId}
        onSpeakerCreated={handleQuickAddSuccess}
        prefillFirstName={prefillParts?.first}
        prefillLastName={prefillParts?.last}
        sessionTitle={sessionTitle}
        sessionDate={sessionDate}
        sessionTime={sessionTime}
        roomName={roomName}
      />
    </Stack>
  );
}

// ──────────────────────────────────────────
// EditSessionModal
// ──────────────────────────────────────────

export interface EditSessionModalProps {
  opened: boolean;
  onClose: () => void;
  session: FloorSession;
  eventId: string;
  venueId?: string;
  venues?: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  rooms: Array<{ id: string; name: string }>;
  sessionTypes: Array<{ id: string; name: string; color: string }>;
  tracks: Array<{ id: string; name: string; color: string }>;
  isAdmin: boolean;
  isSpeakerOnly?: boolean;
  onSuccess?: () => void;
}

export default function EditSessionModal({
  opened,
  onClose,
  session,
  eventId,
  venueId,
  venues,
  rooms,
  sessionTypes,
  tracks,
  isAdmin,
  isSpeakerOnly = false,
  onSuccess,
}: EditSessionModalProps) {
  const utils = api.useUtils();

  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [startTime, setStartTime] = useState<Date | null>(
    utcToLocal(new Date(session.startTime)),
  );
  const [endTime, setEndTime] = useState<Date | null>(
    utcToLocal(new Date(session.endTime)),
  );
  const [linkedSpeakers, setLinkedSpeakers] = useState<
    SelectedSpeakerWithRole[]
  >(
    session.sessionSpeakers.map((s) => ({
      user: s.user,
      role: s.role as ParticipantRole,
    })),
  );
  const [textSpeakers, setTextSpeakers] = useState(session.speakers.join(", "));
  const [roomId, setRoomId] = useState<string | null>(session.roomId);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(
    session.sessionTypeId,
  );
  const [trackId, setTrackId] = useState<string | null>(session.trackId);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    session.venueId ?? venueId ?? null,
  );
  const [isPublished, setIsPublished] = useState(session.isPublished);

  const filteredRooms = useMemo(() => {
    if (venues && selectedVenueId) {
      const venue = venues.find((v) => v.id === selectedVenueId);
      return venue?.rooms ?? [];
    }
    return rooms;
  }, [venues, selectedVenueId, rooms]);

  const updateMutation = api.schedule.updateSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Session updated",
        color: "green",
      });
      if (venueId) {
        void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      }
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    if (isSpeakerOnly) {
      if (!title) {
        notifications.show({
          title: "Missing fields",
          message: "Title is required",
          color: "orange",
        });
        return;
      }
      updateMutation.mutate({
        id: session.id,
        title,
        description: description || null,
      });
      return;
    }
    if (!title || !startTime || !endTime) {
      notifications.show({
        title: "Missing fields",
        message: "Title, start time, and end time are required",
        color: "orange",
      });
      return;
    }
    updateMutation.mutate({
      id: session.id,
      title,
      description: description || null,
      startTime: localToUTC(startTime),
      endTime: localToUTC(endTime),
      speakers: textSpeakers
        ? textSpeakers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      linkedSpeakers: linkedSpeakers.map((s) => ({
        userId: s.user.id,
        role: s.role,
      })),
      venueId: selectedVenueId ?? null,
      roomId: roomId ?? null,
      sessionTypeId: sessionTypeId ?? null,
      trackId: trackId ?? null,
      isPublished,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Session" size="lg">
      <Stack gap="sm">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        {!isSpeakerOnly && (
          <>
            <Group grow>
              <DateTimePicker
                label="Start Time"
                value={startTime}
                onChange={(val) => setStartTime(val as Date | null)}
                required
              />
              <DateTimePicker
                label="End Time"
                value={endTime}
                onChange={(val) => setEndTime(val as Date | null)}
                required
              />
            </Group>
            <SpeakerSelector
              linkedSpeakers={linkedSpeakers}
              onAddLinkedSpeaker={(user) =>
                setLinkedSpeakers((prev) => [
                  ...prev,
                  { user, role: "Speaker" },
                ])
              }
              onRemoveLinkedSpeaker={(userId) =>
                setLinkedSpeakers((prev) =>
                  prev.filter((s) => s.user.id !== userId),
                )
              }
              onChangeSpeakerRole={(userId, role) =>
                setLinkedSpeakers((prev) =>
                  prev.map((s) => (s.user.id === userId ? { ...s, role } : s)),
                )
              }
              textSpeakers={textSpeakers}
              onTextSpeakersChange={setTextSpeakers}
              venueId={venueId}
              isAdmin={isAdmin}
              eventId={eventId}
              sessionTitle={title}
              sessionDate={
                startTime
                  ? startTime.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : undefined
              }
              sessionTime={
                startTime && endTime
                  ? `${startTime.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })} – ${endTime.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : undefined
              }
              roomName={
                roomId
                  ? rooms.find((r) => r.id === roomId)?.name
                  : undefined
              }
            />
            {venues && venues.length > 0 && (
              <Select
                label="Venue / Floor"
                placeholder="Select venue"
                data={venues.map((v) => ({ value: v.id, label: v.name }))}
                value={selectedVenueId}
                onChange={(val) => {
                  setSelectedVenueId(val);
                  setRoomId(null);
                }}
                clearable
                leftSection={<IconBuilding size={14} />}
              />
            )}
            {filteredRooms.length > 0 && (
              <Select
                label="Room"
                placeholder="Select room"
                data={filteredRooms.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
                value={roomId}
                onChange={setRoomId}
                clearable
                leftSection={<IconDoor size={14} />}
              />
            )}
            {sessionTypes.length > 0 && (
              <Select
                label="Session Type"
                placeholder="Select type"
                data={sessionTypes.map((st) => ({
                  value: st.id,
                  label: st.name,
                }))}
                value={sessionTypeId}
                onChange={setSessionTypeId}
                clearable
              />
            )}
            {tracks.length > 0 && (
              <Select
                label="Track"
                placeholder="Select track"
                data={tracks.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                value={trackId}
                onChange={setTrackId}
                clearable
              />
            )}
            <Switch
              label="Published"
              description="Published sessions are visible on the public schedule"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.currentTarget.checked)}
            />
          </>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
