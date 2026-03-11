"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import EventDetailClient from "./EventDetailClient";
import ResidentDashboard from "./ResidentDashboard";
import ConferenceDashboard from "./ConferenceDashboard";
import ApplicationClosedMessage from "~/app/_components/ApplicationClosedMessage";
import EventHero from "./EventHero";
import {
  Text,
  Container,
  Stack,
  Group,
  Button,
  ActionIcon,
  Card,
  Title,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconMicrophone,
  IconCalendarEvent,
  IconMapPin,
  IconClipboardList,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { normalizeEventType } from "~/types/event";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventPage({ params }: EventPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [hasLatePassAccess, setHasLatePassAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [defaultTab, setDefaultTab] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Handle tab query parameter for redirects
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setDefaultTab(tab);
      // Clean URL by removing query parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  // Late pass access logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsCheckingAccess(true);

    const latePassParam = searchParams.get("latePass");
    const invitationParam = searchParams.get("invitation");

    // Helper function to check for cookies
    const getCookie = (name: string) => {
      return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
    };

    const hasLatePassCookie = !!getCookie("ftc-late-pass");
    const hasInvitationCookie = !!getCookie("ftc-invitation-access");

    // Handle latePass parameter
    if (latePassParam) {
      console.log("🔑 Processing latePass parameter:", latePassParam);

      // Set cookie for 24 hours
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
      document.cookie = `ftc-late-pass=${latePassParam}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

      setHasLatePassAccess(true);
      setIsCheckingAccess(false);

      // Clean URL after state updates
      setTimeout(() => {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
      }, 100);

      return;
    }

    // Handle invitation parameter
    if (invitationParam) {
      console.log("📧 Processing invitation parameter:", invitationParam);

      // Set a temporary cookie for 1 hour
      const expires = new Date();
      expires.setTime(expires.getTime() + 60 * 60 * 1000);
      document.cookie = `ftc-invitation-access=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

      setHasLatePassAccess(true);
      setIsCheckingAccess(false);

      // Clean URL after state updates
      setTimeout(() => {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
      }, 100);

      return;
    }

    // Check existing cookies
    if (hasLatePassCookie || hasInvitationCookie) {
      setHasLatePassAccess(true);
    } else {
      setHasLatePassAccess(false);
    }

    setIsCheckingAccess(false);
  }, [searchParams, router]);

  // Fetch event details using tRPC (now works for both auth and unauth users)
  // Note: eventId from URL may be a slug, so getEvent handles slug fallback
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  // Use the resolved event UUID for all subsequent queries (URL param may be a slug)
  const resolvedEventId = event?.id ?? "";

  // Get user application (only for authenticated users)
  const { data: userApplication, isLoading: isApplicationLoading } =
    api.application.getApplication.useQuery(
      { eventId: resolvedEventId },
      { enabled: !!resolvedEventId && !!session?.user },
    );

  // Get speaker-specific application (separate query to reliably detect speaker applicants)
  const { data: speakerApplication, isLoading: isSpeakerAppLoading } =
    api.application.getApplication.useQuery(
      { eventId: resolvedEventId, applicationType: "SPEAKER" },
      { enabled: !!resolvedEventId && !!session?.user },
    );

  // Check if user is a mentor for this event (bypass latePass requirement)
  const { data: isMentor, isLoading: isMentorLoading } =
    api.event.checkMentorRole.useQuery(
      { eventId: resolvedEventId },
      { enabled: !!session?.user && !!resolvedEventId },
    );

  // Check if user is a speaker for this event
  const { data: isSpeaker, isLoading: isSpeakerLoading } =
    api.event.checkSpeakerRole.useQuery(
      { eventId: resolvedEventId },
      { enabled: !!session?.user && !!resolvedEventId },
    );

  // Check if user is a floor lead for this event
  const { data: isFloorOwner, isLoading: isFloorOwnerLoading } =
    api.schedule.isFloorOwner.useQuery(
      { eventId: resolvedEventId },
      { enabled: !!session?.user && !!resolvedEventId },
    );

  const isConference = normalizeEventType(event?.type) === "CONFERENCE";

  // Show loading while event data or access checks are in progress
  const isLoadingAccess =
    status === "loading" ||
    eventLoading ||
    isCheckingAccess ||
    isMentorLoading ||
    isSpeakerLoading ||
    isFloorOwnerLoading ||
    isApplicationLoading ||
    isSpeakerAppLoading;

  if (isLoadingAccess) {
    return <div>Loading...</div>;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  // Require authentication
  if (!session?.user) {
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const callbackUrl = encodeURIComponent(currentUrl);
    router.push(`/signin?callbackUrl=${callbackUrl}`);
    return <div>Redirecting to sign in...</div>;
  }

  // Check if user is accepted for this specific event
  const isAcceptedForThisEvent = userApplication?.status === "ACCEPTED";
  const isAdmin =
    session.user.role === "admin" || session.user.role === "staff";
  const hasSpeakerApplication = !!speakerApplication;

  // Determine if user can view this page
  const canViewPage =
    isAcceptedForThisEvent ||
    isAdmin ||
    hasLatePassAccess ||
    !!isMentor ||
    !!isSpeaker ||
    !!isFloorOwner ||
    hasSpeakerApplication;

  // Check if applications are closed (no late pass, no admin/mentor/speaker privileges)
  const applicationsAreClosed =
    !hasLatePassAccess && !isAdmin && !isMentor && !isSpeaker && !isFloorOwner;

  // Deny access if user doesn't meet requirements (only after all checks complete)
  if (!canViewPage) {
    // For conferences, show a welcoming page with "Become a Speaker" CTA
    if (isConference) {
      return (
        <Container size="md" py="xl">
          <Stack gap="lg">
            {eventId === "intelligence-at-the-frontier" ||
            eventId === "cmlffsmqo0001l40444y16ojk" ? (
              <EventHero
                eventName={event.name}
                startDate={event.startDate ?? undefined}
                endDate={event.endDate ?? undefined}
              />
            ) : (
              <Stack gap="sm">
                <Title order={2}>Welcome to {event.name}</Title>
                {(event.location ?? event.startDate) && (
                  <Group gap="md">
                    {event.location && (
                      <Group gap={4}>
                        <IconMapPin
                          size={14}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text size="xs" c="dimmed">
                          {event.location}
                        </Text>
                      </Group>
                    )}
                    {event.startDate && (
                      <Group gap={4}>
                        <IconCalendarEvent
                          size={14}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text size="xs" c="dimmed">
                          {new Date(event.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            },
                          )}
                          {event.endDate && (
                            <>
                              {" \u2013 "}
                              {new Date(event.endDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                },
                              )}
                            </>
                          )}
                        </Text>
                      </Group>
                    )}
                  </Group>
                )}
                {event.description && (
                  <Text c="dimmed" size="sm" style={{ whiteSpace: "pre-line" }}>
                    {event.description}
                  </Text>
                )}
              </Stack>
            )}

            <Card withBorder p="lg">
              <Group wrap="nowrap" gap="md">
                <ThemeIcon size={48} radius="md" variant="light" color="teal">
                  <IconMicrophone size={24} />
                </ThemeIcon>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Title order={4}>Become a Speaker</Title>
                  <Text size="sm" c="dimmed">
                    Interested in speaking at this event? Submit a speaker
                    application to share your expertise with the community.
                  </Text>
                </Stack>
              </Group>
              <Group mt="md">
                <Button
                  component={Link}
                  href={`/events/${eventId}/apply`}
                  leftSection={<IconMicrophone size={16} />}
                  variant="filled"
                  color="teal"
                >
                  Submit Speaker Application
                </Button>
              </Group>
            </Card>

            <Group grow>
              <Card withBorder p="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconCalendarEvent
                      size={18}
                      color="var(--mantine-color-blue-6)"
                    />
                    <Text fw={500} size="sm">
                      Schedule
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Browse the conference schedule and discover sessions.
                  </Text>
                  <Button
                    component={Link}
                    href={`/events/${eventId}/schedule`}
                    variant="light"
                    size="xs"
                    leftSection={<IconCalendarEvent size={14} />}
                  >
                    View Schedule
                  </Button>
                </Stack>
              </Card>
              <Card withBorder p="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconClipboardList
                      size={18}
                      color="var(--mantine-color-violet-6)"
                    />
                    <Text fw={500} size="sm">
                      Apply
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Start or continue your speaker application.
                  </Text>
                  <Button
                    component={Link}
                    href={`/events/${eventId}/apply`}
                    variant="light"
                    color="violet"
                    size="xs"
                    leftSection={<IconClipboardList size={14} />}
                  >
                    Go to Application
                  </Button>
                </Stack>
              </Card>
            </Group>
          </Stack>
        </Container>
      );
    }

    // Non-conference events: friendly card instead of orange alert
    return (
      <Container size="md" py="xl">
        <Stack gap="lg" align="center">
          <Card withBorder p="lg" style={{ maxWidth: 500, width: "100%" }}>
            <Stack gap="md" align="center">
              <Title order={3} ta="center">
                Welcome to {event.name}
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                This event requires an accepted application to access the full
                dashboard. If you have a late pass code, please use the link
                provided to you.
              </Text>
              <Divider w="100%" />
              <Group>
                <Button
                  component={Link}
                  href="/events"
                  variant="light"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  Browse Events
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Container>
    );
  }

  // Show conference dashboard for conference events
  if (
    isConference &&
    (isAdmin || !!isSpeaker || !!isFloorOwner || hasSpeakerApplication)
  ) {
    return (
      <ConferenceDashboard
        eventId={resolvedEventId}
        eventSlug={eventId}
        eventName={event.name}
        isSpeaker={!!isSpeaker}
        isFloorOwner={!!isFloorOwner}
        isAdmin={isAdmin}
        hasSpeakerApplication={hasSpeakerApplication}
      />
    );
  }

  // Show resident dashboard for accepted users, admins, mentors, and speakers
  if (isAcceptedForThisEvent || isAdmin || isMentor || isSpeaker) {
    return (
      <ResidentDashboard
        eventId={resolvedEventId}
        eventName={event.name}
        featureDeliberation={event.featureDeliberation ?? false}
        userApplication={userApplication ?? null}
      />
    );
  }

  // Show application closed message if applications are closed
  if (applicationsAreClosed) {
    return <ApplicationClosedMessage event={event} />;
  }

  // Show application flow for non-accepted users
  return (
    <>
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Back Button */}
          <Group gap="xs">
            <Link href="/events" style={{ textDecoration: "none" }}>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
              >
                Back to Events
              </Button>
            </Link>

            {/* Language Toggle */}
            <Group gap="xs" ml="auto">
              <ActionIcon
                variant={language === "en" ? "filled" : "outline"}
                onClick={() => setLanguage("en")}
                size="sm"
              >
                EN
              </ActionIcon>
              <ActionIcon
                variant={language === "es" ? "filled" : "outline"}
                onClick={() => setLanguage("es")}
                size="sm"
              >
                ES
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      </Container>

      <EventDetailClient
        event={event}
        userApplication={userApplication ?? null}
        userId={session?.user?.id ?? ""}
        defaultTab={defaultTab ?? undefined}
        language={language}
        hasLatePassAccess={hasLatePassAccess}
      />
    </>
  );
}
