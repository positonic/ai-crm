"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Badge,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Modal,
  ActionIcon,
  Select,
  Switch,
  Avatar,
  Collapse,
  Table,
  Stepper,
  FileInput,
  Checkbox,
  Alert,
  ScrollArea,
  Tooltip,
  SegmentedControl,
  Divider,
  Anchor,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconClock,
  IconUsers,
  IconFileText,
  IconDownload,
  IconDoor,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconMessageCircle,
  IconLayoutGrid,
  IconInfoCircle,
} from "@tabler/icons-react";
import Papa from "papaparse";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { SessionTableView } from "./SessionTableView";
import { SessionTimeGrid } from "./SessionTimeGrid";
import { SessionCommentDrawer } from "./SessionCommentDrawer";
import {
  talkFormatOptions,
  talkDurationOptions,
  speakerDateOptions,
  speakerTimeSlotOptions,
} from "../apply/SpeakerApplicationForm";
import EditSessionModal, {
  SpeakerSelector,
  type SelectedSpeaker,
  type SelectedSpeakerWithRole,
  type ParticipantRole,
  type FloorSession,
  type VenueRoom,
  localToUTC,
} from "~/app/_components/EditSessionModal";
import "./manage-schedule.css";

// Re-export shared types so existing imports from this file continue to work
export type { FloorSession, VenueRoom, SelectedSpeaker };

interface ManageScheduleClientProps {
  eventId: string;
  showWelcome?: boolean;
}

interface SessionPrefillData {
  title: string;
  description: string;
  speaker: SelectedSpeaker;
  sessionTypeId: string | null;
  trackId: string | null;
}

function findMatchingSessionType(
  talkFormat: string | null | undefined,
  sessionTypes: { id: string; name: string }[],
): string | null {
  if (!talkFormat) return null;
  const lower = talkFormat.toLowerCase();
  // Try exact match first
  const exact = sessionTypes.find((st) => st.name.toLowerCase() === lower)?.id;
  if (exact) return exact;
  // Try matching first comma-separated value (for multi-select values)
  const parts = talkFormat.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    const match = sessionTypes.find((st) => st.name.toLowerCase() === part)?.id;
    if (match) return match;
  }
  return null;
}

function findMatchingTrack(
  talkTopic: string | null | undefined,
  tracks: { id: string; name: string }[],
): string | null {
  if (!talkTopic) return null;
  const lower = talkTopic.toLowerCase();
  // Try exact match first
  const exact = tracks.find((t) => t.name.toLowerCase() === lower)?.id;
  if (exact) return exact;
  // Try matching any comma-separated topic (for multi-select values)
  const parts = talkTopic.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    const match = tracks.find((t) => t.name.toLowerCase() === part)?.id;
    if (match) return match;
  }
  return null;
}

function formatDuration(duration: string | null | undefined): string {
  if (!duration) return "";
  const map: Record<string, string> = {
    "multi-hour": "Multi-hour",
    "90": "1.5 hours",
    "60": "1 hour",
    "45": "45 min",
    "30": "30 min",
  };
  return map[duration] ?? duration;
}

function formatTimeSlot(slot: string): string {
  const parts = slot.split("-");
  if (parts.length !== 2) return slot;
  const [start, end] = parts;
  if (!start || !end) return slot;
  const startHour = parseInt(start.split(":")[0] ?? "0", 10);
  const endHour = parseInt(end.split(":")[0] ?? "0", 10);
  const formatHour = (h: number) => {
    const suffix = h < 12 ? "am" : "pm";
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${String(display)}${suffix}`;
  };
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

// ──────────────────────────────────────────
// CSV Import Types & Utilities
// ──────────────────────────────────────────

interface ParsedCsvSession {
  rowIndex: number;
  title: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  presenterNames: string[];
  facilitatorNames: string[];
  matchedSpeakers: SelectedSpeakerWithRole[];
  unmatchedSpeakers: string[];
  sessionTypeName: string | null;
  sessionTypeId: string | null;
  trackName: string | null;
  trackId: string | null;
  slidesUrl: string | null;
  speakerEmails: Record<string, string>;
  order: number;
  status: "ready" | "warning" | "error";
  warnings: string[];
  errors: string[];
  included: boolean;
}

interface ColumnMapping {
  title: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  presenters: string | null;
  type: string | null;
  curator: string | null;
  track: string | null;
  description: string | null;
  facilitator: string | null;
  order: string | null;
  room: string | null;
  slidesUrl: string | null;
  speakerEmail: string | null;
}

const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  title: [
    "talk title",
    "title",
    "session title",
    "name",
    "session name",
    "session",
  ],
  date: ["date", "day", "session date"],
  startTime: ["start time", "session start time", "start", "begin", "from", "time"],
  endTime: ["end time", "session end time", "end", "to", "until"],
  duration: ["duration", "dur", "dur.", "length", "minutes", "mins"],
  presenters: [
    "presenter(s) names",
    "presenters",
    "speakers",
    "speaker",
    "speaker name",
    "speaker names",
  ],
  type: ["type", "session type", "format", "talk type", "category"],
  curator: ["curator", "topic", "stream"],
  description: [
    "description",
    "session description",
    "abstract",
    "narrative/theme",
    "narrative",
    "theme",
    "talk summary",
    "speaker summary",
    "summary",
    "details",
  ],
  facilitator: [
    "facilitator / moderator",
    "facilitator",
    "facilitators",
    "moderator",
    "chair",
  ],
  order: ["sort order", "order", "position", "#", "no"],
  room: ["room", "location", "venue", "space", "room name", "floor"],
  slidesUrl: [
    "slide link",
    "slides",
    "slides url",
    "slides link",
    "deck link",
    "deck url",
    "presentation link",
  ],
  speakerEmail: ["speaker email", "email", "presenter email", "speaker e-mail"],
  track: ["speaker deck track", "deck track", "track name", "track"],
};

function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    title: null,
    date: null,
    startTime: null,
    endTime: null,
    duration: null,
    presenters: null,
    type: null,
    curator: null,
    track: null,
    description: null,
    facilitator: null,
    order: null,
    room: null,
    slidesUrl: null,
    speakerEmail: null,
  };

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();
    // Normalize underscores to spaces for matching (e.g., "session_start_time" → "session start time")
    const normalizedHeader = lowerHeader.replace(/_/g, " ");
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as Array<
      [keyof ColumnMapping, string[]]
    >) {
      if (mapping[field]) continue; // Already mapped
      if (
        aliases.some(
          (alias) => lowerHeader === alias || normalizedHeader === alias,
        )
      ) {
        mapping[field] = header;
        break;
      }
    }
  }

  return mapping;
}

function isJunkHeaderRow(headers: string[]): boolean {
  return headers.every((h) => h === "" || /^_\d+$/.test(h));
}

function parseTimeRange(
  timeStr: string | undefined,
): { start: string; end: string } | null {
  if (!timeStr) return null;
  const match =
    /^(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-\u2013\u2014]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)$/i.exec(
      timeStr.trim(),
    );
  if (!match) return null;
  return { start: match[1]!.trim(), end: match[2]!.trim() };
}

function extractDurationMinutes(text: string | undefined): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Match formats: "45m", "45min", "45 min", "45 mins", "45 minutes", "(60 min)"
  const match = /^\(?(\d+)\s*m(?:in(?:s|utes?)?)?\)?$/i.exec(trimmed);
  if (match) return parseInt(match[1]!, 10);
  // Fallback: match duration embedded in text like "(60 min)"
  const embedded = /\((\d+)\s*min(?:s|utes?)?\)/i.exec(trimmed);
  return embedded ? parseInt(embedded[1]!, 10) : null;
}

const JUNK_WORD_PATTERNS =
  /^(food|lunch|break|dinner|breakfast|pie time|is|served|registration|check[- ]?in|coffee|tea|networking)$/i;

// Common CSV header words that indicate a repeated header row mid-file
const HEADER_WORD_PATTERN =
  /^(time|location|session|speakers?|presenters?|title|details|facilitators?|moderators?|duration|type|track|description|room|venue|date|format|category|abstract|summary|name)$/i;

function isJunkRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
): boolean {
  const allEmpty = Object.values(mapping).every((headerName: string | null) => {
    if (!headerName) return true;
    return !row[headerName]?.trim();
  });
  if (allEmpty) return true;

  // Check if all text columns contain only junk words (e.g., "FOOD;IS;SERVED")
  const textKeys: (keyof ColumnMapping)[] = [
    "title",
    "description",
    "presenters",
    "facilitator",
  ];
  const textValues = textKeys
    .map((k) => (mapping[k] ? row[mapping[k]]?.trim() : undefined))
    .filter(Boolean);
  if (
    textValues.length > 0 &&
    textValues.every((v) => JUNK_WORD_PATTERNS.test(v!))
  )
    return true;

  const title = mapping.title ? row[mapping.title]?.trim() : undefined;
  const desc = mapping.description
    ? row[mapping.description]?.trim()
    : undefined;
  const time = mapping.startTime ? row[mapping.startTime]?.trim() : undefined;

  // Single junk word as title with no real description
  if (title && JUNK_WORD_PATTERNS.test(title) && !desc && !time) return true;

  // Detect repeated header rows mid-file (values match column header names)
  const headerNames = Object.values(mapping).filter(
    (v): v is string => v != null,
  );
  const rowValues = headerNames.map((h) => row[h]?.trim().toLowerCase());
  const headerLower = headerNames.map((h) => h.toLowerCase());
  if (
    rowValues.length > 0 &&
    rowValues.every((v) => !v || headerLower.includes(v))
  )
    return true;

  // Detect repeated header rows with DIFFERENT column names (e.g., a second
  // table header mid-CSV like "Time,Location + Duration,Session,Speakers (...)")
  const nonEmptyValues = Object.values(row)
    .map((v) => v?.trim())
    .filter(Boolean);
  if (nonEmptyValues.length >= 2) {
    // Strip parenthetical suffixes, split on + / &, and check if first word is header-like
    const headerLikeCount = nonEmptyValues.filter((v) => {
      const cleaned = v.replace(/\s*\(.*?\)\s*/g, "").trim();
      const parts = cleaned.split(/\s*[+/&]\s*/);
      return parts.every((part) => HEADER_WORD_PATTERN.test(part.trim()));
    }).length;
    if (headerLikeCount >= 2 && headerLikeCount / nonEmptyValues.length >= 0.5)
      return true;
  }

  // Detect bracket-enclosed metadata rows (e.g., "[ Signup Sheet ]") with no real session data
  if (
    time &&
    /^\[.*\]$/.test(time) &&
    !desc
  )
    return true;

  return false;
}

const MONTH_NAMES: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseCsvDateTime(
  dateStr: string | undefined,
  timeStr: string | undefined,
  year: number,
  defaultDate?: { month: number; day: number },
): Date | null {
  if (!timeStr) return null;

  const timeTrimmed = timeStr.trim();

  // Parse date if provided: "March 14", "Mar 14", "3/14", "03/14", "2026-03-15"
  let parsedYear = year;
  let month: number | null = null;
  let day: number | null = null;

  if (dateStr) {
    const dateTrimmed = dateStr.trim();

    // Try "Month Day" format (March 14)
    const monthDayMatch = /^(\w+)\s+(\d{1,2})$/.exec(dateTrimmed);
    if (monthDayMatch) {
      const monthName = monthDayMatch[1]!.toLowerCase();
      month = MONTH_NAMES[monthName] ?? null;
      day = parseInt(monthDayMatch[2]!, 10);
    }

    // Try "M/D" or "MM/DD" format
    if (month === null) {
      const slashMatch = /^(\d{1,2})[/-](\d{1,2})$/.exec(dateTrimmed);
      if (slashMatch) {
        month = parseInt(slashMatch[1]!, 10) - 1; // 0-indexed
        day = parseInt(slashMatch[2]!, 10);
      }
    }

    // Try "YYYY-MM-DD" ISO format (e.g., "2026-03-15")
    if (month === null) {
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateTrimmed);
      if (isoMatch) {
        parsedYear = parseInt(isoMatch[1]!, 10);
        month = parseInt(isoMatch[2]!, 10) - 1; // 0-indexed
        day = parseInt(isoMatch[3]!, 10);
      }
    }

    if (month === null || day === null) return null;
  } else {
    // No date column — default to event start date so sessions land on the right day
    month = defaultDate?.month ?? 0;
    day = defaultDate?.day ?? 1;
  }

  // Parse time: "10:00 AM", "3:50 PM", "14:30", "11 AM", "6 PM"
  const timeMatch = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(timeTrimmed);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1]!, 10);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3]?.toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const date = new Date(Date.UTC(parsedYear, month, day, hours, minutes, 0, 0));
  if (isNaN(date.getTime())) return null;
  return date;
}

function extractPresenterNames(raw: string | undefined): string[] {
  if (!raw) return [];
  // Split on newlines, semicolons, or commas (careful with parentheses)
  return raw
    .split(/[\n\r]+|;|,(?![^(]*\))/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCsvRows(
  rawData: Record<string, string>[],
  mapping: ColumnMapping,
  year: number,
  sessionTypes: { id: string; name: string }[],
  tracks: { id: string; name: string }[],
  existingSessions: { title: string; startTime: Date; endTime: Date }[],
  defaultDate?: { month: number; day: number },
): ParsedCsvSession[] {
  return rawData
    .filter((row) => !isJunkRow(row, mapping))
    .map((row, index) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Description (parse early so it can be used as title fallback)
    const rawDescription = mapping.description
      ? (row[mapping.description]?.trim() ?? "")
      : "";

    // Title
    const rawTitle = mapping.title ? row[mapping.title]?.trim() : undefined;
    let title = rawTitle ?? "";
    if (!title || title === "\u2014" || title === "-") {
      // Fallback: use first line of description as title
      if (rawDescription) {
        const firstLine = rawDescription.split(/\n/)[0]?.trim() ?? "";
        title = firstLine;
      }
      if (!title) {
        const presenter = mapping.presenters
          ? row[mapping.presenters]?.trim()
          : undefined;
        title = presenter ?? "TBD";
        if (!rawTitle)
          warnings.push("No title found, using presenter name or TBD");
      }
    }

    // Date/Time
    const dateStr = mapping.date ? row[mapping.date] : undefined;
    const startTimeStr = mapping.startTime
      ? row[mapping.startTime]
      : undefined;
    const endTimeStr = mapping.endTime ? row[mapping.endTime] : undefined;

    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // Check if start time column contains a range like "11 AM - 6 PM"
    const timeRange = parseTimeRange(startTimeStr);
    if (timeRange) {
      startTime = parseCsvDateTime(dateStr, timeRange.start, year, defaultDate);
      endTime = parseCsvDateTime(dateStr, timeRange.end, year, defaultDate);
    } else {
      startTime = parseCsvDateTime(dateStr, startTimeStr, year, defaultDate);
      endTime = endTimeStr
        ? parseCsvDateTime(dateStr, endTimeStr, year, defaultDate)
        : null;
    }

    // If no end time, try to extract duration from duration column or room/location column
    if (startTime && !endTime) {
      const durationRaw = mapping.duration ? row[mapping.duration] : undefined;
      const roomRaw = mapping.room ? row[mapping.room] : undefined;
      const durationMinutes =
        extractDurationMinutes(durationRaw) ??
        extractDurationMinutes(roomRaw);
      if (durationMinutes) {
        endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      } else {
        // Default to 30 minutes if no end time or duration provided
        endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
        warnings.push("No end time or duration — defaulting to 30 minutes");
      }
    }

    if (!startTime) errors.push("Could not parse start time");
    if (!endTime) errors.push("Could not parse end time");

    // Presenters
    const presenterRaw = mapping.presenters
      ? row[mapping.presenters]
      : undefined;
    const presenterNames = extractPresenterNames(presenterRaw);

    // Facilitators
    const facilitatorRaw = mapping.facilitator
      ? row[mapping.facilitator]
      : undefined;
    const facilitatorNames = extractPresenterNames(facilitatorRaw);

    // Speaker email (build name → email mapping)
    const speakerEmails: Record<string, string> = {};
    const emailRaw = mapping.speakerEmail
      ? row[mapping.speakerEmail]?.trim()
      : undefined;
    if (emailRaw) {
      // Split on comma/semicolon for multiple emails
      const emails = emailRaw.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
      // Associate emails with presenter names in order
      const allNames = [...presenterNames, ...facilitatorNames];
      for (let i = 0; i < Math.min(emails.length, allNames.length); i++) {
        const name = allNames[i];
        const email = emails[i];
        if (name && email?.includes("@")) {
          speakerEmails[name] = email;
        }
      }
    }

    // Slides URL
    const slidesUrl = mapping.slidesUrl
      ? row[mapping.slidesUrl]?.trim() ?? null
      : null;

    // Session type
    const typeName = mapping.type ? row[mapping.type]?.trim() : null;
    const sessionTypeId = findMatchingSessionType(typeName, sessionTypes);
    if (typeName && !sessionTypeId) {
      warnings.push(`Session type "${typeName}" not found — will be created`);
    }

    // Track (dedicated track column takes priority, fallback to curator)
    const trackColName = mapping.track ? row[mapping.track]?.trim() : null;
    const curatorColName = mapping.curator ? row[mapping.curator]?.trim() : null;
    const trackName = trackColName ?? curatorColName;
    const trackId = findMatchingTrack(trackName, tracks);
    if (trackName && !trackId) {
      warnings.push(`Track "${trackName}" not found — will be created`);
    }

    // Description: use remaining lines if first line was used as title
    const description =
      !rawTitle && rawDescription
        ? rawDescription.split(/\n/).slice(1).join("\n").trim() ??
          rawDescription
        : rawDescription;

    // Order
    const orderStr = mapping.order ? row[mapping.order] : undefined;
    const order = orderStr ? Math.floor(parseFloat(orderStr)) || 0 : index;

    // Duplicate detection
    const isDuplicate = startTime
      ? existingSessions.some(
          (s) =>
            s.title.toLowerCase() === title.toLowerCase() &&
            Math.abs(new Date(s.startTime).getTime() - startTime.getTime()) <
              60000,
        )
      : false;
    if (isDuplicate) warnings.push("Possible duplicate of existing session");

    const status: "ready" | "warning" | "error" =
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "ready";

    return {
      rowIndex: index,
      title,
      description,
      startTime,
      endTime,
      presenterNames,
      facilitatorNames,
      matchedSpeakers: [],
      unmatchedSpeakers: [...presenterNames, ...facilitatorNames],
      sessionTypeName: typeName ?? null,
      sessionTypeId,
      trackName: trackName ?? null,
      trackId,
      slidesUrl: slidesUrl ?? null,
      speakerEmails,
      order,
      status,
      warnings,
      errors,
      included: !isDuplicate && errors.length === 0,
    };
  });
}

function UnlinkedSpeakersPanel({ eventId }: { eventId: string }) {
  const utils = api.useUtils();
  const { data: unlinkedSessions, isLoading } =
    api.schedule.getUnlinkedSessions.useQuery({ eventId });

  const linkMutation = api.schedule.linkSpeakerToSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Speaker linked",
        message: "Speaker has been connected to the session",
        color: "green",
      });
      void utils.schedule.getUnlinkedSessions.invalidate({ eventId });
    },
    onError: (error: { message: string }) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  if (isLoading || !unlinkedSessions || unlinkedSessions.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="light"
      color="yellow"
      icon={<IconAlertCircle size={20} />}
      title={`${unlinkedSessions.length} session${unlinkedSessions.length === 1 ? "" : "s"} with unlinked speakers`}
      radius="md"
    >
      <Text size="sm" mb="sm">
        These sessions appear to have speaker names as titles but no linked
        speaker profiles. Click &quot;Link&quot; to connect them.
      </Text>
      <Stack gap="xs">
        {unlinkedSessions.map(({ session, candidates }) => (
          <Paper key={session.id} p="xs" withBorder radius="sm">
            <Group justify="space-between" align="center" wrap="nowrap">
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text fw={600} size="sm" truncate>
                  {session.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {session.venue?.name}
                  {session.sessionType ? ` · ${session.sessionType.name}` : ""}
                </Text>
              </div>
              <Group gap="xs" wrap="nowrap">
                {candidates.map((candidate) => (
                  <Button
                    key={candidate.userId}
                    size="xs"
                    variant={
                      candidate.confidence === "exact" ? "filled" : "light"
                    }
                    color={
                      candidate.confidence === "exact" ? "green" : "gray"
                    }
                    leftSection={
                      <Avatar
                        src={
                          candidate.profile?.avatarUrl ??
                          candidate.image ??
                          undefined
                        }
                        size={20}
                        radius="xl"
                      >
                        {(candidate.firstName ?? candidate.name ?? "?")
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                    }
                    onClick={() =>
                      linkMutation.mutate({
                        sessionId: session.id,
                        userId: candidate.userId,
                      })
                    }
                    loading={linkMutation.isPending}
                  >
                    Link{" "}
                    {[candidate.firstName, candidate.surname]
                      .filter(Boolean)
                      .join(" ") || candidate.name}
                    {candidate.confidence === "partial" ? " (?)" : ""}
                  </Button>
                ))}
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Alert>
  );
}

export default function ManageScheduleClient({
  eventId,
  showWelcome,
}: ManageScheduleClientProps) {
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);

  const { data: floorsData, isLoading: floorsLoading } =
    api.schedule.getMyFloors.useQuery({ eventId });

  // Set default active venue once loaded
  useEffect(() => {
    if (floorsData?.venues && floorsData.venues.length > 0 && !activeVenueId) {
      setActiveVenueId(
        floorsData.venues.length > 1 ? "all" : floorsData.venues[0]!.id,
      );
    }
  }, [floorsData?.venues, activeVenueId]);

  if (floorsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!floorsData?.venues || floorsData.venues.length === 0) {
    return (
      <Container size="md" py="xl">
        <Center>
          <Stack align="center" gap="md">
            <IconBuilding size={48} color="var(--mantine-color-dimmed)" />
            <Title order={3}>No Floors Assigned</Title>
            <Text c="dimmed" ta="center">
              You don&apos;t have any floors assigned to manage. Contact an
              admin to get floor lead access.
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {showWelcome && !welcomeDismissed && (
          <Alert
            color="teal"
            icon={<IconCheck size={20} />}
            title="Welcome, Floor Lead!"
            withCloseButton
            onClose={() => setWelcomeDismissed(true)}
            radius="md"
            variant="light"
          >
            <Text size="sm">
              Your Floor Lead access has been set up successfully. You can now
              manage sessions, rooms, and speakers for your assigned floors
              below.
            </Text>
          </Alert>
        )}
        {floorsData.isAdmin && <UnlinkedSpeakersPanel eventId={eventId} />}

        <Group justify="space-between">
          <div>
            <Title order={2}>Manage Floors</Title>
            <Text c="dimmed" size="sm">
              {floorsData.isAdmin
                ? "Admin view — managing all floors"
                : "Manage sessions for your assigned floors"}
            </Text>
          </div>
        </Group>

        {floorsData.venues.length > 1 ? (
          <Tabs value={activeVenueId} onChange={setActiveVenueId}>
            <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
              <Tabs.List style={{ flexWrap: "nowrap" }}>
                <Tabs.Tab
                  value="all"
                  leftSection={<IconLayoutGrid size={14} />}
                  rightSection={
                    <Badge size="sm" variant="light" circle>
                      {floorsData.venues.reduce(
                        (sum, v) => sum + v._count.sessions,
                        0,
                      )}
                    </Badge>
                  }
                  style={{ whiteSpace: "nowrap" }}
                >
                  All Floors
                </Tabs.Tab>
                {floorsData.venues.map((venue) => (
                  <Tabs.Tab
                    key={venue.id}
                    value={venue.id}
                    leftSection={<IconBuilding size={14} />}
                    rightSection={
                      <Badge size="sm" variant="light" circle>
                        {venue._count.sessions}
                      </Badge>
                    }
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {venue.name}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </ScrollArea>
          </Tabs>
        ) : null}

        {activeVenueId === "all" ? (
          <AllFloorsView
            eventId={eventId}
            venues={floorsData.venues}
            isAdmin={floorsData.isAdmin}
          />
        ) : activeVenueId ? (
          <FloorManager
            eventId={eventId}
            venueId={activeVenueId}
            venue={floorsData.venues.find((v) => v.id === activeVenueId)}
            allVenues={floorsData.venues}
            isAdmin={floorsData.isAdmin}
          />
        ) : null}
      </Stack>
    </Container>
  );
}

// ──────────────────────────────────────────
// AllFloorsView: aggregated view across all floors
// ──────────────────────────────────────────

interface AllFloorsViewProps {
  eventId: string;
  venues: Array<{
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    rooms: VenueRoom[];
    owners: {
      user: {
        id: string;
        firstName: string | null;
        surname: string | null;
        name: string | null;
        email: string | null;
        image: string | null;
      };
    }[];
    _count: { sessions: number };
  }>;
  isAdmin: boolean;
}

function AllFloorsView({ eventId, venues, isAdmin }: AllFloorsViewProps) {
  const [sessionView, setSessionView] = useState<"cards" | "table">("cards");
  const [commentSessionId, setCommentSessionId] = useState<string | null>(null);
  const [commentSessionTitle, setCommentSessionTitle] = useState("");
  const [detailSession, setDetailSession] = useState<FloorSession | null>(null);

  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.id ?? "";

  const utils = api.useUtils();

  const { data: sessionsData, isLoading: sessionsLoading } =
    api.schedule.getAllFloorSessions.useQuery({ eventId });

  const { data: filterData } = api.schedule.getEventScheduleFilters.useQuery({
    eventId,
  });

  const allRooms = useMemo(() => {
    return venues.flatMap((v) =>
      v.rooms.map((r) => ({ ...r, venueId: v.id })),
    );
  }, [venues]);

  const deleteSessionMutation = api.schedule.deleteSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Session deleted",
        color: "green",
      });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const bulkDeleteMutation = api.schedule.bulkDeleteSessions.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Deleted",
        message: `${String(data.deletedCount)} session${data.deletedCount !== 1 ? "s" : ""} deleted`,
        color: "green",
      });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const bulkAssignRoomMutation = api.schedule.bulkAssignRoom.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Room assigned",
        message: `${String(data.updatedCount)} session${data.updatedCount !== 1 ? "s" : ""} updated`,
        color: "green",
      });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const updateSessionMutation = api.schedule.updateSession.useMutation({
    onSuccess: () => {
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const detailSessionVenue = useMemo(() => {
    if (!detailSession?.venueId) return undefined;
    return venues.find((v) => v.id === detailSession.venueId);
  }, [detailSession, venues]);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Title order={4}>All Sessions</Title>
          <SegmentedControl
            size="xs"
            value={sessionView}
            onChange={(v) => setSessionView(v as "cards" | "table")}
            data={[
              { label: "Cards", value: "cards" },
              { label: "Table", value: "table" },
            ]}
          />
        </Group>
      </Group>

      {sessionsLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
        <Paper p="xl" withBorder>
          <Center>
            <Stack align="center" gap="sm">
              <IconClock size={32} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">No sessions across any floor yet.</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          {sessionView === "cards" && (
            <Stack gap="xs">
              {sessionsData.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session as FloorSession}
                  eventId={eventId}
                  venueId={session.venueId ?? ""}
                  venues={venues}
                  rooms={
                    venues.find((v) => v.id === session.venueId)?.rooms ?? []
                  }
                  sessionTypes={filterData?.sessionTypes ?? []}
                  tracks={filterData?.tracks ?? []}
                  onDelete={() =>
                    deleteSessionMutation.mutate({ id: session.id })
                  }
                  isDeleting={deleteSessionMutation.isPending}
                  isAdmin={isAdmin}
                  onOpenComments={(id, title) => {
                    setCommentSessionId(id);
                    setCommentSessionTitle(title);
                  }}
                  onViewDetail={setDetailSession}
                  showFloorBadge
                />
              ))}
            </Stack>
          )}

          {sessionView === "table" && (
            <SessionTableView
              sessions={sessionsData.sessions as FloorSession[]}
              rooms={allRooms}
              sessionTypes={filterData?.sessionTypes ?? []}
              tracks={filterData?.tracks ?? []}
              onEdit={() => setSessionView("cards")}
              onDelete={(id) => deleteSessionMutation.mutate({ id })}
              onBulkDelete={(ids) => bulkDeleteMutation.mutate({ ids })}
              onBulkAssignRoom={(ids, roomId) =>
                bulkAssignRoomMutation.mutate({ ids, roomId })
              }
              onOpenComments={(id, title) => {
                setCommentSessionId(id);
                setCommentSessionTitle(title);
              }}
              isDeleting={deleteSessionMutation.isPending}
              isBulkDeleting={bulkDeleteMutation.isPending}
              isBulkAssigningRoom={bulkAssignRoomMutation.isPending}
              onViewDetail={setDetailSession}
              showFloorColumn
              onUpdateSession={(data) =>
                updateSessionMutation.mutate(data)
              }
              isUpdating={updateSessionMutation.isPending}
              venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            />
          )}
        </>
      )}

      <SessionCommentDrawer
        sessionId={commentSessionId}
        sessionTitle={commentSessionTitle}
        onClose={() => setCommentSessionId(null)}
        currentUserId={currentUserId}
      />

      <SessionDetailModal
        session={detailSession}
        onClose={() => setDetailSession(null)}
        eventId={eventId}
        venueId={detailSession?.venueId ?? ""}
        venues={venues}
        rooms={detailSessionVenue?.rooms ?? []}
        sessionTypes={filterData?.sessionTypes ?? []}
        tracks={filterData?.tracks ?? []}
        isAdmin={isAdmin}
      />
    </Stack>
  );
}

// ──────────────────────────────────────────
// FloorLead: manages a single floor
// ──────────────────────────────────────────

interface FloorManagerProps {
  eventId: string;
  venueId: string;
  venue?: {
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    rooms: VenueRoom[];
    owners: {
      user: {
        id: string;
        firstName: string | null;
        surname: string | null;
        name: string | null;
        email: string | null;
        image: string | null;
      };
    }[];
  };
  allVenues?: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  isAdmin: boolean;
}

function FloorManager({ eventId, venueId, venue, allVenues, isAdmin }: FloorManagerProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState(venue?.name ?? "");
  const [metaDescription, setMetaDescription] = useState(
    venue?.description ?? "",
  );
  const [metaCapacity, setMetaCapacity] = useState<number | "">(
    venue?.capacity ?? "",
  );
  const [prefillData, setPrefillData] = useState<SessionPrefillData | null>(
    null,
  );
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [sessionView, setSessionView] = useState<"cards" | "table" | "grid">(
    "cards",
  );
  const [commentSessionId, setCommentSessionId] = useState<string | null>(null);
  const [commentSessionTitle, setCommentSessionTitle] = useState("");
  const [detailSession, setDetailSession] = useState<FloorSession | null>(null);

  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.id ?? "";

  const utils = api.useUtils();

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = api.schedule.getFloorSessions.useQuery({ eventId, venueId });

  if (sessionsError) {
    console.error(
      "[ManageSchedule] getFloorSessions ERROR:",
      sessionsError.message,
      sessionsError,
    );
  }
  if (sessionsData) {
    console.log("[ManageSchedule] getFloorSessions loaded:", {
      sessionCount: sessionsData.sessions.length,
      eventName: sessionsData.event?.name,
      sampleSession: sessionsData.sessions[0]
        ? {
            title: sessionsData.sessions[0].title,
            startTime: sessionsData.sessions[0].startTime,
            endTime: sessionsData.sessions[0].endTime,
            roomId: sessionsData.sessions[0].roomId,
          }
        : null,
    });
  }

  const { data: filterData } = api.schedule.getEventScheduleFilters.useQuery({
    eventId,
  });

  const { data: applicationsData } = api.schedule.getFloorApplications.useQuery(
    { eventId, venueId },
  );

  const [newRoomName, setNewRoomName] = useState("");

  const updateVenueMutation = api.schedule.updateVenue.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Floor info updated",
        color: "green",
      });
      setEditingMeta(false);
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const createRoomMutation = api.schedule.createRoom.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Created",
        message: "Room added",
        color: "green",
      });
      setNewRoomName("");
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const deleteRoomMutation = api.schedule.deleteRoom.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Room removed",
        color: "green",
      });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const deleteSessionMutation = api.schedule.deleteSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deleted",
        message: "Session deleted",
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const bulkDeleteMutation = api.schedule.bulkDeleteSessions.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Deleted",
        message: `${String(data.deletedCount)} session${data.deletedCount !== 1 ? "s" : ""} deleted`,
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const bulkAssignRoomMutation = api.schedule.bulkAssignRoom.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Room assigned",
        message: `${String(data.updatedCount)} session${data.updatedCount !== 1 ? "s" : ""} updated`,
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const updateSessionMutation = api.schedule.updateSession.useMutation({
    onSuccess: () => {
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
    },
    onError: (err: { message: string }) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleSaveMeta = () => {
    updateVenueMutation.mutate({
      id: venueId,
      name: metaName,
      description: metaDescription || null,
      capacity: metaCapacity === "" ? null : metaCapacity,
    });
  };

  return (
    <Stack gap="md">
      {/* Floor metadata */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Floor Details</Title>
          {!editingMeta && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconEdit size={14} />}
              onClick={() => {
                setMetaName(venue?.name ?? "");
                setMetaDescription(venue?.description ?? "");
                setMetaCapacity(venue?.capacity ?? "");
                setEditingMeta(true);
              }}
            >
              Edit
            </Button>
          )}
        </Group>

        {editingMeta ? (
          <Stack gap="sm">
            <TextInput
              label="Floor Name"
              value={metaName}
              onChange={(e) => setMetaName(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            <NumberInput
              label="Capacity"
              value={metaCapacity}
              onChange={(val) => setMetaCapacity(val === "" ? "" : Number(val))}
              min={0}
            />
            <Group>
              <Button
                size="sm"
                onClick={handleSaveMeta}
                loading={updateVenueMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setEditingMeta(false)}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Text fw={500}>{venue?.name}</Text>
            {venue?.description && (
              <Text size="sm" c="dimmed">
                {venue.description}
              </Text>
            )}
            {venue?.capacity != null && (
              <Text size="sm" c="dimmed">
                <IconUsers size={14} style={{ verticalAlign: "middle" }} />{" "}
                Capacity: {venue.capacity}
              </Text>
            )}
            {venue?.owners && venue.owners.length > 0 && (
              <Text size="sm" c="dimmed">
                Owners:{" "}
                {venue.owners
                  .map(
                    (o) =>
                      o.user.firstName ??
                      o.user.name ??
                      o.user.email ??
                      "Unknown",
                  )
                  .join(", ")}
              </Text>
            )}
          </Stack>
        )}
      </Paper>

      {/* Rooms */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconDoor size={18} />
            <Title order={4}>Rooms</Title>
            <Badge size="sm" variant="light">
              {venue?.rooms?.length ?? 0} / 10
            </Badge>
          </Group>
        </Group>
        {venue?.rooms && venue.rooms.length > 0 ? (
          <Stack gap="xs" mb="sm">
            {venue.rooms.map((room) => (
              <Group key={room.id} justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    {room.name}
                  </Text>
                  {room.capacity != null && (
                    <Text size="xs" c="dimmed">
                      (capacity: {room.capacity})
                    </Text>
                  )}
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => deleteRoomMutation.mutate({ id: room.id })}
                  loading={deleteRoomMutation.isPending}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" mb="sm">
            No rooms. Sessions will be scheduled at the floor level.
          </Text>
        )}
        {(venue?.rooms?.length ?? 0) < 10 && (
          <Group gap="xs">
            <TextInput
              placeholder="Room name"
              size="xs"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                if (!newRoomName.trim()) return;
                createRoomMutation.mutate({
                  venueId,
                  name: newRoomName.trim(),
                  order: venue?.rooms?.length ?? 0,
                });
              }}
              loading={createRoomMutation.isPending}
              disabled={!newRoomName.trim()}
            >
              Add Room
            </Button>
          </Group>
        )}
      </Paper>

      {/* Floor Applications */}
      <FloorApplicationsList
        eventId={eventId}
        venueId={venueId}
        applicationsData={applicationsData ?? []}
        sessionTypes={filterData?.sessionTypes ?? []}
        tracks={filterData?.tracks ?? []}
        onCreateFromApplication={(data) => {
          setPrefillData(data);
          setCreateModalOpened(true);
        }}
      />

      {/* Sessions */}
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Title order={4}>Sessions</Title>
          <SegmentedControl
            size="xs"
            value={sessionView}
            onChange={(v) => {
              console.log("[ManageSchedule] View switch clicked:", v, {
                sessionCount: sessionsData?.sessions?.length,
                roomCount: venue?.rooms?.length,
              });
              console.time("[ManageSchedule] view-switch-render");
              setSessionView(v as "cards" | "table" | "grid");
              requestAnimationFrame(() => {
                console.timeEnd("[ManageSchedule] view-switch-render");
              });
            }}
            data={[
              { label: "Cards", value: "cards" },
              { label: "Table", value: "table" },
              { label: "Grid", value: "grid" },
            ]}
          />
        </Group>
        <Group gap="xs">
          <CsvUploadButton
            eventId={eventId}
            venueId={venueId}
            sessionTypes={filterData?.sessionTypes ?? []}
            tracks={filterData?.tracks ?? []}
            existingSessions={(sessionsData?.sessions ?? []).map((s) => ({
              title: s.title,
              startTime: s.startTime,
              endTime: s.endTime,
            }))}
            eventYear={(() => {
              const d = sessionsData?.event?.startDate
                ? new Date(sessionsData.event.startDate)
                : null;
              return d && !isNaN(d.getTime())
                ? d.getUTCFullYear()
                : new Date().getUTCFullYear();
            })()}
            eventStartDate={sessionsData?.event?.startDate}
          />
          <CreateSessionButton
            eventId={eventId}
            venueId={venueId}
            rooms={venue?.rooms ?? []}
            sessionTypes={filterData?.sessionTypes ?? []}
            tracks={filterData?.tracks ?? []}
            isAdmin={isAdmin}
            applicationsData={applicationsData ?? []}
            prefillData={prefillData}
            externalOpened={createModalOpened ? true : undefined}
            onExternalClose={() => {
              setCreateModalOpened(false);
              setPrefillData(null);
            }}
            eventStartDate={sessionsData?.event?.startDate}
          />
        </Group>
      </Group>

      {sessionsLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
        <Paper p="xl" withBorder>
          <Center>
            <Stack align="center" gap="sm">
              <IconClock size={32} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">
                No sessions yet. Create your first session.
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          {sessionView === "cards" && (
            <Stack gap="xs">
              {sessionsData.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session as FloorSession}
                  eventId={eventId}
                  venueId={venueId}
                  venues={allVenues}
                  rooms={venue?.rooms ?? []}
                  sessionTypes={filterData?.sessionTypes ?? []}
                  tracks={filterData?.tracks ?? []}
                  onDelete={() =>
                    deleteSessionMutation.mutate({ id: session.id })
                  }
                  isDeleting={deleteSessionMutation.isPending}
                  isAdmin={isAdmin}
                  onOpenComments={(id, title) => {
                    setCommentSessionId(id);
                    setCommentSessionTitle(title);
                  }}
                  onViewDetail={setDetailSession}
                />
              ))}
            </Stack>
          )}

          {sessionView === "table" && (
            <SessionTableView
              sessions={sessionsData.sessions as FloorSession[]}
              rooms={venue?.rooms ?? []}
              sessionTypes={filterData?.sessionTypes ?? []}
              tracks={filterData?.tracks ?? []}
              onEdit={() => {
                setSessionView("cards");
              }}
              onDelete={(id) => deleteSessionMutation.mutate({ id })}
              onBulkDelete={(ids) => bulkDeleteMutation.mutate({ ids })}
              onBulkAssignRoom={(ids, roomId) =>
                bulkAssignRoomMutation.mutate({ ids, roomId })
              }
              onOpenComments={(id, title) => {
                setCommentSessionId(id);
                setCommentSessionTitle(title);
              }}
              isDeleting={deleteSessionMutation.isPending}
              isBulkDeleting={bulkDeleteMutation.isPending}
              isBulkAssigningRoom={bulkAssignRoomMutation.isPending}
              onViewDetail={setDetailSession}
              onUpdateSession={(data) =>
                updateSessionMutation.mutate(data)
              }
              isUpdating={updateSessionMutation.isPending}
            />
          )}

          {sessionView === "grid" && (
            <SessionTimeGrid
              sessions={sessionsData.sessions as FloorSession[]}
              rooms={venue?.rooms ?? []}
              eventId={eventId}
              venueId={venueId}
              venueName={venue?.name ?? "Floor"}
              onOpenComments={(id, title) => {
                setCommentSessionId(id);
                setCommentSessionTitle(title);
              }}
              onViewDetail={setDetailSession}
            />
          )}
        </>
      )}

      {/* Session Comment Drawer */}
      <SessionCommentDrawer
        sessionId={commentSessionId}
        sessionTitle={commentSessionTitle}
        onClose={() => setCommentSessionId(null)}
        currentUserId={currentUserId}
      />

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={detailSession}
        onClose={() => setDetailSession(null)}
        eventId={eventId}
        venueId={venueId}
        venues={allVenues}
        rooms={venue?.rooms ?? []}
        sessionTypes={filterData?.sessionTypes ?? []}
        tracks={filterData?.tracks ?? []}
        isAdmin={isAdmin}
      />
    </Stack>
  );
}

// ──────────────────────────────────────────
// SessionCard
// ──────────────────────────────────────────

interface SessionCardProps {
  session: FloorSession;
  eventId: string;
  venueId: string;
  venues?: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onDelete: () => void;
  isDeleting: boolean;
  isAdmin: boolean;
  onOpenComments?: (sessionId: string, sessionTitle: string) => void;
  onViewDetail?: (session: FloorSession) => void;
  showFloorBadge?: boolean;
}

function SessionCard({
  session,
  eventId,
  venueId,
  venues,
  rooms,
  sessionTypes,
  tracks,
  onDelete,
  isDeleting,
  isAdmin,
  onOpenComments,
  onViewDetail,
  showFloorBadge,
}: SessionCardProps) {
  const [editing, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);

  const timeStr = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`;
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Paper
        p="md"
        withBorder
        style={{ cursor: onViewDetail ? "pointer" : undefined }}
        onClick={() => onViewDetail?.(session)}
      >
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="xs">
              <Text fw={600}>{session.title}</Text>
              {!session.isPublished && (
                <Badge size="xs" color="yellow" variant="light">
                  Draft
                </Badge>
              )}
              {session.sessionType && (
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
              )}
              {session.track && (
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
              )}
              {session.room && (
                <Badge size="xs" variant="light" color="teal">
                  {session.room.name}
                </Badge>
              )}
              {showFloorBadge && session.venue && (
                <Badge size="xs" variant="light" color="indigo">
                  {session.venue.name}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              <IconClock size={12} style={{ verticalAlign: "middle" }} />{" "}
              {dateStr} {timeStr}
            </Text>
            {(session.sessionSpeakers.length > 0 ||
              session.speakers.length > 0) && (
              <Text size="sm" c="dimmed">
                <IconUsers size={12} style={{ verticalAlign: "middle" }} />{" "}
                {[
                  ...session.sessionSpeakers.map((s) => {
                    const name = getDisplayName(s.user, "Unknown");
                    const org = s.user.profile?.company;
                    const suffix = [
                      org,
                      s.role !== "Speaker" ? s.role : null,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    return suffix ? `${name} (${suffix})` : name;
                  }),
                  ...session.speakers,
                ].join(", ")}
              </Text>
            )}
            {session.description && (
              <Text size="sm" c="dimmed" lineClamp={2}>
                {session.description}
              </Text>
            )}
          </Stack>
          <Group gap={4} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {onOpenComments && (
              <Tooltip
                label={`${String(session._count?.comments ?? 0)} comments`}
              >
                <ActionIcon
                  variant="subtle"
                  color={session._count?.comments ? "blue" : "gray"}
                  onClick={() => onOpenComments(session.id, session.title)}
                >
                  <Group gap={2} wrap="nowrap">
                    <IconMessageCircle size={16} />
                    {(session._count?.comments ?? 0) > 0 && (
                      <Text size="xs" fw={600}>
                        {session._count?.comments}
                      </Text>
                    )}
                  </Group>
                </ActionIcon>
              </Tooltip>
            )}
            <ActionIcon variant="subtle" color="blue" onClick={openEdit}>
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={onDelete}
              loading={isDeleting}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      <EditSessionModal
        opened={editing}
        onClose={closeEdit}
        session={session}
        eventId={eventId}
        venueId={venueId}
        venues={venues}
        rooms={rooms}
        sessionTypes={sessionTypes}
        tracks={tracks}
        isAdmin={isAdmin}
      />
    </>
  );
}

// ──────────────────────────────────────────
// FloorApplicationsList
// ──────────────────────────────────────────

type FloorApplicationData = {
  id: string;
  status: string;
  applicationType: string;
  createdAt: Date;
  speakerPreferredDates: string | null;
  speakerPreferredTimes: string | null;
  user: {
    id: string;
    firstName: string | null;
    surname: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
    profile: {
      speakerTalkTitle: string | null;
      speakerTalkAbstract: string | null;
      speakerTalkFormat: string | null;
      speakerTalkDuration: string | null;
      speakerTalkTopic: string | null;
      speakerEntityName: string | null;
      bio: string | null;
      jobTitle: string | null;
      company: string | null;
    } | null;
  } | null;
};

interface FloorApplicationsListProps {
  eventId: string;
  venueId: string;
  applicationsData: FloorApplicationData[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onCreateFromApplication: (data: SessionPrefillData) => void;
}

function FloorApplicationsList({
  eventId,
  venueId,
  applicationsData,
  sessionTypes,
  tracks,
  onCreateFromApplication,
}: FloorApplicationsListProps) {
  const [expanded, { toggle }] = useDisclosure(false);
  const [selectedApp, setSelectedApp] = useState<FloorApplicationData | null>(
    null,
  );
  const [editingApp, setEditingApp] = useState<FloorApplicationData | null>(
    null,
  );
  const [editModalOpened, setEditModalOpened] = useState(false);

  const handleEdit = (app: FloorApplicationData) => {
    setEditingApp(app);
    setEditModalOpened(true);
  };

  if (applicationsData.length === 0) return null;

  const approvedApps = applicationsData.filter((a) => a.status === "ACCEPTED");
  const unapprovedApps = applicationsData.filter(
    (a) => a.status !== "ACCEPTED",
  );
  const speakersUrl = `/events/${eventId}/speakers`;

  return (
    <Stack gap="xs">
      {/* Prominent application status banner */}
      <Alert
        variant="light"
        color={unapprovedApps.length > 0 ? "orange" : "green"}
        icon={
          unapprovedApps.length > 0 ? (
            <IconAlertCircle size={20} />
          ) : (
            <IconCheck size={20} />
          )
        }
        radius="md"
        title={
          <Text fw={600} size="sm">
            Speaker Applications
          </Text>
        }
      >
        <Stack gap="xs">
          <Text size="sm">
            You have{" "}
            <Text span fw={700} c="green">
              {approvedApps.length} approved
            </Text>
            {unapprovedApps.length > 0 && (
              <>
                {" "}
                and{" "}
                <Text span fw={700} c="orange">
                  {unapprovedApps.length} unapproved
                </Text>
              </>
            )}{" "}
            speaker{" "}
            {applicationsData.length === 1 ? "application" : "applications"} for
            this floor.
          </Text>
          <Group gap="sm">
            {approvedApps.length > 0 && (
              <Button
                component={Link}
                href={`${speakersUrl}#applications`}
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconCheck size={14} />}
              >
                View approved ({approvedApps.length})
              </Button>
            )}
            {unapprovedApps.length > 0 && (
              <Button
                component={Link}
                href={`${speakersUrl}#applications`}
                size="xs"
                variant="filled"
                color="orange"
                leftSection={<IconUsers size={14} />}
              >
                Review unapproved ({unapprovedApps.length})
              </Button>
            )}
          </Group>
        </Stack>
      </Alert>

      {/* Expandable application details */}
      <Group justify="space-between">
        <Group gap="xs">
          <IconFileText size={18} />
          <Text size="sm" fw={500}>
            You currently have {approvedApps.length} accepted{" "}
            {approvedApps.length === 1 ? "application" : "applications"}
          </Text>
        </Group>
        <Button
          size="xs"
          variant={expanded ? "light" : "filled"}
          onClick={toggle}
          leftSection={<IconFileText size={14} />}
        >
          {expanded ? "Hide" : "View Approved Applications"}
        </Button>
      </Group>

      <Collapse in={expanded}>
        <Stack gap="xs">
          {applicationsData.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              sessionTypes={sessionTypes}
              tracks={tracks}
              onCreateSession={onCreateFromApplication}
              onViewDetail={setSelectedApp}
              onEdit={handleEdit}
            />
          ))}
        </Stack>
      </Collapse>

      <ApplicationDetailModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onCreateSession={(data) => {
          setSelectedApp(null);
          onCreateFromApplication(data);
        }}
        sessionTypes={sessionTypes}
        tracks={tracks}
        onEdit={(app) => {
          setSelectedApp(null);
          handleEdit(app);
        }}
      />

      <EditApplicationModal
        application={editingApp}
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setEditingApp(null);
        }}
        eventId={eventId}
        venueId={venueId}
      />
    </Stack>
  );
}

// ──────────────────────────────────────────
// ApplicationCard
// ──────────────────────────────────────────

interface ApplicationCardProps {
  application: FloorApplicationData;
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onCreateSession: (data: SessionPrefillData) => void;
  onViewDetail: (app: FloorApplicationData) => void;
  onEdit: (app: FloorApplicationData) => void;
}

function ApplicationCard({
  application,
  sessionTypes,
  tracks,
  onCreateSession,
  onViewDetail,
  onEdit,
}: ApplicationCardProps) {
  const user = application.user;
  if (!user) return null;

  const profile = user.profile;
  const talkTitle = profile?.speakerTalkTitle;
  const talkAbstract = profile?.speakerTalkAbstract;
  const talkFormat = profile?.speakerTalkFormat;
  const talkDuration = profile?.speakerTalkDuration;
  const entityName = profile?.speakerEntityName;

  const handleCreate = () => {
    onCreateSession({
      title: talkTitle ?? entityName ?? "",
      description: talkAbstract ?? "",
      speaker: {
        id: user.id,
        firstName: user.firstName,
        surname: user.surname,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      sessionTypeId: findMatchingSessionType(talkFormat, sessionTypes),
      trackId: findMatchingTrack(profile?.speakerTalkTopic, tracks),
    });
  };

  const statusColor = application.status === "ACCEPTED" ? "green" : "blue";

  return (
    <Paper
      p="sm"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={() => onViewDetail(application)}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar
            src={user.image}
            alt={getDisplayName(user, "User")}
            size="sm"
          />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={600} truncate>
                {getDisplayName(user, "Unknown")}
              </Text>
              {entityName && (
                <Text size="xs" c="dimmed" truncate>
                  ({entityName})
                </Text>
              )}
              <Badge size="xs" color={statusColor} variant="light">
                {application.status}
              </Badge>
              {application.applicationType !== "SPEAKER" && (
                <Badge size="xs" variant="outline">
                  {application.applicationType}
                </Badge>
              )}
            </Group>
            {talkTitle && (
              <Text size="sm" fw={500} lineClamp={1}>
                {talkTitle}
              </Text>
            )}
            <Group gap="xs" wrap="wrap">
              {talkFormat && (
                <Badge size="xs" variant="light" color="violet">
                  {talkFormat}
                </Badge>
              )}
              {talkDuration && (
                <Badge size="xs" variant="light" color="gray">
                  {formatDuration(talkDuration)}
                </Badge>
              )}
              {application.speakerPreferredDates?.split(",").map((date) => (
                <Badge key={date} size="xs" variant="light" color="teal">
                  {date === "2026-03-14"
                    ? "Mar 14"
                    : date === "2026-03-15"
                      ? "Mar 15"
                      : date}
                </Badge>
              ))}
              {application.speakerPreferredTimes?.split(",").map((slot) => (
                <Badge key={slot} size="xs" variant="dot" color="orange">
                  {formatTimeSlot(slot)}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Group>
        <Group gap="xs" style={{ flexShrink: 0 }}>
          <Tooltip label="Edit application">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onEdit(application);
              }}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleCreate();
            }}
          >
            Create Session
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

// ──────────────────────────────────────────
// ApplicationDetailModal
// ──────────────────────────────────────────

interface ApplicationDetailModalProps {
  application: FloorApplicationData | null;
  onClose: () => void;
  onCreateSession: (data: SessionPrefillData) => void;
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  onEdit: (app: FloorApplicationData) => void;
}

function ApplicationDetailModal({
  application,
  onClose,
  onCreateSession,
  sessionTypes,
  tracks,
  onEdit,
}: ApplicationDetailModalProps) {
  if (!application?.user) return null;

  const user = application.user;
  const profile = user.profile;
  const talkFormat = profile?.speakerTalkFormat;
  const talkDuration = profile?.speakerTalkDuration;

  const handleCreate = () => {
    onCreateSession({
      title: profile?.speakerTalkTitle ?? profile?.speakerEntityName ?? "",
      description: profile?.speakerTalkAbstract ?? "",
      speaker: {
        id: user.id,
        firstName: user.firstName,
        surname: user.surname,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      sessionTypeId: findMatchingSessionType(talkFormat, sessionTypes),
      trackId: findMatchingTrack(profile?.speakerTalkTopic, tracks),
    });
  };

  const statusColor = application.status === "ACCEPTED" ? "green" : "blue";

  return (
    <Modal
      opened={!!application}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Avatar
            src={user.image}
            alt={getDisplayName(user, "User")}
            size="md"
          />
          <Stack gap={0}>
            <Group gap="xs">
              <Text fw={600}>{getDisplayName(user, "Unknown")}</Text>
              <Badge size="sm" color={statusColor} variant="light">
                {application.status}
              </Badge>
            </Group>
            {(profile?.jobTitle ?? profile?.company) && (
              <Text size="sm" c="dimmed">
                {[profile?.jobTitle, profile?.company]
                  .filter(Boolean)
                  .join(" at ")}
              </Text>
            )}
          </Stack>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Speaker Bio */}
        {profile?.bio && (
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Bio
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {profile.bio}
            </Text>
          </Stack>
        )}

        {/* Talk Details */}
        {profile?.speakerTalkTitle && (
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Talk Title
            </Text>
            <Text size="sm" fw={500}>
              {profile.speakerTalkTitle}
            </Text>
          </Stack>
        )}

        {profile?.speakerTalkAbstract && (
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Talk Abstract
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {profile.speakerTalkAbstract}
            </Text>
          </Stack>
        )}

        {/* Format, Duration, Topic */}
        {(talkFormat ?? talkDuration ?? profile?.speakerTalkTopic) && (
          <Group gap="xs" wrap="wrap">
            {talkFormat && (
              <Badge variant="light" color="violet">
                {talkFormat}
              </Badge>
            )}
            {talkDuration && (
              <Badge variant="light" color="gray">
                {formatDuration(talkDuration)}
              </Badge>
            )}
            {profile?.speakerTalkTopic && (
              <Badge variant="light" color="blue">
                {profile.speakerTalkTopic}
              </Badge>
            )}
          </Group>
        )}

        {/* Scheduling Preferences */}
        {(application.speakerPreferredDates ??
          application.speakerPreferredTimes) && (
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Scheduling Preferences
            </Text>
            <Group gap="xs" wrap="wrap">
              {application.speakerPreferredDates?.split(",").map((date) => (
                <Badge key={date} size="sm" variant="light" color="teal">
                  {date === "2026-03-14"
                    ? "Mar 14"
                    : date === "2026-03-15"
                      ? "Mar 15"
                      : date}
                </Badge>
              ))}
              {application.speakerPreferredTimes?.split(",").map((slot) => (
                <Badge key={slot} size="sm" variant="dot" color="orange">
                  {formatTimeSlot(slot)}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}

        {/* Entity Name */}
        {profile?.speakerEntityName && (
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Entity / Organization
            </Text>
            <Text size="sm">{profile.speakerEntityName}</Text>
          </Stack>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="sm">
          <Button variant="light" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="light"
            leftSection={<IconEdit size={16} />}
            onClick={() => onEdit(application)}
          >
            Edit
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            Create Session
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ──────────────────────────────────────────
// EditApplicationModal
// ──────────────────────────────────────────

interface EditApplicationModalProps {
  application: FloorApplicationData | null;
  opened: boolean;
  onClose: () => void;
  eventId: string;
  venueId: string;
}

function EditApplicationModal({
  application,
  opened,
  onClose,
  eventId,
  venueId,
}: EditApplicationModalProps) {
  const utils = api.useUtils();
  const [preferredDates, setPreferredDates] = useState<string[]>([]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);

  const form = useForm({
    initialValues: {
      speakerTalkTitle: "",
      speakerTalkAbstract: "",
      speakerTalkFormat: "",
      speakerTalkDuration: "",
      speakerTalkTopic: "",
      speakerEntityName: "",
      bio: "",
      jobTitle: "",
      company: "",
      status: "",
    },
  });

  useEffect(() => {
    if (application && opened) {
      const profile = application.user?.profile;
      form.setValues({
        speakerTalkTitle: profile?.speakerTalkTitle ?? "",
        speakerTalkAbstract: profile?.speakerTalkAbstract ?? "",
        speakerTalkFormat: profile?.speakerTalkFormat ?? "",
        speakerTalkDuration: profile?.speakerTalkDuration ?? "",
        speakerTalkTopic: profile?.speakerTalkTopic ?? "",
        speakerEntityName: profile?.speakerEntityName ?? "",
        bio: profile?.bio ?? "",
        jobTitle: profile?.jobTitle ?? "",
        company: profile?.company ?? "",
        status: application.status,
      });
      setPreferredDates(
        application.speakerPreferredDates?.split(",").filter(Boolean) ?? [],
      );
      setPreferredTimes(
        application.speakerPreferredTimes?.split(",").filter(Boolean) ?? [],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, opened]);

  const updateMutation = api.schedule.updateFloorApplication.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Application updated successfully",
        color: "green",
      });
      void utils.schedule.getFloorApplications.invalidate({ eventId, venueId });
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
    const values = form.values;
    const toNullable = (v: string) => (v.trim() === "" ? null : v.trim());

    updateMutation.mutate({
      applicationId: application?.id ?? "",
      eventId,
      venueId,
      status: values.status as
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "ACCEPTED"
        | "REJECTED"
        | "WAITLISTED"
        | "CANCELLED",
      speakerPreferredDates:
        preferredDates.length > 0 ? preferredDates.join(",") : null,
      speakerPreferredTimes:
        preferredTimes.length > 0 ? preferredTimes.join(",") : null,
      speakerTalkTitle: toNullable(values.speakerTalkTitle),
      speakerTalkAbstract: toNullable(values.speakerTalkAbstract),
      speakerTalkFormat: toNullable(values.speakerTalkFormat),
      speakerTalkDuration: toNullable(values.speakerTalkDuration),
      speakerTalkTopic: toNullable(values.speakerTalkTopic),
      speakerEntityName: toNullable(values.speakerEntityName),
      bio: toNullable(values.bio),
      jobTitle: toNullable(values.jobTitle),
      company: toNullable(values.company),
    });
  };

  const userName = application?.user
    ? getDisplayName(application.user, "Unknown")
    : "Unknown";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconEdit size={20} />
          <Text fw={600}>Edit Application — {userName}</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        <Divider label="Session Details" labelPosition="left" />

        <TextInput
          label="Talk Title"
          placeholder="Enter talk title"
          {...form.getInputProps("speakerTalkTitle")}
        />
        <Textarea
          label="Talk Abstract"
          placeholder="Enter talk abstract"
          minRows={3}
          autosize
          {...form.getInputProps("speakerTalkAbstract")}
        />
        <Group grow>
          <Select
            label="Format"
            placeholder="Select format"
            data={talkFormatOptions}
            clearable
            {...form.getInputProps("speakerTalkFormat")}
          />
          <Select
            label="Duration"
            placeholder="Select duration"
            data={talkDurationOptions}
            clearable
            {...form.getInputProps("speakerTalkDuration")}
          />
        </Group>
        <TextInput
          label="Topic"
          placeholder="Enter topic"
          {...form.getInputProps("speakerTalkTopic")}
        />
        <TextInput
          label="Entity / Organization"
          placeholder="Enter entity or organization name"
          {...form.getInputProps("speakerEntityName")}
        />

        <Divider label="Speaker Profile" labelPosition="left" />

        <Group grow>
          <TextInput
            label="Job Title"
            placeholder="Enter job title"
            {...form.getInputProps("jobTitle")}
          />
          <TextInput
            label="Company"
            placeholder="Enter company"
            {...form.getInputProps("company")}
          />
        </Group>
        <Textarea
          label="Bio"
          placeholder="Enter speaker bio"
          minRows={2}
          autosize
          {...form.getInputProps("bio")}
        />

        <Divider label="Scheduling Preferences" labelPosition="left" />

        <Checkbox.Group
          label="Preferred Dates"
          value={preferredDates}
          onChange={setPreferredDates}
        >
          <Group mt="xs">
            {speakerDateOptions.map((opt) => (
              <Checkbox key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </Group>
        </Checkbox.Group>

        <Checkbox.Group
          label="Preferred Time Slots"
          value={preferredTimes}
          onChange={setPreferredTimes}
        >
          <Stack gap="xs" mt="xs">
            {speakerTimeSlotOptions.map((opt) => (
              <Checkbox key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </Stack>
        </Checkbox.Group>

        <Divider label="Application Status" labelPosition="left" />

        <Select
          label="Status"
          data={[
            { value: "DRAFT", label: "Draft" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "UNDER_REVIEW", label: "Under Review" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "REJECTED", label: "Rejected" },
            { value: "WAITLISTED", label: "Waitlisted" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          {...form.getInputProps("status")}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={updateMutation.isPending}
            leftSection={<IconCheck size={16} />}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ──────────────────────────────────────────
// SessionDetailModal
// ──────────────────────────────────────────

interface SessionDetailModalProps {
  session: FloorSession | null;
  onClose: () => void;
  eventId: string;
  venueId: string;
  venues?: Array<{
    id: string;
    name: string;
    rooms: Array<{ id: string; name: string }>;
  }>;
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
}

function SessionDetailModal({
  session,
  onClose,
  eventId,
  venueId,
  venues,
  rooms,
  sessionTypes,
  tracks,
  isAdmin,
}: SessionDetailModalProps) {
  const [editing, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  if (!session) return null;

  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeStr = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`;
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const durationStr =
    durationMin >= 60
      ? `${String(Math.floor(durationMin / 60))}h${durationMin % 60 > 0 ? ` ${String(durationMin % 60)}m` : ""}`
      : `${String(durationMin)}m`;

  const speakerNames = [
    ...session.sessionSpeakers.map((s) => {
      const name = getDisplayName(s.user, "Unknown");
      const org = s.user.profile?.company;
      const suffix = [
        org,
        s.role !== "Speaker" ? s.role : null,
      ]
        .filter(Boolean)
        .join(", ");
      return suffix ? `${name} (${suffix})` : name;
    }),
    ...session.speakers,
  ];

  return (
    <>
      <Modal
        opened={!!session}
        onClose={onClose}
        title={
          <Group gap="sm">
            <Text fw={600} size="lg">
              {session.title}
            </Text>
            {!session.isPublished && (
              <Badge size="sm" color="yellow" variant="light">
                Draft
              </Badge>
            )}
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          {/* Badges */}
          <Group gap="xs" wrap="wrap">
            {session.sessionType && (
              <Badge
                variant="light"
                style={{
                  backgroundColor: `${session.sessionType.color}20`,
                  color: session.sessionType.color,
                }}
              >
                {session.sessionType.name}
              </Badge>
            )}
            {session.track && (
              <Badge
                variant="light"
                style={{
                  backgroundColor: `${session.track.color}20`,
                  color: session.track.color,
                }}
              >
                {session.track.name}
              </Badge>
            )}
            {session.room && (
              <Badge variant="light" color="teal">
                {session.room.name}
              </Badge>
            )}
          </Group>

          {/* Date & Time */}
          <Stack gap={4}>
            <Text size="sm" fw={600} c="dimmed">
              Schedule
            </Text>
            <Group gap="xs">
              <IconClock size={14} />
              <Text size="sm">{dateStr}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm">
                {timeStr} ({durationStr})
              </Text>
            </Group>
          </Stack>

          {/* Speakers */}
          {speakerNames.length > 0 && (
            <Stack gap={4}>
              <Text size="sm" fw={600} c="dimmed">
                Speakers
              </Text>
              <Group gap="xs" wrap="wrap">
                {session.sessionSpeakers.map((s) => (
                  <Anchor
                    key={s.user.id}
                    href={`/profiles/${s.user.id}`}
                    underline="never"
                    target="_blank"
                    style={{ color: "inherit" }}
                  >
                    <Group gap={6} wrap="nowrap">
                      <Avatar src={s.user.image} size="sm" radius="xl">
                        {(
                          s.user.firstName?.[0] ??
                          s.user.name?.[0] ??
                          "?"
                        ).toUpperCase()}
                      </Avatar>
                      <Text size="sm">
                        {getDisplayName(s.user, "Unknown")}
                        {s.user.profile?.company && (
                          <Text span size="xs" c="dimmed">
                            {" "}
                            ({s.user.profile.company})
                          </Text>
                        )}
                        {s.role !== "Speaker" && (
                          <Text span size="xs" c="dimmed">
                            {" "}
                            · {s.role}
                          </Text>
                        )}
                      </Text>
                    </Group>
                  </Anchor>
                ))}
                {session.speakers.length > 0 && (
                  <Text size="sm" c="dimmed">
                    {session.speakers.join(", ")}
                  </Text>
                )}
              </Group>
            </Stack>
          )}

          {/* Description */}
          {session.description && (
            <Stack gap={4}>
              <Text size="sm" fw={600} c="dimmed">
                Description
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {session.description}
              </Text>
            </Stack>
          )}

          {/* Footer */}
          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={onClose}>
              Close
            </Button>
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={() => {
                openEdit();
              }}
            >
              Edit
            </Button>
          </Group>
        </Stack>
      </Modal>

      <EditSessionModal
        opened={editing}
        onClose={closeEdit}
        session={session}
        eventId={eventId}
        venueId={venueId}
        venues={venues}
        rooms={rooms}
        sessionTypes={sessionTypes}
        tracks={tracks}
        isAdmin={isAdmin}
      />
    </>
  );
}

// ──────────────────────────────────────────
// CreateSessionButton + Modal
// ──────────────────────────────────────────

interface CreateSessionButtonProps {
  eventId: string;
  venueId: string;
  rooms: VenueRoom[];
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  isAdmin: boolean;
  applicationsData?: FloorApplicationData[];
  prefillData?: SessionPrefillData | null;
  externalOpened?: boolean;
  onExternalClose?: () => void;
  eventStartDate?: Date | string | null;
}

function CreateSessionButton({
  eventId,
  venueId,
  rooms,
  sessionTypes,
  tracks,
  isAdmin,
  applicationsData,
  prefillData,
  externalOpened,
  onExternalClose,
  eventStartDate,
}: CreateSessionButtonProps) {
  const [internalOpened, { open: internalOpen, close: internalClose }] =
    useDisclosure(false);
  const utils = api.useUtils();

  const modalOpened = externalOpened ?? internalOpened;

  const getDefaultDate = useCallback(() => {
    const d = eventStartDate ? new Date(eventStartDate) : null;
    if (d && !isNaN(d.getTime())) {
      return new Date(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        12,
        0,
      );
    }
    return null;
  }, [eventStartDate]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [linkedSpeakers, setLinkedSpeakers] = useState<
    SelectedSpeakerWithRole[]
  >([]);
  const [textSpeakers, setTextSpeakers] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);

  // Set default dates once event data loads
  useEffect(() => {
    const d = getDefaultDate();
    if (d) {
      setStartTime((prev) => prev ?? d);
      setEndTime((prev) => prev ?? d);
    }
  }, [getDefaultDate]);

  // Apply prefill data when modal opens with prefill
  useEffect(() => {
    if (prefillData && externalOpened) {
      setTitle(prefillData.title);
      setDescription(prefillData.description);
      setLinkedSpeakers([{ user: prefillData.speaker, role: "Speaker" }]);
      setSessionTypeId(prefillData.sessionTypeId);
      setTrackId(prefillData.trackId);
    }
  }, [prefillData, externalOpened]);

  const createMutation = api.schedule.createSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Created",
        message: "Session created",
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      resetForm();
      handleClose();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime(getDefaultDate());
    setEndTime(getDefaultDate());
    setLinkedSpeakers([]);
    setTextSpeakers("");
    setRoomId(null);
    setSessionTypeId(null);
    setTrackId(null);
    setIsPublished(true);
  };

  const handleClose = () => {
    if (onExternalClose) {
      onExternalClose();
    }
    internalClose();
    resetForm();
  };

  const handleImportApplication = (appId: string | null) => {
    if (!appId || !applicationsData) return;
    const app = applicationsData.find((a) => a.id === appId);
    if (!app?.user) return;
    const profile = app.user.profile;
    setTitle(profile?.speakerTalkTitle ?? profile?.speakerEntityName ?? "");
    setDescription(profile?.speakerTalkAbstract ?? "");
    setLinkedSpeakers([
      {
        user: {
          id: app.user.id,
          firstName: app.user.firstName,
          surname: app.user.surname,
          name: app.user.name,
          email: app.user.email,
          image: app.user.image,
        },
        role: "Speaker",
      },
    ]);
    setSessionTypeId(
      findMatchingSessionType(profile?.speakerTalkFormat, sessionTypes),
    );
    setTrackId(findMatchingTrack(profile?.speakerTalkTopic, tracks));
  };

  const handleSubmit = () => {
    if (!title || !startTime || !endTime) {
      notifications.show({
        title: "Missing fields",
        message: "Title, start time, and end time are required",
        color: "orange",
      });
      return;
    }
    createMutation.mutate({
      eventId,
      title,
      description: description || undefined,
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
      venueId,
      roomId: roomId ?? undefined,
      sessionTypeId: sessionTypeId ?? undefined,
      trackId: trackId ?? undefined,
      isPublished,
    });
  };

  const importOptions = (applicationsData ?? []).flatMap((a) => {
    if (!a.user) return [];
    const user = a.user;
    return [
      {
        value: a.id,
        label: `${getDisplayName(user, "Unknown")}${user.profile?.speakerTalkTitle ? ` — ${user.profile.speakerTalkTitle}` : ""}`,
      },
    ];
  });

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={internalOpen}>
        Add Session
      </Button>

      <Modal
        opened={modalOpened}
        onClose={handleClose}
        title="Create Session"
        size="lg"
      >
        <Stack gap="sm">
          {!isAdmin && importOptions.length > 0 && (
            <Select
              label="Import from Application"
              placeholder="Select an application to auto-fill..."
              data={importOptions}
              onChange={handleImportApplication}
              leftSection={<IconDownload size={16} />}
              clearable
              searchable
            />
          )}
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
          <Group grow>
            <DateTimePicker
              label="Start Time"
              value={startTime}
              onChange={(val) => setStartTime(val ? new Date(val) : null)}
              required
            />
            <DateTimePicker
              label="End Time"
              value={endTime}
              onChange={(val) => setEndTime(val ? new Date(val) : null)}
              required
            />
          </Group>
          <SpeakerSelector
            linkedSpeakers={linkedSpeakers}
            onAddLinkedSpeaker={(user) =>
              setLinkedSpeakers((prev) => [...prev, { user, role: "Speaker" }])
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
          />
          {rooms.length > 0 && (
            <Select
              label="Room"
              placeholder="Select room"
              data={rooms.map((r) => ({ value: r.id, label: r.name }))}
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
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              Create Session
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// ──────────────────────────────────────────
// CSV Upload
// ──────────────────────────────────────────

interface CsvUploadButtonProps {
  eventId: string;
  venueId: string;
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  existingSessions: { title: string; startTime: Date; endTime: Date }[];
  eventYear: number;
  eventStartDate?: Date | string | null;
}

function CsvUploadButton({
  eventId,
  venueId,
  sessionTypes,
  tracks,
  existingSessions,
  eventYear,
  eventStartDate,
}: CsvUploadButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconUpload size={16} />}
        onClick={open}
      >
        Upload CSV
      </Button>
      <CsvUploadModal
        opened={opened}
        onClose={close}
        eventId={eventId}
        venueId={venueId}
        sessionTypes={sessionTypes}
        tracks={tracks}
        existingSessions={existingSessions}
        eventYear={eventYear}
        eventStartDate={eventStartDate}
      />
    </>
  );
}

interface CsvUploadModalProps {
  opened: boolean;
  onClose: () => void;
  eventId: string;
  venueId: string;
  sessionTypes: { id: string; name: string; color: string }[];
  tracks: { id: string; name: string; color: string }[];
  existingSessions: { title: string; startTime: Date; endTime: Date }[];
  eventYear: number;
  eventStartDate?: Date | string | null;
}

function CsvUploadModal({
  opened,
  onClose,
  eventId,
  venueId,
  sessionTypes,
  tracks,
  existingSessions,
  eventYear,
  eventStartDate,
}: CsvUploadModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: null,
    date: null,
    startTime: null,
    endTime: null,
    duration: null,
    presenters: null,
    type: null,
    curator: null,
    track: null,
    description: null,
    facilitator: null,
    order: null,
    room: null,
    slidesUrl: null,
    speakerEmail: null,
  });
  const [parsedSessions, setParsedSessions] = useState<ParsedCsvSession[]>([]);
  const [newTypesToCreate, setNewTypesToCreate] = useState<
    { name: string; color: string; create: boolean }[]
  >([]);
  const [newTracksToCreate, setNewTracksToCreate] = useState<
    { name: string; color: string; create: boolean }[]
  >([]);

  const utils = api.useUtils();

  const bulkCreateMutation = api.schedule.bulkCreateSessions.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Import Complete",
        message: `Created ${data.created} sessions successfully`,
        color: "green",
      });
      void utils.schedule.getFloorSessions.invalidate({ eventId, venueId });
      void utils.schedule.getAllFloorSessions.invalidate({ eventId });
      void utils.schedule.getMyFloors.invalidate({ eventId });
      void utils.schedule.getEventScheduleFilters.invalidate({ eventId });
      handleClose();
    },
    onError: (err) => {
      notifications.show({
        title: "Import Failed",
        message: err.message,
        color: "red",
      });
    },
  });

  // Collect unique speaker names for fuzzy matching
  const speakerNames = useMemo(() => {
    const names = new Set<string>();
    for (const session of parsedSessions) {
      for (const name of session.presenterNames) {
        names.add(name);
      }
      for (const name of session.facilitatorNames) {
        names.add(name);
      }
    }
    return Array.from(names);
  }, [parsedSessions]);

  // Collect speaker email mappings for enhanced matching
  const speakerEmailMap = useMemo(() => {
    const emails: Record<string, string> = {};
    for (const session of parsedSessions) {
      for (const [name, email] of Object.entries(session.speakerEmails)) {
        emails[name] = email;
      }
    }
    return emails;
  }, [parsedSessions]);

  // Fuzzy match speakers when we have parsed sessions
  const { data: speakerMatches } = api.schedule.fuzzyMatchSpeakers.useQuery(
    {
      eventId,
      names: speakerNames,
      emails: Object.keys(speakerEmailMap).length > 0 ? speakerEmailMap : undefined,
    },
    { enabled: speakerNames.length > 0 && activeStep >= 1 },
  );

  // Apply speaker matches to parsed sessions when they arrive
  useEffect(() => {
    if (!speakerMatches) return;
    setParsedSessions((prev) =>
      prev.map((session) => {
        const matched: SelectedSpeakerWithRole[] = [];
        const unmatched: string[] = [];
        const facilitatorSet = new Set(session.facilitatorNames);

        for (const name of [...session.presenterNames, ...session.facilitatorNames]) {
          const matches = speakerMatches[name];
          const exactMatch = matches?.find((m) => m.confidence === "exact");
          const role: ParticipantRole = facilitatorSet.has(name) ? "Facilitator" : "Speaker";
          if (exactMatch) {
            // Avoid duplicate if same person is both presenter and facilitator
            if (!matched.some((m) => m.user.id === exactMatch.userId)) {
              matched.push({
                user: {
                  id: exactMatch.userId,
                  firstName: exactMatch.firstName,
                  surname: exactMatch.surname,
                  name: exactMatch.name,
                  email: exactMatch.email,
                  image: exactMatch.image,
                },
                role,
              });
            }
          } else {
            unmatched.push(name);
          }
        }
        return {
          ...session,
          matchedSpeakers: matched,
          unmatchedSpeakers: unmatched,
        };
      }),
    );
  }, [speakerMatches]);

  const handleClose = () => {
    setActiveStep(0);
    setCsvFile(null);
    setRawHeaders([]);
    setRawData([]);
    setColumnMapping({
      title: null,
      date: null,
      startTime: null,
      endTime: null,
      duration: null,
      presenters: null,
      type: null,
      curator: null,
      track: null,
      description: null,
      facilitator: null,
      order: null,
      room: null,
      slidesUrl: null,
      speakerEmail: null,
    });
    setParsedSessions([]);
    setNewTypesToCreate([]);
    setNewTracksToCreate([]);
    onClose();
  };

  const handleFileChange = useCallback((file: File | null) => {
    setCsvFile(file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;

      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });

      if (result.errors.length > 0 && result.data.length === 0) {
        notifications.show({
          title: "Parse Error",
          message: "Could not parse CSV file. Check the format.",
          color: "red",
        });
        return;
      }

      let headers = result.meta.fields ?? [];
      let data = result.data;

      // If headers are all empty/auto-generated (_1, _2), use first data row as headers
      if (isJunkHeaderRow(headers) && data.length > 0) {
        const realHeaderRow = data[0]!;
        const oldKeys = headers;
        const realHeaders = oldKeys.map((k) => (realHeaderRow[k] ?? "").trim());
        data = data.slice(1).map((row) => {
          const newRow: Record<string, string> = {};
          for (let i = 0; i < oldKeys.length; i++) {
            const key = oldKeys[i]!;
            const realKey = realHeaders[i] ?? `Column ${i + 1}`;
            newRow[realKey] = row[key] ?? "";
          }
          return newRow;
        });
        headers = realHeaders.map((h, i) => h || `Column ${i + 1}`);
      }

      setRawHeaders(headers);
      setRawData(data);

      const detected = detectColumns(headers);
      setColumnMapping(detected);
    };
    reader.readAsText(file);
  }, []);

  const handleParseAndPreview = useCallback(() => {
    // Compute default date from event start date for CSVs without a date column
    const eventDate = eventStartDate ? new Date(eventStartDate) : null;
    const defaultDate =
      eventDate && !isNaN(eventDate.getTime())
        ? { month: eventDate.getUTCMonth(), day: eventDate.getUTCDate() }
        : undefined;

    const parsed = parseCsvRows(
      rawData,
      columnMapping,
      eventYear,
      sessionTypes,
      tracks,
      existingSessions,
      defaultDate,
    );
    setParsedSessions(parsed);

    // Detect new types/tracks needed
    const unmatchedTypes = new Set<string>();
    const unmatchedTracks = new Set<string>();
    for (const s of parsed) {
      if (s.sessionTypeName && !s.sessionTypeId)
        unmatchedTypes.add(s.sessionTypeName);
      if (s.trackName && !s.trackId) unmatchedTracks.add(s.trackName);
    }
    setNewTypesToCreate(
      Array.from(unmatchedTypes).map((name) => ({
        name,
        color: "#4299e1",
        create: true,
      })),
    );
    setNewTracksToCreate(
      Array.from(unmatchedTracks).map((name) => ({
        name,
        color: "#8b5cf6",
        create: true,
      })),
    );

    setActiveStep(1);
  }, [
    rawData,
    columnMapping,
    eventYear,
    eventStartDate,
    sessionTypes,
    tracks,
    existingSessions,
  ]);

  const handleImport = useCallback(() => {
    const toImport = parsedSessions.filter(
      (s) => s.included && s.status !== "error",
    );
    if (toImport.length === 0) {
      notifications.show({
        title: "Nothing to Import",
        message: "No sessions selected for import",
        color: "orange",
      });
      return;
    }

    const typesToCreate = newTypesToCreate.filter((t) => t.create);
    const tracksToCreate = newTracksToCreate.filter((t) => t.create);

    bulkCreateMutation.mutate({
      eventId,
      venueId,
      sessions: toImport.map((s) => ({
        title: s.title,
        description: s.description || undefined,
        startTime: s.startTime!,
        endTime: s.endTime!,
        speakers: s.unmatchedSpeakers,
        linkedSpeakers: s.matchedSpeakers.map((ms) => ({
          userId: ms.user.id,
          role: ms.role,
        })),
        sessionTypeId: s.sessionTypeId ?? undefined,
        trackId: s.trackId ?? undefined,
        slidesUrl: s.slidesUrl ?? undefined,
        order: s.order,
        isPublished: true,
      })),
      newSessionTypes:
        typesToCreate.length > 0
          ? typesToCreate.map((t) => ({ name: t.name, color: t.color }))
          : undefined,
      newTracks:
        tracksToCreate.length > 0
          ? tracksToCreate.map((t) => ({ name: t.name, color: t.color }))
          : undefined,
    });
  }, [
    parsedSessions,
    newTypesToCreate,
    newTracksToCreate,
    eventId,
    venueId,
    bulkCreateMutation,
  ]);

  const includedCount = parsedSessions.filter((s) => s.included).length;
  const readyCount = parsedSessions.filter((s) => s.status === "ready").length;
  const warningCount = parsedSessions.filter(
    (s) => s.status === "warning",
  ).length;
  const errorCount = parsedSessions.filter((s) => s.status === "error").length;

  const columnOptions = rawHeaders.map((h) => {
    const sample = rawData
      .slice(0, 5)
      .map((row) => row[h]?.trim())
      .find((v) => v && v.length > 0);
    const displayName = h || "(unnamed)";
    const label = sample
      ? `${displayName} (e.g., ${sample.length > 30 ? sample.slice(0, 30) + "\u2026" : sample})`
      : displayName;
    return { value: h, label };
  });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Import Schedule from CSV</Text>
          <Tooltip
            multiline
            w={360}
            withArrow
            label={
              <Stack gap={4}>
                <Text size="xs" fw={600}>
                  How it works
                </Text>
                <Text size="xs">
                  Upload a CSV with your schedule data. Columns are
                  auto-detected by header name and can be overridden manually.
                </Text>
                <Text size="xs" fw={600} mt={4}>
                  Supported columns
                </Text>
                <Text size="xs">
                  Title, Date, Start Time, End Time, Duration, Speakers,
                  Session Type, Track, Description, Facilitator, Room / Location
                </Text>
                <Text size="xs" fw={600} mt={4}>
                  Tips
                </Text>
                <Text size="xs">
                  If no Title column, the first line of Description is used as
                  the title. Duration like &quot;(45 mins)&quot; in the Location column
                  auto-calculates end times. Time ranges like &quot;11 AM - 6 PM&quot;
                  are parsed automatically. Speakers can be separated by commas
                  or newlines.
                </Text>
              </Stack>
            }
          >
            <IconInfoCircle
              size={18}
              style={{ opacity: 0.5, cursor: "help" }}
            />
          </Tooltip>
        </Group>
      }
      size="xl"
    >
      <Stepper active={activeStep} allowNextStepsSelect={false} size="sm">
        {/* Step 1: Upload & Map */}
        <Stepper.Step label="Upload" description="Select CSV file">
          <Stack gap="md" mt="md">
            <FileInput
              label="CSV File"
              placeholder="Choose a .csv file"
              accept=".csv,.tsv,.txt"
              value={csvFile}
              onChange={handleFileChange}
              leftSection={<IconUpload size={16} />}
            />
            <Anchor
              href="/csvs/SpeakerSessionUploadExampleFormat.csv"
              download
              size="sm"
              c="dimmed"
            >
              <Group gap={4}>
                <IconDownload size={14} />
                Download example CSV format
              </Group>
            </Anchor>

            {rawData.length > 0 && (
              <>
                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconCheck size={16} />}
                >
                  Parsed {rawData.length} rows with {rawHeaders.length} columns
                </Alert>

                <Text fw={600} size="sm">
                  Column Mapping
                </Text>
                <Text size="xs" c="dimmed">
                  Auto-detected columns are shown below. Override any that are
                  incorrect.
                </Text>

                <Group grow>
                  <Select
                    label="Title"
                    data={columnOptions}
                    value={columnMapping.title}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, title: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Date"
                    data={columnOptions}
                    value={columnMapping.date}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, date: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>
                <Group grow>
                  <Select
                    label="Start Time"
                    data={columnOptions}
                    value={columnMapping.startTime}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, startTime: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="End Time"
                    data={columnOptions}
                    value={columnMapping.endTime}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, endTime: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Duration"
                    data={columnOptions}
                    value={columnMapping.duration}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, duration: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>
                <Group grow>
                  <Select
                    label="Presenters"
                    data={columnOptions}
                    value={columnMapping.presenters}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, presenters: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Session Type"
                    data={columnOptions}
                    value={columnMapping.type}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, type: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>
                <Group grow>
                  <Select
                    label="Curator / Topic"
                    data={columnOptions}
                    value={columnMapping.curator}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, curator: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Track"
                    data={columnOptions}
                    value={columnMapping.track}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, track: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Description"
                    data={columnOptions}
                    value={columnMapping.description}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, description: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>
                <Group grow>
                  <Select
                    label="Facilitator"
                    data={columnOptions}
                    value={columnMapping.facilitator}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, facilitator: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Room / Floor"
                    data={columnOptions}
                    value={columnMapping.room}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, room: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>
                <Group grow>
                  <Select
                    label="Slide Link"
                    data={columnOptions}
                    value={columnMapping.slidesUrl}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, slidesUrl: v }))
                    }
                    clearable
                    size="xs"
                  />
                  <Select
                    label="Speaker Email"
                    data={columnOptions}
                    value={columnMapping.speakerEmail}
                    onChange={(v) =>
                      setColumnMapping((m) => ({ ...m, speakerEmail: v }))
                    }
                    clearable
                    size="xs"
                  />
                </Group>

                <Group justify="flex-end">
                  <Button onClick={handleParseAndPreview}>
                    Preview Import
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 2: Preview */}
        <Stepper.Step label="Preview" description="Review sessions">
          <Stack gap="md" mt="md">
            <Group gap="md">
              <Badge color="green" variant="light">
                {readyCount} ready
              </Badge>
              {warningCount > 0 && (
                <Badge color="yellow" variant="light">
                  {warningCount} warnings
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge color="red" variant="light">
                  {errorCount} errors
                </Badge>
              )}
              <Badge variant="light">{includedCount} selected</Badge>
            </Group>

            {newTypesToCreate.length > 0 && (
              <Alert
                variant="light"
                color="yellow"
                icon={<IconAlertCircle size={16} />}
                title="New session types to create"
              >
                <Stack gap="xs">
                  {newTypesToCreate.map((t, i) => (
                    <Checkbox
                      key={t.name}
                      label={t.name}
                      checked={t.create}
                      onChange={(e) =>
                        setNewTypesToCreate((prev) =>
                          prev.map((p, j) =>
                            i === j
                              ? { ...p, create: e.currentTarget.checked }
                              : p,
                          ),
                        )
                      }
                      size="xs"
                    />
                  ))}
                </Stack>
              </Alert>
            )}

            {newTracksToCreate.length > 0 && (
              <Alert
                variant="light"
                color="yellow"
                icon={<IconAlertCircle size={16} />}
                title="New tracks to create"
              >
                <Stack gap="xs">
                  {newTracksToCreate.map((t, i) => (
                    <Checkbox
                      key={t.name}
                      label={t.name}
                      checked={t.create}
                      onChange={(e) =>
                        setNewTracksToCreate((prev) =>
                          prev.map((p, j) =>
                            i === j
                              ? { ...p, create: e.currentTarget.checked }
                              : p,
                          ),
                        )
                      }
                      size="xs"
                    />
                  ))}
                </Stack>
              </Alert>
            )}

            <ScrollArea h={400}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Track</Table.Th>
                    <Table.Th>Speakers</Table.Th>
                    <Table.Th w={80}>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parsedSessions.map((session, idx) => (
                    <Table.Tr
                      key={idx}
                      style={{
                        opacity: session.included ? 1 : 0.5,
                      }}
                    >
                      <Table.Td>
                        <Checkbox
                          checked={session.included}
                          disabled={session.status === "error"}
                          onChange={(e) =>
                            setParsedSessions((prev) =>
                              prev.map((s, i) =>
                                i === idx
                                  ? { ...s, included: e.currentTarget.checked }
                                  : s,
                              ),
                            )
                          }
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>
                          {session.title}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {session.startTime && session.endTime ? (
                          <Text size="xs">
                            {session.startTime.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })}{" "}
                            {session.startTime.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "UTC",
                            })}
                            {" – "}
                            {session.endTime.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "UTC",
                            })}
                          </Text>
                        ) : (
                          <Text size="xs" c="red">
                            Invalid
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{session.sessionTypeName ?? "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{session.trackName ?? "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          {session.matchedSpeakers.map((ms) => (
                            <Group key={ms.user.id} gap={4}>
                              <Avatar
                                src={ms.user.image}
                                size={16}
                                radius="xl"
                              />
                              <Text size="xs">
                                {getDisplayName(ms.user, "Unknown")}
                              </Text>
                            </Group>
                          ))}
                          {session.unmatchedSpeakers.map((name) => (
                            <Text key={name} size="xs" c="dimmed" fs="italic">
                              {name}
                            </Text>
                          ))}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {session.status === "ready" && (
                          <Badge size="xs" color="green" variant="light">
                            Ready
                          </Badge>
                        )}
                        {session.status === "warning" && (
                          <Tooltip label={session.warnings.join("; ")}>
                            <Badge size="xs" color="yellow" variant="light">
                              Warning
                            </Badge>
                          </Tooltip>
                        )}
                        {session.status === "error" && (
                          <Tooltip label={session.errors.join("; ")}>
                            <Badge size="xs" color="red" variant="light">
                              Error
                            </Badge>
                          </Tooltip>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button
                onClick={() => setActiveStep(2)}
                disabled={includedCount === 0}
              >
                Continue ({includedCount} sessions)
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 3: Confirm */}
        <Stepper.Step label="Import" description="Confirm & create">
          <Stack gap="md" mt="md">
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Text fw={600}>Import Summary</Text>
                <Text size="sm">
                  Creating <strong>{includedCount}</strong> sessions
                </Text>
                {newTypesToCreate.filter((t) => t.create).length > 0 && (
                  <Text size="sm">
                    New session types:{" "}
                    {newTypesToCreate
                      .filter((t) => t.create)
                      .map((t) => t.name)
                      .join(", ")}
                  </Text>
                )}
                {newTracksToCreate.filter((t) => t.create).length > 0 && (
                  <Text size="sm">
                    New tracks:{" "}
                    {newTracksToCreate
                      .filter((t) => t.create)
                      .map((t) => t.name)
                      .join(", ")}
                  </Text>
                )}
                {parsedSessions.some((s) => s.matchedSpeakers.length > 0) && (
                  <Text size="sm">
                    Matched speakers:{" "}
                    {
                      new Set(
                        parsedSessions
                          .filter((s) => s.included)
                          .flatMap((s) =>
                            s.matchedSpeakers.map((ms) =>
                              getDisplayName(ms.user, "Unknown"),
                            ),
                          ),
                      ).size
                    }{" "}
                    users linked
                  </Text>
                )}
              </Stack>
            </Paper>

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                loading={bulkCreateMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Import {includedCount} Sessions
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Modal>
  );
}
