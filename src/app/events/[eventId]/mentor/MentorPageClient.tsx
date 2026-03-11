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
import MentorApplicationForm from "~/app/_components/MentorApplicationForm";
import type {
  Event,
  Application,
  ApplicationResponse,
  ApplicationQuestion,
} from "@prisma/client";

interface ExtendedApplication extends Application {
  responses?: Array<ApplicationResponse & { question: ApplicationQuestion }>;
}

interface ExtendedEvent extends Event {
  applications: ExtendedApplication[];
}

interface MentorPageClientProps {
  event: ExtendedEvent;
  initialUserApplication?: ExtendedApplication | null;
  initialUserId?: string;
  invitationToken?: string;
}

export default function MentorPageClient({
  event,
  initialUserApplication: _initialUserApplication,
  initialUserId,
  invitationToken,
}: MentorPageClientProps) {
  console.log(
    "🎫 [MentorPageClient] Received invitation token:",
    invitationToken,
  );

  const { data: session, status } = useSession();
  const [showApplication, setShowApplication] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // Handle authentication state changes
  useEffect(() => {
    if (status === "authenticated" && !showApplication) {
      if (!initialUserId) {
        // User just authenticated
        setJustAuthenticated(true);
        setTimeout(() => {
          setShowApplication(true);
          setJustAuthenticated(false);
        }, 1500);
      } else {
        // User was already authenticated
        setShowApplication(true);
      }
    } else if (status === "unauthenticated") {
      setShowApplication(false);
      setJustAuthenticated(false);
    }
  }, [status, initialUserId, showApplication]);

  // Loading state
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

  // Success animation after authentication
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
                    Redirecting to your mentor onboarding form...
                  </Text>
                </Stack>
              </Card>
            )}
          </Transition>
        </Center>
      </Container>
    );
  }

  // Show auth form for unauthenticated users
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
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
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
                        Onboard
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
                      Welcome to the FtC RealFi Residency
                    </Text>
                    <Text size="lg" fw={500} ta="center" c="emerald">
                      Mentor Onboarding
                    </Text>
                    <Text c="dimmed" ta="center">
                      Thank you for joining as a mentor! Please sign in to
                      complete your onboarding form and help us coordinate your
                      participation in Buenos Aires.
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      <strong>Dates:</strong> October 24 – November 14, 2025
                      <br />
                      <strong>Location:</strong> Buenos Aires, Argentina
                    </Text>
                  </Stack>
                </Card>

                {/* Auth Form */}
                <AuthForm callbackUrl="/events/funding-commons-residency-2025/mentor" />
              </Stack>
            </div>
          )}
        </Transition>
      </Container>
    );
  }

  // Show the form for authenticated users
  return (
    <Transition
      mounted={showApplication}
      transition="fade"
      duration={300}
      timingFunction="ease"
    >
      {(styles) => (
        <div style={styles}>
          <MentorApplicationForm
            eventId={event.id}
            eventName={event.name}
            invitationToken={invitationToken}
          />
        </div>
      )}
    </Transition>
  );
}
