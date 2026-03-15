"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Avatar,
  Badge,
  Loader,
  Center,
  Anchor,
  Paper,
  Button,
  Tooltip,
  FileButton,
  TextInput,
  SegmentedControl,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconClock,
  IconMapPin,
  IconLink,
  IconUserPlus,
  IconEdit,
  IconFile,
  IconUpload,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import {
  QuickAddSpeakerModal,
  type QuickAddSpeakerResult,
} from "~/app/_components/QuickAddSpeakerModal";
import EditSessionModal, {
  type FloorSession,
} from "~/app/_components/EditSessionModal";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export default function SessionDetailPage() {
  const params = useParams<{ eventId: string; sessionId: string }>();
  const router = useRouter();
  const { data: userSession } = useSession();
  const utils = api.useUtils();

  const { data: session, isLoading } = api.schedule.getSession.useQuery({
    sessionId: params.sessionId,
  });

  // Check if current user can manage this session (only when logged in)
  const { data: permissions } = api.schedule.canManageSession.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!userSession?.user },
  );
  const canManage = permissions?.canManage ?? false;
  const isSpeakerOnly = permissions?.isSpeakerOnly ?? false;
  const isAdmin =
    userSession?.user?.role === "admin" || userSession?.user?.role === "staff";

  // Resolve text speaker names to user profiles
  const textSpeakerNames = session?.speakers ?? [];
  const { data: resolvedSpeakers } =
    api.schedule.resolveTextSpeakers.useQuery(
      { eventId: params.eventId, names: textSpeakerNames },
      { enabled: textSpeakerNames.length > 0 },
    );

  // Edit modal state
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);

  // Fetch filter data for edit modal (rooms, session types, tracks)
  const { data: filters } = api.schedule.getEventScheduleFilters.useQuery(
    { eventId: params.eventId },
    { enabled: canManage },
  );

  // Quick-add modal state
  const [quickAddOpened, { open: openQuickAdd, close: closeQuickAdd }] =
    useDisclosure(false);
  const [linkingTextSpeaker, setLinkingTextSpeaker] = useState<string | null>(
    null,
  );

  // Link speaker to session mutation
  const linkMutation = api.schedule.linkSpeakerToSession.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Speaker linked",
        message: "Speaker has been connected to this session",
        color: "green",
      });
      void utils.schedule.getSession.invalidate({
        sessionId: params.sessionId,
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSpeakerCreated = (user: QuickAddSpeakerResult) => {
    // After creating/finding the user, link them to this session
    linkMutation.mutate({
      sessionId: params.sessionId,
      userId: user.id,
      removeTextSpeaker: linkingTextSpeaker ?? undefined,
    });
    setLinkingTextSpeaker(null);
  };

  const handleLinkTextSpeaker = (name: string) => {
    setLinkingTextSpeaker(name);
    openQuickAdd();
  };

  const handleAddNewSpeaker = () => {
    setLinkingTextSpeaker(null);
    openQuickAdd();
  };

  // Split a full name into first/last name parts (best-effort)
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
    const last = parts.pop() ?? "";
    return { first: parts.join(" "), last };
  };

  const prefillParts = linkingTextSpeaker
    ? splitName(linkingTextSpeaker)
    : null;

  // Slides upload/link state
  const [uploadingSlides, setUploadingSlides] = useState(false);
  const [slidesMode, setSlidesMode] = useState<string>("upload");
  const [slidesLinkInput, setSlidesLinkInput] = useState("");

  const setSlidesLinkMutation = api.schedule.setSlidesLink.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Slides link saved",
        message: "Your slides link has been saved successfully.",
        color: "green",
      });
      setSlidesLinkInput("");
      void utils.schedule.getSession.invalidate({
        sessionId: params.sessionId,
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeSlideMutation = api.schedule.removeSessionSlides.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Slides removed",
        message: "Slides have been removed from this session.",
        color: "green",
      });
      void utils.schedule.getSession.invalidate({
        sessionId: params.sessionId,
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      notifications.show({
        title: "File too large",
        message: "Maximum file size is 50MB.",
        color: "red",
      });
      return;
    }

    setUploadingSlides(true);
    try {
      const formData = new FormData();
      formData.append("slides", file);
      formData.append("sessionId", params.sessionId);

      const response = await fetch("/api/upload/session-slides", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Upload failed");
      }

      notifications.show({
        title: "Slides uploaded",
        message: "Your slides have been uploaded successfully.",
        color: "green",
      });
      void utils.schedule.getSession.invalidate({
        sessionId: params.sessionId,
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message: error instanceof Error ? error.message : "Please try again.",
        color: "red",
      });
    } finally {
      setUploadingSlides(false);
    }
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Container size="md" py="xl">
        <Text c="dimmed">Session not found.</Text>
      </Container>
    );
  }

  const color = session.sessionType?.color ?? "#94a3b8";
  const hasSpeakers =
    session.sessionSpeakers.length > 0 || session.speakers.length > 0;
  const isCurrentUserSpeaker = session.sessionSpeakers.some(
    (s) => s.user.id === userSession?.user?.id,
  );
  const canUploadSlides = isCurrentUserSpeaker || isAdmin;

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Back link + edit button */}
        <Group justify="space-between" align="center">
          <Anchor
            component={Link}
            href={`/events/${params.eventId}/schedule`}
            size="sm"
            c="dimmed"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              router.back();
            }}
          >
            <Group gap={4}>
              <IconArrowLeft size={14} />
              Back to schedule
            </Group>
          </Anchor>
          {canManage && (
            <Button
              variant="light"
              size="sm"
              leftSection={<IconEdit size={16} />}
              onClick={openEdit}
            >
              Edit session
            </Button>
          )}
        </Group>

        {/* Session type badge */}
        {session.sessionType && (
          <Badge
            size="lg"
            variant="light"
            leftSection={
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            }
            style={{
              backgroundColor: `${color}15`,
              color: "var(--mantine-color-text)",
              alignSelf: "flex-start",
            }}
          >
            {session.sessionType.name}
          </Badge>
        )}

        {/* Title */}
        <Title order={1}>{session.title}</Title>

        {/* Location */}
        {session.venue && (
          <Group gap="xs">
            <IconMapPin
              size={18}
              style={{ color: "var(--mantine-color-dimmed)" }}
            />
            <Text size="md" c="dimmed">
              {session.venue.name}
              {session.room ? ` - ${session.room.name}` : ""}
            </Text>
          </Group>
        )}

        {/* Date and time */}
        <Group gap="xs">
          <IconClock
            size={18}
            style={{ color: "var(--mantine-color-dimmed)" }}
          />
          <Text size="md" c="dimmed">
            {formatDateTime(session.startTime)} {formatTime(session.startTime)}{" "}
            - {formatTime(session.endTime)}
          </Text>
        </Group>

        {/* Track */}
        {session.track && (
          <Badge
            size="md"
            variant="light"
            style={{
              backgroundColor: `${session.track.color}20`,
              color: session.track.color,
              alignSelf: "flex-start",
            }}
          >
            {session.track.name}
          </Badge>
        )}

        {/* Description */}
        {session.description && (
          <Paper p="md" withBorder radius="md">
            <Text size="md" style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {session.description}
            </Text>
          </Paper>
        )}

        {/* Slides */}
        {(session.slidesUrl ?? canUploadSlides) && (
          <Stack gap="md">
            <Title order={3}>Slides</Title>

            {/* Download link — visible to everyone when slides exist */}
            {session.slidesUrl && (
              <Paper p="md" withBorder radius="md">
                <Group justify="space-between" align="center">
                  <Group gap="md">
                    <IconFile
                      size={24}
                      style={{ color: "var(--mantine-color-dimmed)" }}
                    />
                    <Stack gap={2}>
                      <Anchor
                        href={session.slidesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        fw={500}
                      >
                        {session.slidesFileName ?? session.slidesUrl}
                      </Anchor>
                      {session.slidesUploadedAt && (
                        <Text size="xs" c="dimmed">
                          {session.slidesFileName ? "Uploaded" : "Added"}{" "}
                          {new Date(
                            session.slidesUploadedAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                  {canUploadSlides && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={() =>
                        removeSlideMutation.mutate({
                          sessionId: params.sessionId,
                        })
                      }
                      loading={removeSlideMutation.isPending}
                    >
                      Remove
                    </Button>
                  )}
                </Group>
              </Paper>
            )}

            {/* Upload/link area — only for speakers and admins */}
            {canUploadSlides && (
              <Paper
                p="md"
                withBorder
                radius="md"
                style={{ borderStyle: "dashed" }}
              >
                <Stack align="center" gap="sm">
                  <SegmentedControl
                    value={slidesMode}
                    onChange={setSlidesMode}
                    data={[
                      { label: "Upload File", value: "upload" },
                      { label: "Paste Link", value: "link" },
                    ]}
                    size="xs"
                  />

                  {slidesMode === "upload" ? (
                    <>
                      {!session.slidesUrl && (
                        <Text size="sm" c="dimmed">
                          Upload your presentation slides
                        </Text>
                      )}
                      <FileButton
                        onChange={(file) => void handleFileUpload(file)}
                      >
                        {(props) => (
                          <Button
                            {...props}
                            variant="light"
                            loading={uploadingSlides}
                            leftSection={<IconUpload size={16} />}
                          >
                            {session.slidesUrl
                              ? "Replace slides"
                              : "Upload slides"}
                          </Button>
                        )}
                      </FileButton>
                      <Text size="xs" c="dimmed">
                        Max 50MB. Any file type accepted.
                      </Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        placeholder="https://docs.google.com/presentation/d/..."
                        value={slidesLinkInput}
                        onChange={(e) =>
                          setSlidesLinkInput(e.currentTarget.value)
                        }
                        leftSection={<IconLink size={16} />}
                        style={{ width: "100%" }}
                      />
                      <Button
                        variant="light"
                        onClick={() =>
                          setSlidesLinkMutation.mutate({
                            sessionId: params.sessionId,
                            slidesUrl: slidesLinkInput,
                          })
                        }
                        loading={setSlidesLinkMutation.isPending}
                        disabled={!slidesLinkInput}
                      >
                        Save Link
                      </Button>
                    </>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {/* Speakers */}
        {(hasSpeakers || canManage) && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={3}>
                {session.sessionSpeakers.length + session.speakers.length === 1
                  ? "Speaker"
                  : "Speakers"}
              </Title>
              {canManage && !isSpeakerOnly && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconUserPlus size={14} />}
                  onClick={handleAddNewSpeaker}
                >
                  Add speaker
                </Button>
              )}
            </Group>
            {session.sessionSpeakers.map((speaker) => {
              const avatarSrc =
                speaker.user.profile?.avatarUrl ??
                speaker.user.image ??
                undefined;
              const name = getDisplayName(speaker.user, "Unknown");
              const titleParts = [
                speaker.user.profile?.jobTitle,
                speaker.user.profile?.company,
              ].filter(Boolean);
              const titleLine =
                titleParts.length > 0 ? titleParts.join(", ") : null;

              return (
                <Paper
                  key={speaker.user.id}
                  p="md"
                  withBorder
                  radius="md"
                  component={Link}
                  href={`/profiles/${speaker.user.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar
                      src={avatarSrc}
                      size={64}
                      radius="xl"
                      style={{ flexShrink: 0 }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={8} align="center">
                        <Text fw={700} size="lg" c="blue">
                          {name}
                        </Text>
                        {speaker.role !== "Speaker" && (
                          <Badge size="sm" variant="light" color="gray">
                            {speaker.role}
                          </Badge>
                        )}
                      </Group>
                      {titleLine && (
                        <Text size="sm" c="dimmed">
                          {titleLine}
                        </Text>
                      )}
                      {speaker.user.profile?.bio && (
                        <Text
                          size="sm"
                          style={{ lineHeight: 1.6, marginTop: 4 }}
                        >
                          {speaker.user.profile.bio}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
            {/* Legacy text-only speakers */}
            {session.speakers.map((speakerName) => {
              const resolved = resolvedSpeakers?.[speakerName];
              if (resolved) {
                // Matched to a user profile — render as clickable card
                const avatarSrc =
                  resolved.profile?.avatarUrl ?? resolved.image ?? undefined;
                const displayName = getDisplayName(resolved, speakerName);
                const titleParts = [
                  resolved.profile?.jobTitle,
                  resolved.profile?.company,
                ].filter(Boolean);
                const titleLine =
                  titleParts.length > 0 ? titleParts.join(", ") : null;

                return (
                  <Paper
                    key={speakerName}
                    p="md"
                    withBorder
                    radius="md"
                    component={Link}
                    href={`/profiles/${resolved.userId}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <Group gap="md" align="flex-start" wrap="nowrap">
                      <Avatar
                        src={avatarSrc}
                        size={64}
                        radius="xl"
                        style={{ flexShrink: 0 }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={700} size="lg" c="blue">
                          {displayName}
                        </Text>
                        {titleLine && (
                          <Text size="sm" c="dimmed">
                            {titleLine}
                          </Text>
                        )}
                        {resolved.profile?.bio && (
                          <Text
                            size="sm"
                            style={{ lineHeight: 1.6, marginTop: 4 }}
                          >
                            {resolved.profile.bio}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                );
              }

              // No match — render as plain text with admin link button
              return (
                <Paper key={speakerName} p="md" withBorder radius="md">
                  <Group gap="md" align="center" justify="space-between">
                    <Group gap="md" align="center">
                      <Avatar size={64} radius="xl">
                        {speakerName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Text fw={700} size="lg">
                        {speakerName}
                      </Text>
                    </Group>
                    {canManage && !isSpeakerOnly && (
                      <Tooltip label="Connect to a user profile">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconLink size={14} />}
                          onClick={() => handleLinkTextSpeaker(speakerName)}
                        >
                          Link profile
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* Quick Add Speaker Modal */}
      {canManage && session.event && (
        <QuickAddSpeakerModal
          opened={quickAddOpened}
          onClose={() => {
            closeQuickAdd();
            setLinkingTextSpeaker(null);
          }}
          eventId={session.event.id}
          venueId={session.venue?.id}
          onSpeakerCreated={handleSpeakerCreated}
          prefillFirstName={prefillParts?.first}
          prefillLastName={prefillParts?.last}
          sessionTitle={session.title}
          sessionDate={formatDateTime(session.startTime)}
          sessionTime={`${formatTime(session.startTime)} - ${formatTime(session.endTime)}`}
          roomName={session.room?.name}
        />
      )}

      {/* Edit Session Modal */}
      {canManage && session && filters && (
        <EditSessionModal
          opened={editOpened}
          onClose={closeEdit}
          session={
            {
              id: session.id,
              title: session.title,
              description: session.description,
              startTime: session.startTime,
              endTime: session.endTime,
              speakers: session.speakers,
              venueId: session.venueId,
              roomId: session.roomId,
              sessionTypeId: session.sessionTypeId,
              trackId: session.trackId,
              order: session.order,
              isPublished: session.isPublished,
              venue: session.venue,
              room: session.room,
              sessionType: session.sessionType,
              track: session.track,
              sessionSpeakers: session.sessionSpeakers.map((s) => ({
                role: s.role,
                user: {
                  id: s.user.id,
                  firstName: s.user.firstName,
                  surname: s.user.surname,
                  name: s.user.name,
                  email: s.user.email,
                  image: s.user.image,
                },
              })),
            } satisfies FloorSession
          }
          eventId={params.eventId}
          venueId={session.venueId ?? undefined}
          rooms={
            filters.venues.find((v) => v.id === session.venueId)?.rooms ?? []
          }
          sessionTypes={filters.sessionTypes}
          tracks={filters.tracks}
          isAdmin={isAdmin}
          isSpeakerOnly={isSpeakerOnly}
          onSuccess={() => {
            void utils.schedule.getSession.invalidate({
              sessionId: params.sessionId,
            });
            void utils.schedule.getEventSchedule.invalidate({
              eventId: params.eventId,
            });
          }}
        />
      )}
    </Container>
  );
}
