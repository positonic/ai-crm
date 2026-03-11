"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Container,
  Center,
  Loader,
  Text,
  Stack,
  Card,
  Group,
  Transition,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import AuthForm from "~/app/_components/AuthForm";
import SpeakerApplicationForm from "./SpeakerApplicationForm";
import type {
  Event,
  Application,
  ApplicationResponse,
  ApplicationQuestion,
  ApplicationVenue,
} from "@prisma/client";

interface ExtendedApplication extends Application {
  responses?: Array<ApplicationResponse & { question: ApplicationQuestion }>;
  venues?: ApplicationVenue[];
}

interface ExtendedEvent extends Event {
  applications: ExtendedApplication[];
}

interface SpeakerPageClientProps {
  event: ExtendedEvent;
  initialUserApplication?: ExtendedApplication | null;
  initialUserId?: string;
  invitationToken?: string;
  invitationData?: { email: string; firstName?: string };
}

export default function SpeakerPageClient({
  event,
  initialUserApplication,
  initialUserId,
  invitationToken,
  invitationData,
}: SpeakerPageClientProps) {
  const { data: session, status } = useSession();
  const [showApplication, setShowApplication] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (status === "authenticated" && !showApplication) {
      if (!initialUserId) {
        setJustAuthenticated(true);
        timeoutId = setTimeout(() => {
          setShowApplication(true);
          setJustAuthenticated(false);
        }, 1500);
      } else {
        setShowApplication(true);
      }
    } else if (status === "unauthenticated") {
      setShowApplication(false);
      setJustAuthenticated(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, initialUserId]);

  if (status === "loading") {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (justAuthenticated) {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Transition
            mounted={justAuthenticated}
            transition="scale"
            duration={400}
            timingFunction="ease"
          >
            {(styles) => (
              <Card style={styles} p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-4">
                    <IconCheck size={32} color="white" />
                  </div>
                  <Text size="lg" fw={600}>
                    Authentication Successful!
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {event.type === "EIR"
                      ? "Redirecting to your EIR application..."
                      : "Redirecting to your speaker application..."}
                  </Text>
                </Stack>
              </Card>
            )}
          </Transition>
        </Center>
      </Container>
    );
  }

  if (!session?.user || !showApplication) {
    return (
      <Container size="sm" py="xl">
        <Transition
          mounted={!showApplication}
          transition="fade"
          duration={300}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
              <Stack gap="xl">
                {/* Progress Indicator */}
                <Card p="md" radius="md" withBorder>
                  <Group justify="center" gap="lg">
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                        <Text size="xs" c="white" fw={600}>
                          1
                        </Text>
                      </div>
                      <Text size="sm" fw={500}>
                        Sign In
                      </Text>
                    </Group>
                    <div className="w-8 h-0.5 bg-gray-200" />
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Text size="xs" c="dimmed" fw={600}>
                          2
                        </Text>
                      </div>
                      <Text size="sm" c="dimmed">
                        Apply
                      </Text>
                    </Group>
                    <div className="w-8 h-0.5 bg-gray-200" />
                    <Group gap="xs">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Text size="xs" c="dimmed" fw={600}>
                          3
                        </Text>
                      </div>
                      <Text size="sm" c="dimmed">
                        Submit
                      </Text>
                    </Group>
                  </Group>
                </Card>

                {/* Welcome Message */}
                <Card p="xl" radius="md" withBorder>
                  <Stack gap="md" align="center">
                    <Text size="xl" fw={600} ta="center">
                      {event.name}
                    </Text>
                    <Text size="lg" fw={500} ta="center" c="teal">
                      {event.type === "EIR"
                        ? "EIR Application"
                        : "Speaker Application"}
                    </Text>
                    <Text c="dimmed" ta="center">
                      {event.type === "EIR"
                        ? "Thank you for your interest in the EIR program! Please sign in to submit your application."
                        : "Thank you for your interest in speaking at this event! Please sign in to submit your speaker application."}
                    </Text>
                    {event.startDate && event.location && (
                      <Text size="sm" c="dimmed" ta="center">
                        <strong>Date:</strong>{" "}
                        {new Date(event.startDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                        {event.endDate && (
                          <>
                            {" "}
                            &ndash;{" "}
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
                        <br />
                        <strong>Location:</strong> {event.location}
                      </Text>
                    )}
                  </Stack>
                </Card>

                {/* Auth Form */}
                <AuthForm
                  callbackUrl={`/events/${event.slug ?? event.id}/apply${invitationToken ? `?invitation=${invitationToken}` : ""}`}
                  initialValues={invitationData}
                />
              </Stack>
            </div>
          )}
        </Transition>
      </Container>
    );
  }

  return (
    <Transition
      mounted={showApplication}
      transition="fade"
      duration={300}
      timingFunction="ease"
    >
      {(styles) => (
        <div style={styles}>
          <SpeakerApplicationForm
            eventId={event.id}
            eventName={event.name}
            eventType={event.type}
            invitationToken={invitationToken}
            existingApplicationStatus={initialUserApplication?.status}
            existingVenueIds={initialUserApplication?.venues?.map(
              (v) => v.venueId,
            )}
            existingResponses={initialUserApplication?.responses?.map((r) => ({
              id: r.id,
              answer: r.answer,
              question: {
                id: r.question.id,
                questionKey: r.question.questionKey,
              },
            }))}
          />
        </div>
      )}
    </Transition>
  );
}
