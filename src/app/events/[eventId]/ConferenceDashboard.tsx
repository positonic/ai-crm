"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Loader,
  Center,
  Divider,
  Spoiler,
  Timeline,
  Collapse,
  Anchor,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconSettings,
  IconMicrophone,
  IconUserPlus,
  IconCheck,
  IconSearch,
  IconCircleDashed,
  IconSend,
  IconChevronDown,
  IconChevronUp,
  IconBriefcase,
  IconWorld,
  IconBrandLinkedin,
  IconBrandX,
  IconVideo,
  IconInfoCircle,
  IconEdit,
  IconTarget,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { AddSpeakerModal } from "./AddSpeakerModal";

function getStatusColor(status: string): string {
  switch (status) {
    case "DRAFT": return "gray";
    case "SUBMITTED": return "blue";
    case "UNDER_REVIEW": return "yellow";
    case "ACCEPTED": return "green";
    case "REJECTED": return "red";
    case "WAITLISTED": return "orange";
    case "CANCELLED": return "gray";
    default: return "gray";
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "DRAFT": return "Your application is saved as a draft. Submit when ready.";
    case "SUBMITTED": return "Your application is pending review.";
    case "UNDER_REVIEW": return "Your application is currently under review.";
    case "ACCEPTED": return "Your talk has been accepted!";
    case "REJECTED": return "Unfortunately, your talk was not selected for this event.";
    case "WAITLISTED": return "Your talk has been placed on the waitlist.";
    case "CANCELLED": return "Your application has been cancelled.";
    default: return "";
  }
}

function getTimelineActiveStep(status: string): number {
  switch (status) {
    case "DRAFT": return 0;
    case "SUBMITTED": return 1;
    case "UNDER_REVIEW": return 2;
    case "ACCEPTED":
    case "REJECTED":
    case "WAITLISTED":
      return 3;
    case "CANCELLED": return 0;
    default: return 0;
  }
}

function getNextStepsGuidance(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Complete and submit your application to be considered for the conference.";
    case "SUBMITTED":
      return "Our selection committee is reviewing all speaker applications. We\u2019ll notify you by email once a decision is made.";
    case "UNDER_REVIEW":
      return "Your application has advanced to active review by our selection committee. We\u2019ll be in touch soon.";
    case "ACCEPTED":
      return "Your talk has been accepted! Check below for your session assignments and prepare your materials.";
    case "WAITLISTED":
      return "Your talk is on our waitlist. We\u2019ll notify you by email if a spot opens up.";
    case "REJECTED":
      return "We appreciate your interest and encourage you to apply for future events.";
    case "CANCELLED":
      return "Your application has been cancelled.";
    default:
      return "";
  }
}

function DeliberationCard({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const { data: deliberation } = api.deliberation.getDeliberation.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  if (!deliberation) return null;

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconTarget size={20} color="var(--mantine-color-grape-6)" />
          <Title order={4}>Community Priorities</Title>
          <Badge variant="light" color="green" size="sm">
            {deliberation.status === "COLLECTING" ? "Open" : deliberation.status.toLowerCase()}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {deliberation.description ?? "Share what matters most and vote on community priorities."}
        </Text>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {deliberation._count.priorities} priorities &middot; {deliberation.totalVotes} votes
          </Text>
        </Group>
        <Group>
          <Button
            component={Link}
            href={`/events/${eventSlug}/deliberation`}
            leftSection={<IconTarget size={16} />}
            variant="light"
            color="grape"
          >
            View Priorities
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

const talkFormatLabels: Record<string, string> = {
  "Art Installation": "Art Installation",
  "Demonstration": "Demonstration",
  "Workshop": "Workshop",
  "Panel Discussion": "Panel Discussion",
  "Talk / Presentation": "Talk / Presentation",
  "Music Performance": "Music Performance",
  "Other": "Other",
  // Legacy values
  keynote: "Keynote",
  talk: "Talk",
  panel: "Panel Discussion",
  lightning: "Lightning Talk",
  fireside: "Fireside Chat",
};

interface ConferenceDashboardProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
  isSpeaker: boolean;
  isFloorOwner: boolean;
  isAdmin: boolean;
  hasSpeakerApplication: boolean;
}

export default function ConferenceDashboard({
  eventId,
  eventSlug,
  eventName,
  isSpeaker,
  isFloorOwner,
  isAdmin,
  hasSpeakerApplication,
}: ConferenceDashboardProps) {
  const [addSpeakerOpened, { open: openAddSpeaker, close: closeAddSpeaker }] = useDisclosure(false);
  const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(false);

  const { data: mySessions, isLoading: sessionsLoading } =
    api.schedule.getMySessions.useQuery(
      { eventId },
      { enabled: isSpeaker || hasSpeakerApplication },
    );

  // Fetch speaker application and profile for talk submission status
  const { data: speakerApplication, isLoading: applicationLoading } =
    api.application.getApplication.useQuery(
      { eventId, applicationType: "SPEAKER" },
    );

  const { data: myProfile, isLoading: profileLoading } =
    api.profile.getMyProfile.useQuery();

  const submissionLoading = applicationLoading || profileLoading;
  const applicationStatus = speakerApplication?.status ?? "";
  const isDecisionMade = ["ACCEPTED", "REJECTED", "WAITLISTED"].includes(applicationStatus);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>{eventName}</Title>
          <Text c="dimmed" size="sm">Speaker Dashboard</Text>
        </div>

        {/* My Talk Submission - only show if user has a speaker application or is a speaker */}
        {(hasSpeakerApplication || isSpeaker) && (
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconMicrophone size={20} color="var(--mantine-color-teal-6)" />
                <Title order={4}>My Talk Submission</Title>
              </Group>
              {speakerApplication && (
                <Badge
                  variant="light"
                  color={getStatusColor(speakerApplication.status)}
                >
                  {speakerApplication.status.replace("_", " ")}
                </Badge>
              )}
            </Group>

            {submissionLoading ? (
              <Center py="md">
                <Loader size="sm" />
              </Center>
            ) : !speakerApplication ? (
              <Stack gap="sm">
                <Text c="dimmed" size="sm">
                  No speaker application found for this event.
                </Text>
                <Group>
                  <Button
                    component={Link}
                    href={`/events/${eventSlug}/apply`}
                    variant="light"
                    color="teal"
                    size="sm"
                    leftSection={<IconMicrophone size={16} />}
                  >
                    Submit Speaker Application
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="sm">
                <Text size="sm" c={getStatusColor(speakerApplication.status)}>
                  {getStatusMessage(speakerApplication.status)}
                </Text>

                {myProfile?.speakerTalkTitle && (
                  <>
                    <Divider />

                    <div>
                      <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                        Session Name
                      </Text>
                      <Text size="sm" fw={600}>
                        {myProfile.speakerTalkTitle}
                      </Text>
                    </div>

                    {myProfile.speakerTalkAbstract && (
                      <div>
                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                          Abstract
                        </Text>
                        <Spoiler maxHeight={60} showLabel="Show more" hideLabel="Show less">
                          <Text size="sm">
                            {myProfile.speakerTalkAbstract}
                          </Text>
                        </Spoiler>
                      </div>
                    )}

                    <Group gap="lg">
                      {myProfile.speakerTalkFormat && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Format
                          </Text>
                          <Text size="sm">
                            {talkFormatLabels[myProfile.speakerTalkFormat] ?? myProfile.speakerTalkFormat}
                          </Text>
                        </div>
                      )}
                      {myProfile.speakerTalkDuration && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Duration
                          </Text>
                          <Text size="sm">
                            {myProfile.speakerTalkDuration} min
                          </Text>
                        </div>
                      )}
                      {myProfile.speakerTalkTopic && (
                        <div>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                            Topic
                          </Text>
                          <Text size="sm">
                            {myProfile.speakerTalkTopic}
                          </Text>
                        </div>
                      )}
                    </Group>
                  </>
                )}

                {speakerApplication.venues && speakerApplication.venues.length > 0 && (
                  <div>
                    <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                      Selected Floors
                    </Text>
                    <Group gap="xs" mt={4}>
                      {speakerApplication.venues.map((av) => (
                        <Badge key={av.venue.id} variant="outline" size="sm">
                          {av.venue.name}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                )}

                {speakerApplication.submittedAt && (
                  <Text size="xs" c="dimmed">
                    Submitted on{" "}
                    {new Date(speakerApplication.submittedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                )}

                {/* Expandable additional details */}
                {myProfile && (
                  <>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={toggleDetails}
                      rightSection={detailsOpened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                      style={{ alignSelf: "flex-start" }}
                    >
                      {detailsOpened ? "Hide details" : "View full application"}
                    </Button>

                    <Collapse in={detailsOpened}>
                      <Stack gap="sm" pt="xs">
                        <Divider label="Speaker Profile" labelPosition="left" />

                        {myProfile.bio && (
                          <div>
                            <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                              Bio
                            </Text>
                            <Text size="sm">{myProfile.bio}</Text>
                          </div>
                        )}

                        {(myProfile.jobTitle ?? myProfile.company) && (
                          <Group gap="lg">
                            {myProfile.jobTitle && (
                              <div>
                                <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                                  Job Title
                                </Text>
                                <Group gap={4}>
                                  <IconBriefcase size={14} color="var(--mantine-color-dimmed)" />
                                  <Text size="sm">{myProfile.jobTitle}</Text>
                                </Group>
                              </div>
                            )}
                            {myProfile.company && (
                              <div>
                                <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                                  Organization
                                </Text>
                                <Text size="sm">{myProfile.company}</Text>
                              </div>
                            )}
                          </Group>
                        )}

                        {myProfile.speakerPreviousExperience && (
                          <div>
                            <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                              Previous Speaking Experience
                            </Text>
                            <Text size="sm">{myProfile.speakerPreviousExperience}</Text>
                          </div>
                        )}

                        {(myProfile.website ?? myProfile.linkedinUrl ?? myProfile.twitterUrl ?? myProfile.speakerPastTalkUrl) && (
                          <div>
                            <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>
                              Links
                            </Text>
                            <Group gap="md">
                              {myProfile.website && (
                                <Anchor href={myProfile.website} target="_blank" size="sm">
                                  <Group gap={4}>
                                    <IconWorld size={14} />
                                    Website
                                  </Group>
                                </Anchor>
                              )}
                              {myProfile.linkedinUrl && (
                                <Anchor href={myProfile.linkedinUrl} target="_blank" size="sm">
                                  <Group gap={4}>
                                    <IconBrandLinkedin size={14} />
                                    LinkedIn
                                  </Group>
                                </Anchor>
                              )}
                              {myProfile.twitterUrl && (
                                <Anchor href={myProfile.twitterUrl} target="_blank" size="sm">
                                  <Group gap={4}>
                                    <IconBrandX size={14} />
                                    Twitter / X
                                  </Group>
                                </Anchor>
                              )}
                              {myProfile.speakerPastTalkUrl && (
                                <Anchor href={myProfile.speakerPastTalkUrl} target="_blank" size="sm">
                                  <Group gap={4}>
                                    <IconVideo size={14} />
                                    Past Talk
                                  </Group>
                                </Anchor>
                              )}
                            </Group>
                          </div>
                        )}
                      </Stack>
                    </Collapse>
                  </>
                )}

                {speakerApplication.status === "DRAFT" && (
                  <Group>
                    <Button
                      component={Link}
                      href={`/events/${eventSlug}/apply`}
                      variant="light"
                      color="teal"
                      size="sm"
                    >
                      Continue Application
                    </Button>
                  </Group>
                )}
              </Stack>
            )}
          </Stack>
        </Card>
        )}

        {/* What Happens Next */}
        {hasSpeakerApplication && speakerApplication && applicationStatus !== "CANCELLED" && (
          <Card withBorder>
            <Stack gap="md">
              <Group gap="xs">
                <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
                <Title order={4}>What Happens Next</Title>
              </Group>

              <Text size="sm" c="dimmed">
                {getNextStepsGuidance(applicationStatus)}
              </Text>

              <Timeline
                active={getTimelineActiveStep(applicationStatus)}
                bulletSize={28}
                lineWidth={2}
                color={isDecisionMade ? getStatusColor(applicationStatus) : "blue"}
              >
                <Timeline.Item
                  bullet={
                    <ThemeIcon
                      size={28}
                      variant={applicationStatus !== "DRAFT" ? "filled" : "light"}
                      color={applicationStatus !== "DRAFT" ? "teal" : "gray"}
                      radius="xl"
                    >
                      <IconSend size={14} />
                    </ThemeIcon>
                  }
                  title={<Text size="sm" fw={500}>Application Submitted</Text>}
                >
                  <Text size="xs" c="dimmed">
                    {speakerApplication.submittedAt
                      ? `Submitted on ${new Date(speakerApplication.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : "Submit your application to begin the review process"}
                  </Text>
                </Timeline.Item>

                <Timeline.Item
                  bullet={
                    <ThemeIcon
                      size={28}
                      variant={["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"].includes(applicationStatus) ? "filled" : "light"}
                      color={["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"].includes(applicationStatus) ? "blue" : "gray"}
                      radius="xl"
                    >
                      <IconSearch size={14} />
                    </ThemeIcon>
                  }
                  title={<Text size="sm" fw={500}>Under Review</Text>}
                >
                  <Text size="xs" c="dimmed">
                    Our selection committee reviews all applications
                  </Text>
                </Timeline.Item>

                <Timeline.Item
                  bullet={
                    <ThemeIcon
                      size={28}
                      variant={isDecisionMade ? "filled" : "light"}
                      color={isDecisionMade ? getStatusColor(applicationStatus) : "gray"}
                      radius="xl"
                    >
                      {isDecisionMade ? <IconCheck size={14} /> : <IconCircleDashed size={14} />}
                    </ThemeIcon>
                  }
                  title={<Text size="sm" fw={500}>Decision Made</Text>}
                >
                  <Text size="xs" c="dimmed">
                    {isDecisionMade
                      ? `Your application status: ${applicationStatus.replace("_", " ").toLowerCase()}`
                      : "You\u2019ll be notified by email once a decision is made"}
                  </Text>
                </Timeline.Item>

                <Timeline.Item
                  bullet={
                    <ThemeIcon
                      size={28}
                      variant={applicationStatus === "ACCEPTED" && isSpeaker ? "filled" : "light"}
                      color={applicationStatus === "ACCEPTED" ? "green" : "gray"}
                      radius="xl"
                    >
                      <IconCalendar size={14} />
                    </ThemeIcon>
                  }
                  title={<Text size="sm" fw={500}>Event Preparation</Text>}
                >
                  <Text size="xs" c="dimmed">
                    {applicationStatus === "ACCEPTED"
                      ? "Prepare your materials and check your session schedule"
                      : "Accepted speakers prepare their presentations"}
                  </Text>
                </Timeline.Item>
              </Timeline>

              {applicationStatus === "ACCEPTED" && (
                <Group>
                  <Button
                    component={Link}
                    href={`/events/${eventSlug}/schedule${mySessions && mySessions.length > 0 ? "?my=true" : ""}`}
                    variant="light"
                    size="sm"
                    leftSection={<IconCalendar size={16} />}
                  >
                    View Schedule
                  </Button>
                </Group>
              )}
            </Stack>
          </Card>
        )}

        {/* Speaker: My Sessions */}
        {(isSpeaker || hasSpeakerApplication || (mySessions && mySessions.length > 0)) && (
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>My Speaking Sessions</Title>
                {mySessions && mySessions.length > 0 && (
                  <Badge variant="light">{mySessions.length} session{mySessions.length !== 1 ? "s" : ""}</Badge>
                )}
              </Group>

              {sessionsLoading ? (
                <Center py="md">
                  <Loader size="sm" />
                </Center>
              ) : !mySessions || mySessions.length === 0 ? (
                <Text c="dimmed" size="sm">
                  {hasSpeakerApplication && !isSpeaker
                    ? "Your sessions will appear here once organizers finalize the schedule."
                    : "No sessions linked to your account yet. Floor leads will assign you to sessions."}
                </Text>
              ) : (
                <Stack gap="xs">
                  {mySessions.map((session) => {
                    const startTime = new Date(session.startTime);
                    const endTime = new Date(session.endTime);
                    const dateStr = startTime.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    });
                    const timeStr = `${startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} – ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`;

                    return (
                      <Card
                        key={session.id}
                        withBorder
                        p="sm"
                        radius="sm"
                        component={Link}
                        href={`/events/${eventSlug}/schedule/${session.id}`}
                        style={{ textDecoration: "none", cursor: "pointer" }}
                      >
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Group gap="xs">
                              <Text fw={600} size="sm">{session.title}</Text>
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
                            </Group>
                            <Group gap="md">
                              <Text size="xs" c="dimmed">
                                <IconCalendar size={12} style={{ verticalAlign: "middle" }} /> {dateStr}
                              </Text>
                              <Text size="xs" c="dimmed">
                                <IconClock size={12} style={{ verticalAlign: "middle" }} /> {timeStr}
                              </Text>
                              {session.venue && (
                                <Text size="xs" c="dimmed">
                                  <IconMapPin size={12} style={{ verticalAlign: "middle" }} /> {session.venue.name}
                                </Text>
                              )}
                            </Group>
                            {session.sessionSpeakers.length > 1 && (
                              <Text size="xs" c="dimmed">
                                Participants: {session.sessionSpeakers
                                  .map((s) =>
                                    s.role !== "Speaker"
                                      ? `${getDisplayName(s.user, "Unknown")} (${s.role})`
                                      : getDisplayName(s.user, "Unknown"),
                                  )
                                  .join(", ")}
                              </Text>
                            )}
                          </Stack>
                          <IconEdit size={16} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0, marginTop: 2 }} />
                        </Group>
                      </Card>
                    );
                  })}
                  <Group justify="flex-end" mt="xs">
                    <Button
                      component={Link}
                      href={`/events/${eventSlug}/schedule?my=true`}
                      variant="subtle"
                      size="xs"
                      rightSection={<IconCalendar size={14} />}
                    >
                      View in full schedule
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        {/* Floor Lead: Manage Floors */}
        {(isFloorOwner || isAdmin) && (
          <Card withBorder>
            <Stack gap="sm">
              <Title order={4}>Manage Floors</Title>
              <Text size="sm" c="dimmed">
                Create and manage sessions for your assigned floors.
              </Text>
              <Group>
                <Button
                  component={Link}
                  href={`/events/${eventSlug}/manage-schedule`}
                  leftSection={<IconSettings size={16} />}
                  variant="light"
                >
                  Manage Floors
                </Button>
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  variant="light"
                  color="teal"
                  onClick={openAddSpeaker}
                >
                  Add Speaker
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        <AddSpeakerModal
          eventId={eventId}
          opened={addSpeakerOpened}
          onClose={closeAddSpeaker}
        />

        {/* Everyone: Event Schedule */}
        <Card withBorder>
          <Stack gap="sm">
            <Title order={4}>Event Schedule</Title>
            <Text size="sm" c="dimmed">
              View the full conference schedule with all sessions and speakers.
            </Text>
            <Group>
              <Button
                component={Link}
                href={`/events/${eventSlug}/schedule`}
                leftSection={<IconCalendar size={16} />}
                variant="light"
              >
                View Schedule
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Deliberation - show if active deliberation exists */}
        <DeliberationCard eventId={eventId} eventSlug={eventSlug} />

        {/* Submit Speaker Application - show for floor leads who aren't speakers yet */}
        {!hasSpeakerApplication && !isSpeaker && (
          <Card withBorder>
            <Stack gap="sm">
              <Title order={4}>Become a Speaker</Title>
              <Text size="sm" c="dimmed">
                Interested in speaking at this event? Submit a speaker application to be considered.
              </Text>
              <Group>
                <Button
                  component={Link}
                  href={`/events/${eventSlug}/apply`}
                  leftSection={<IconMicrophone size={16} />}
                  variant="light"
                  color="teal"
                >
                  Submit Speaker Application
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
