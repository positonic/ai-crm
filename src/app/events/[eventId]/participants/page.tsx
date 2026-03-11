"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  ActionIcon,
  Alert,
  Button,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconMapPin,
  IconBrandGithub,
  IconBrandLinkedin,
  IconWorld,
  IconAlertCircle,
  IconEdit,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { getDisplayName } from "~/utils/userDisplay";
import { UserAvatar } from "~/app/_components/UserAvatar";

interface ParticipantsPageProps {
  params: Promise<{ eventId: string }>;
}

// Helper function for social icons
function getSocialIcon(url: string, type: "github" | "linkedin" | "website") {
  const icons = {
    github: IconBrandGithub,
    linkedin: IconBrandLinkedin,
    website: IconWorld,
  };
  const Icon = icons[type];
  return (
    <ActionIcon
      variant="light"
      size="sm"
      color="blue"
      onClick={() => window.open(url, "_blank")}
    >
      <Icon size={16} />
    </ActionIcon>
  );
}

export default function ParticipantsPage({ params }: ParticipantsPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const { data: session, status } = useSession();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  // Get accepted residents
  const { data: residentsData, isLoading: residentsLoading } =
    api.application.getAcceptedResidents.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  if (status === "loading" || eventLoading || residentsLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container size="lg" py="xl">
        <Title order={1}>Event Not Found</Title>
        <Text c="dimmed">
          The event you&apos;re looking for doesn&apos;t exist.
        </Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} mb="xs">
            Event Participants
          </Title>
          <Text c="dimmed">
            Meet the accepted participants joining this event.
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              All Participants
            </Text>
            <Group gap="xs">
              <Badge variant="light" size="lg">
                {residentsData?.visibleResidents ?? 0} visible
              </Badge>
              {residentsData && residentsData.hiddenCount > 0 && (
                <Badge variant="outline" color="gray" size="lg">
                  {residentsData.hiddenCount} private
                </Badge>
              )}
              {session && (
                <Button
                  component={Link}
                  href={`/profile/edit?from-event=${eventId}`}
                  size="xs"
                  variant="light"
                  leftSection={<IconEdit size={14} />}
                >
                  Edit My Profile
                </Button>
              )}
            </Group>
          </Group>

          {residentsData && residentsData.hiddenCount > 0 && (
            <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
              <Text size="sm">
                <strong>{residentsData.hiddenCount} participants</strong>{" "}
                haven&apos;t completed their profiles yet. Complete your profile
                to help build our participant community!
              </Text>
            </Alert>
          )}

          {residentsData?.residents && residentsData.residents.length > 0 ? (
            <Grid>
              {residentsData.residents.map((resident) => (
                <Grid.Col
                  key={resident.user?.id}
                  span={{ base: 12, sm: 6, lg: 4 }}
                >
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    h="100%"
                    component={Link}
                    href={`/profiles/${resident.user?.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card.Section p="lg" pb="xs">
                      <Group gap="sm">
                        <UserAvatar
                          user={{
                            customAvatarUrl: resident.user?.profile?.avatarUrl,
                            oauthImageUrl: resident.user?.image,
                            name: resident.user?.name,
                            firstName: resident.user?.firstName,
                            surname: resident.user?.surname,
                          }}
                          size="lg"
                          radius="md"
                        />
                        <div style={{ flex: 1 }}>
                          <Text fw={600} size="lg" lineClamp={1}>
                            {getDisplayName(resident.user, "Anonymous")}
                          </Text>
                          {resident.user?.profile?.jobTitle && (
                            <Text size="sm" c="dimmed" lineClamp={1}>
                              {resident.user?.profile?.jobTitle}
                              {resident.user?.profile?.company &&
                                ` at ${resident.user?.profile?.company}`}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Card.Section>

                    <Card.Section px="lg" pb="xs">
                      {resident.user?.profile?.location && (
                        <Group gap={4} mb="xs">
                          <IconMapPin size={14} />
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {resident.user?.profile?.location}
                          </Text>
                        </Group>
                      )}

                      {resident.user?.profile?.bio && (
                        <Text size="sm" lineClamp={3} mb="xs">
                          {resident.user?.profile?.bio}
                        </Text>
                      )}

                      {resident.user?.profile?.skills &&
                        resident.user?.profile?.skills.length > 0 && (
                          <Group gap={4} mb="xs">
                            {resident.user?.profile?.skills
                              .slice(0, 3)
                              .map((skill) => (
                                <Badge key={skill} size="xs" variant="light">
                                  {skill}
                                </Badge>
                              ))}
                            {resident.user?.profile?.skills.length > 3 && (
                              <Badge size="xs" variant="outline" color="gray">
                                +{resident.user?.profile?.skills.length - 3}
                              </Badge>
                            )}
                          </Group>
                        )}
                    </Card.Section>

                    <Card.Section px="lg" pb="lg">
                      <Group justify="flex-end" align="flex-end" h={40}>
                        <Group gap={4}>
                          {resident.user?.profile?.githubUrl &&
                            getSocialIcon(
                              resident.user?.profile?.githubUrl,
                              "github",
                            )}
                          {resident.user?.profile?.linkedinUrl &&
                            getSocialIcon(
                              resident.user?.profile?.linkedinUrl,
                              "linkedin",
                            )}
                          {resident.user?.profile?.website &&
                            getSocialIcon(
                              resident.user?.profile?.website,
                              "website",
                            )}
                        </Group>
                      </Group>
                    </Card.Section>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Stack align="center" gap="md" py="xl">
              <Text ta="center" c="dimmed">
                No visible participants yet
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                Be the first to complete your profile and appear in the
                directory!
              </Text>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
