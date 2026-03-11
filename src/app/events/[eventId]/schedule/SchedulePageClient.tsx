"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Select,
  Checkbox,
  Loader,
  Center,
  Tabs,
  Badge,
  Menu,
  Button,
  Chip,
} from "@mantine/core";
import { IconSearch, IconEye, IconCheck, IconUser } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import TimetableView from "./TimetableView";
import ExpandedView from "./ExpandedView";
import ByFloorView from "./ByFloorView";
import "./schedule.css";

export type ScheduleSession = {
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
  venue: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    role: string;
    user: {
      id: string;
      firstName: string | null;
      surname: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
      profile: {
        bio: string | null;
        jobTitle: string | null;
        company: string | null;
        avatarUrl: string | null;
      } | null;
    };
  }>;
};

interface SchedulePageClientProps {
  eventId: string;
  embed?: boolean;
}

export default function SchedulePageClient({ eventId, embed = false }: SchedulePageClientProps) {
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<"simple" | "expanded" | "grid" | "by-floor">(() => {
    const view = searchParams.get("view");
    if (view === "expanded" || view === "grid" || view === "by-floor") return view;
    return "simple";
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [activeVenueId, setActiveVenueId] = useState<string | null>(() => searchParams.get("venue"));
  const [activeSessionTypes, setActiveSessionTypes] = useState<string[]>(() => {
    const types = searchParams.get("types");
    return types ? types.split(",") : [];
  });
  const [activeTracks, setActiveTracks] = useState<string[]>(() => {
    const tracks = searchParams.get("tracks");
    return tracks ? tracks.split(",") : [];
  });
  const [showMySessions, setShowMySessions] = useState(() => searchParams.get("my") === "true");

  const { data: authSession } = useSession();
  const userId = authSession?.user?.id;

  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSetViewMode = useCallback((mode: "simple" | "expanded" | "grid" | "by-floor") => {
    setViewMode(mode);
    updateUrlParams({ view: mode === "simple" ? null : mode });
  }, [updateUrlParams]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    updateUrlParams({ q: query || null });
  }, [updateUrlParams]);

  const handleVenueChange = useCallback((venueId: string | null) => {
    setActiveVenueId(venueId);
    updateUrlParams({ venue: venueId });
  }, [updateUrlParams]);

  const handleToggleMySessions = useCallback((checked: boolean) => {
    setShowMySessions(checked);
    updateUrlParams({ my: checked ? "true" : null });
  }, [updateUrlParams]);

  const { data: scheduleData, isLoading: scheduleLoading } =
    api.schedule.getEventSchedule.useQuery({ eventId });
  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const sessions = scheduleData?.sessions;

  // Stage 1: Filter sessions (shared between both views)
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
      // My Sessions filter
      if (showMySessions && userId) {
        if (!session.sessionSpeakers.some((s) => s.user.id === userId)) return false;
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = session.title.toLowerCase().includes(q);
        const matchesSpeaker =
          session.speakers.some((s) => s.toLowerCase().includes(q)) ||
          session.sessionSpeakers.some((s) =>
            getDisplayName(s.user, "").toLowerCase().includes(q),
          );
        const matchesVenue = session.venue?.name.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesSpeaker && !matchesVenue) return false;
      }
      // Venue filter
      if (activeVenueId && session.venueId !== activeVenueId) return false;
      // Session type filter
      if (
        activeSessionTypes.length > 0 &&
        session.sessionTypeId &&
        !activeSessionTypes.includes(session.sessionTypeId)
      ) {
        return false;
      }
      // Track filter
      if (
        activeTracks.length > 0 &&
        session.trackId &&
        !activeTracks.includes(session.trackId)
      ) {
        return false;
      }
      return true;
    });
  }, [sessions, showMySessions, userId, searchQuery, activeVenueId, activeSessionTypes, activeTracks]);

  // Stage 2: Group by day (shared between both views)
  const { days, sessionsByDay } = useMemo(() => {
    const byDay = new Map<string, ScheduleSession[]>();
    const dayTimestamps = new Map<string, number>();

    for (const session of filteredSessions) {
      const d = new Date(session.startTime);
      const dayKey = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });

      if (!dayTimestamps.has(dayKey)) {
        dayTimestamps.set(dayKey, Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }

      const existing = byDay.get(dayKey) ?? [];
      existing.push(session);
      byDay.set(dayKey, existing);
    }

    // Sort days chronologically by their actual UTC date
    const sortedDays = Array.from(byDay.keys()).sort(
      (a, b) => (dayTimestamps.get(a) ?? 0) - (dayTimestamps.get(b) ?? 0),
    );

    return { days: sortedDays, sessionsByDay: byDay };
  }, [filteredSessions]);

  // Stage 3: Group by time slot (agenda view only)
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const selectedDay = activeDay ?? days[0] ?? null;

  const timeSlots = useMemo(() => {
    if (!selectedDay) return undefined;
    const daySessions = sessionsByDay.get(selectedDay);
    if (!daySessions) return undefined;

    const byTime = new Map<string, ScheduleSession[]>();
    for (const session of daySessions) {
      const timeKey = new Date(session.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
      const existing = byTime.get(timeKey) ?? [];
      existing.push(session);
      byTime.set(timeKey, existing);
    }
    return byTime;
  }, [selectedDay, sessionsByDay]);

  const toggleSessionType = useCallback((typeId: string) => {
    setActiveSessionTypes((prev) => {
      const next = prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId];
      updateUrlParams({ types: next.length > 0 ? next.join(",") : null });
      return next;
    });
  }, [updateUrlParams]);

  const toggleTrack = useCallback((trackId: string) => {
    setActiveTracks((prev) => {
      const next = prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId];
      updateUrlParams({ tracks: next.length > 0 ? next.join(",") : null });
      return next;
    });
  }, [updateUrlParams]);

  if (scheduleLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!scheduleData?.event) {
    return (
      <Container size="xl" py="xl">
        <Text c="dimmed">Event not found.</Text>
      </Container>
    );
  }

  const daySessions = selectedDay ? sessionsByDay.get(selectedDay) ?? [] : [];
  const venues = filterData?.venues?.map((v) => ({
    id: v.id,
    name: v.name,
    rooms: v.rooms ?? [],
  })) ?? [];

  return (
    <Container size="xl" py={embed ? "sm" : "xl"}>
      {/* Header with title and view toggle - hidden in embed mode */}
      {!embed && (
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Title order={1}>{scheduleData.event.name}</Title>
              {showMySessions && (
                <Badge variant="filled" color="blue" size="lg">
                  {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </Group>
            {scheduleData.event.location && (
              <Text c="dimmed" size="sm">
                {scheduleData.event.location}
              </Text>
            )}
          </Stack>
          <Menu shadow="md" width={180}>
            <Menu.Target>
              <Button variant="default" leftSection={<IconEye size={16} />} size="sm">
                View
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={() => handleSetViewMode("simple")}
                rightSection={viewMode === "simple" ? <IconCheck size={14} /> : null}
              >
                Simple
              </Menu.Item>
              <Menu.Item
                onClick={() => handleSetViewMode("expanded")}
                rightSection={viewMode === "expanded" ? <IconCheck size={14} /> : null}
              >
                Expanded
              </Menu.Item>
              <Menu.Item
                onClick={() => handleSetViewMode("grid")}
                rightSection={viewMode === "grid" ? <IconCheck size={14} /> : null}
              >
                Grid
              </Menu.Item>
              <Menu.Item
                onClick={() => handleSetViewMode("by-floor")}
                rightSection={viewMode === "by-floor" ? <IconCheck size={14} /> : null}
              >
                By Floor
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      )}

      {/* Day tabs (shared between both views) */}
      {days.length > 1 && (
        <Tabs
          value={selectedDay}
          onChange={setActiveDay}
          mb="md"
          variant="outline"
        >
          <Tabs.List>
            {days.map((day) => (
              <Tabs.Tab key={day} value={day}>
                {day}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}

      {days.length === 1 && selectedDay && (
        <Title order={3} mb="md" c="dimmed" fw={500}>
          {selectedDay}
        </Title>
      )}

      {/* View-specific content */}
      {viewMode === "simple" ? (
        <div className="schedule-layout">
          {/* Main schedule area */}
          <div>
            {!selectedDay || !timeSlots ? (
              <Stack align="center" py="xl" gap="sm">
                {showMySessions ? (
                  <>
                    <IconUser size={40} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" ta="center">
                      You are not assigned to any sessions yet.
                    </Text>
                    <Button variant="subtle" size="sm" onClick={() => handleToggleMySessions(false)}>
                      View all sessions
                    </Button>
                  </>
                ) : (
                  <Text c="dimmed" ta="center">
                    No sessions scheduled yet.
                  </Text>
                )}
              </Stack>
            ) : (
              <Stack gap={4}>
                {Array.from(timeSlots.entries()).map(([time, timeSessions]) => (
                  <div key={time} className="schedule-time-group">
                    <div className="schedule-time-label">
                      <Text
                        fw={600}
                        size="sm"
                        style={{ color: "var(--schedule-time-label-color)" }}
                      >
                        {time}
                      </Text>
                    </div>
                    <Stack gap={4}>
                      {timeSessions.map((session) => (
                        <Link
                          key={session.id}
                          href={`/events/${eventId}/schedule/${session.id}`}
                          target={embed ? "_blank" : undefined}
                          rel={embed ? "noopener noreferrer" : undefined}
                          className="schedule-session-card"
                          style={{
                            borderLeft: `4px solid ${session.sessionType?.color ?? "#94a3b8"}`,
                            backgroundColor: session.sessionType?.color
                              ? `${session.sessionType.color}12`
                              : undefined,
                            textDecoration: "none",
                            color: "inherit",
                            display: "block",
                          }}
                        >
                          <Text fw={600} size="sm">
                            {session.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(session.startTime).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                              timeZone: "UTC",
                            })}
                            {" – "}
                            {new Date(session.endTime).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                              timeZone: "UTC",
                            })}
                          </Text>
                          {session.sessionType && (
                            <Text size="xs" c="dimmed">
                              {session.sessionType.name}
                            </Text>
                          )}
                          {(session.sessionSpeakers.length > 0 || session.speakers.length > 0) && (
                            <Group gap={4} wrap="wrap">
                              {session.sessionSpeakers.map((s) => (
                                <Text key={s.user.id} size="xs" c="dimmed">
                                  {getDisplayName(s.user, "Unknown")}
                                  {s.role !== "Speaker" ? ` (${s.role})` : ""}
                                  {s.user.profile?.company && (
                                    <Text span size="xs" c="dimmed" style={{ opacity: 0.7 }}>
                                      {" · "}{s.user.profile.company}
                                    </Text>
                                  )}
                                </Text>
                              ))}
                              {session.speakers.map((name) => (
                                <Text key={name} size="xs" c="dimmed">{name}</Text>
                              ))}
                            </Group>
                          )}
                          {session.venue && (
                            <Text size="xs" c="dimmed">
                              {session.venue.name}
                              {session.room ? ` - ${session.room.name}` : ""}
                            </Text>
                          )}
                        </Link>
                      ))}
                    </Stack>
                  </div>
                ))}
              </Stack>
            )}
          </div>

          {/* Filter sidebar */}
          <div className="schedule-sidebar">
            <Stack gap="md">
              {userId && (
                <div className="schedule-filter-section">
                  <Chip
                    checked={showMySessions}
                    onChange={handleToggleMySessions}
                    variant="filled"
                    color="blue"
                    icon={<IconUser size={14} />}
                  >
                    My Sessions
                  </Chip>
                </div>
              )}

              <div className="schedule-filter-section">
                <TextInput
                  placeholder="Schedule or people"
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.currentTarget.value)}
                  styles={{
                    input: {
                      backgroundColor: "var(--schedule-search-bg)",
                    },
                  }}
                />
              </div>

              {filterData?.venues && filterData.venues.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Venue
                  </Text>
                  <Select
                    placeholder="All venues"
                    data={filterData.venues.map((v) => ({
                      value: v.id,
                      label: v.name,
                    }))}
                    value={activeVenueId}
                    onChange={handleVenueChange}
                    clearable
                    styles={{
                      input: {
                        backgroundColor: "var(--schedule-search-bg)",
                      },
                    }}
                  />
                </div>
              )}

              {filterData?.sessionTypes && filterData.sessionTypes.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Type
                  </Text>
                  <Stack gap={6}>
                    {filterData.sessionTypes.map((type) => (
                      <Checkbox
                        key={type.id}
                        checked={activeSessionTypes.includes(type.id)}
                        onChange={() => toggleSessionType(type.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: type.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{type.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}

              {sessions && sessions.length > 0 && (
                <div className="schedule-filter-section">
                  <Group gap="xs">
                    <Badge variant="light" size="sm">
                      {sessions.length} sessions
                    </Badge>
                  </Group>
                </div>
              )}
            </Stack>
          </div>
        </div>
      ) : viewMode === "expanded" ? (
        <div className="schedule-layout">
          <ExpandedView sessions={daySessions} eventId={eventId} />
          {/* Filter sidebar */}
          <div className="schedule-sidebar">
            <Stack gap="md">
              {userId && (
                <div className="schedule-filter-section">
                  <Chip
                    checked={showMySessions}
                    onChange={handleToggleMySessions}
                    variant="filled"
                    color="blue"
                    icon={<IconUser size={14} />}
                  >
                    My Sessions
                  </Chip>
                </div>
              )}

              <div className="schedule-filter-section">
                <TextInput
                  placeholder="Schedule or people"
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.currentTarget.value)}
                  styles={{
                    input: {
                      backgroundColor: "var(--schedule-search-bg)",
                    },
                  }}
                />
              </div>

              {filterData?.venues && filterData.venues.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Venue
                  </Text>
                  <Select
                    placeholder="All venues"
                    data={filterData.venues.map((v) => ({
                      value: v.id,
                      label: v.name,
                    }))}
                    value={activeVenueId}
                    onChange={handleVenueChange}
                    clearable
                    styles={{
                      input: {
                        backgroundColor: "var(--schedule-search-bg)",
                      },
                    }}
                  />
                </div>
              )}

              {filterData?.sessionTypes && filterData.sessionTypes.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Type
                  </Text>
                  <Stack gap={6}>
                    {filterData.sessionTypes.map((type) => (
                      <Checkbox
                        key={type.id}
                        checked={activeSessionTypes.includes(type.id)}
                        onChange={() => toggleSessionType(type.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: type.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{type.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <TimetableView sessions={daySessions} venues={venues} eventId={eventId} />
      ) : viewMode === "by-floor" ? (
        <div className="schedule-layout">
          <ByFloorView sessions={daySessions} venues={venues} eventId={eventId} />
          {/* Filter sidebar */}
          <div className="schedule-sidebar">
            <Stack gap="md">
              {userId && (
                <div className="schedule-filter-section">
                  <Chip
                    checked={showMySessions}
                    onChange={handleToggleMySessions}
                    variant="filled"
                    color="blue"
                    icon={<IconUser size={14} />}
                  >
                    My Sessions
                  </Chip>
                </div>
              )}

              <div className="schedule-filter-section">
                <TextInput
                  placeholder="Schedule or people"
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.currentTarget.value)}
                  styles={{
                    input: {
                      backgroundColor: "var(--schedule-search-bg)",
                    },
                  }}
                />
              </div>

              {filterData?.sessionTypes && filterData.sessionTypes.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Type
                  </Text>
                  <Stack gap={6}>
                    {filterData.sessionTypes.map((type) => (
                      <Checkbox
                        key={type.id}
                        checked={activeSessionTypes.includes(type.id)}
                        onChange={() => toggleSessionType(type.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: type.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{type.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
