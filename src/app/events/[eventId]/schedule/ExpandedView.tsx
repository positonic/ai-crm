"use client";

import { useState } from "react";
import { Text, Badge, Group, Avatar, Stack } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDisplayName } from "~/utils/userDisplay";
import { type ScheduleSession } from "./SchedulePageClient";

export type ResolvedSpeakerMap = Record<
  string,
  {
    userId: string;
    firstName: string | null;
    surname: string | null;
    name: string | null;
    image: string | null;
    profile: {
      avatarUrl: string | null;
      bio: string | null;
      jobTitle: string | null;
      company: string | null;
    } | null;
  } | null
>;

interface ExpandedViewProps {
  sessions: ScheduleSession[];
  eventId: string;
  resolvedSpeakers?: ResolvedSpeakerMap;
  venueColorMap?: Record<string, string>;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function SpeakerBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 150;
  const displayText = isLong && !expanded ? bio.slice(0, 150) + "..." : bio;

  return (
    <div>
      <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
        {displayText}
      </Text>
      {isLong && (
        <Text
          size="xs"
          c="blue"
          style={{ cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Read More \u2192"}
        </Text>
      )}
    </div>
  );
}

export default function ExpandedView({ sessions, eventId, resolvedSpeakers, venueColorMap }: ExpandedViewProps) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions scheduled yet.
      </Text>
    );
  }

  // Group by time slot
  const byTime = new Map<string, ScheduleSession[]>();
  for (const session of sessions) {
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

  return (
    <Stack gap="md">
      {Array.from(byTime.entries()).map(([time, timeSessions]) => (
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
          <Stack gap="md">
            {timeSessions.map((session) => {
              const color = venueColorMap?.[session.venueId ?? ""] ?? session.sessionType?.color ?? "#94a3b8";
              const hasSpeakers =
                session.sessionSpeakers.length > 0 ||
                session.speakers.length > 0;

              return (
                <Link
                  key={session.id}
                  href={`/events/${eventId}/schedule/${session.id}`}
                  className="expanded-session-card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {/* Color header bar */}
                  <div
                    className="expanded-session-header"
                    style={{ backgroundColor: color }}
                  />

                  <div className="expanded-session-body">
                    {/* Title */}
                    <Text fw={700} size="md">
                      {session.title}
                    </Text>

                    {/* Time and venue */}
                    <Text size="sm" c="dimmed">
                      {formatTime(session.startTime)} -{" "}
                      {formatTime(session.endTime)}
                      {session.venue
                        ? ` \u2022 ${session.venue.name}${session.room ? ` - ${session.room.name}` : ""}`
                        : ""}
                    </Text>

                    {/* Description */}
                    {session.description && (
                      <Text size="sm" mt="xs" style={{ lineHeight: 1.5 }}>
                        {session.description}
                      </Text>
                    )}

                    {/* Speakers */}
                    {hasSpeakers && (
                      <div className="expanded-speakers-section">
                        <Text fw={600} size="sm" mb="xs">
                          Speakers
                        </Text>
                        <Stack gap="sm">
                          {session.sessionSpeakers.map((speaker) => {
                            const avatarSrc =
                              speaker.user.profile?.avatarUrl ??
                              speaker.user.image ??
                              undefined;
                            const name = getDisplayName(
                              speaker.user,
                              "Unknown",
                            );
                            const titleParts = [
                              speaker.user.profile?.jobTitle,
                              speaker.user.profile?.company,
                            ].filter(Boolean);
                            const titleLine =
                              titleParts.length > 0
                                ? titleParts.join(", ")
                                : null;

                            return (
                              <Group
                                key={speaker.user.id}
                                gap="sm"
                                align="flex-start"
                                wrap="nowrap"
                              >
                                <Avatar
                                  src={avatarSrc}
                                  size={40}
                                  radius="xl"
                                  style={{ flexShrink: 0 }}
                                >
                                  {name.charAt(0).toUpperCase()}
                                </Avatar>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <Group gap={6} align="center">
                                    <Text
                                      fw={600}
                                      size="sm"
                                      c="blue"
                                      style={{ cursor: "pointer" }}
                                      onClick={(e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        router.push(
                                          `/profiles/${speaker.user.id}`,
                                        );
                                      }}
                                      onMouseEnter={(
                                        e: React.MouseEvent<HTMLSpanElement>,
                                      ) => {
                                        e.currentTarget.style.textDecoration =
                                          "underline";
                                      }}
                                      onMouseLeave={(
                                        e: React.MouseEvent<HTMLSpanElement>,
                                      ) => {
                                        e.currentTarget.style.textDecoration =
                                          "none";
                                      }}
                                    >
                                      {name}
                                    </Text>
                                    {speaker.role !== "Speaker" && (
                                      <Badge
                                        size="xs"
                                        variant="light"
                                        color="gray"
                                      >
                                        {speaker.role}
                                      </Badge>
                                    )}
                                  </Group>
                                  {titleLine && (
                                    <Text size="xs" c="dimmed">
                                      {titleLine}
                                    </Text>
                                  )}
                                  {speaker.user.profile?.bio && (
                                    <SpeakerBio
                                      bio={speaker.user.profile.bio}
                                    />
                                  )}
                                </div>
                              </Group>
                            );
                          })}
                          {/* Legacy text-only speakers */}
                          {session.speakers.map((speakerName) => {
                            const resolved = resolvedSpeakers?.[speakerName];
                            const avatarSrc = resolved
                              ? (resolved.profile?.avatarUrl ??
                                resolved.image ??
                                undefined)
                              : undefined;
                            const displayName = resolved
                              ? getDisplayName(resolved, speakerName)
                              : speakerName;

                            return (
                              <Group
                                key={speakerName}
                                gap="sm"
                                align="center"
                              >
                                <Avatar
                                  src={avatarSrc}
                                  size={40}
                                  radius="xl"
                                >
                                  {displayName.charAt(0).toUpperCase()}
                                </Avatar>
                                {resolved ? (
                                  <Text
                                    fw={600}
                                    size="sm"
                                    c="blue"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e: React.MouseEvent) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      router.push(
                                        `/profiles/${resolved.userId}`,
                                      );
                                    }}
                                    onMouseEnter={(
                                      e: React.MouseEvent<HTMLSpanElement>,
                                    ) => {
                                      e.currentTarget.style.textDecoration =
                                        "underline";
                                    }}
                                    onMouseLeave={(
                                      e: React.MouseEvent<HTMLSpanElement>,
                                    ) => {
                                      e.currentTarget.style.textDecoration =
                                        "none";
                                    }}
                                  >
                                    {displayName}
                                  </Text>
                                ) : (
                                  <Text fw={600} size="sm">
                                    {speakerName}
                                  </Text>
                                )}
                              </Group>
                            );
                          })}
                        </Stack>
                      </div>
                    )}

                    {/* Footer: session type badge and track */}
                    <Group gap="sm" mt="sm">
                      {session.sessionType && (
                        <Badge
                          size="sm"
                          variant="light"
                          leftSection={
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: session.sessionType.color,
                              }}
                            />
                          }
                          style={{
                            backgroundColor: `${session.sessionType.color}15`,
                            color: "var(--expanded-badge-text)",
                          }}
                        >
                          {session.sessionType.name}
                        </Badge>
                      )}
                      {session.track && (
                        <Badge
                          size="sm"
                          variant="light"
                          style={{
                            backgroundColor: `${session.track.color}20`,
                            color: session.track.color,
                          }}
                        >
                          {session.track.name}
                        </Badge>
                      )}
                    </Group>
                  </div>
                </Link>
              );
            })}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
