"use client";

import { useSession } from "next-auth/react";
import { type Session } from "next-auth";
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  Alert,
  Avatar,
  ActionIcon,
  Tooltip,
  Tabs,
  Progress,
} from "@mantine/core";
import {
  IconUser,
  IconUsers,
  IconBulb,
  IconAlertCircle,
  IconExternalLink,
  IconBrandGithub,
  IconEdit,
  IconMapPin,
  IconBriefcase,
  IconClock,
  IconHeart,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
  IconHandStop,
  IconTarget,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { AsksAndOffers } from "./AsksAndOffers";
import { AsksOffersTab } from "./AsksOffersTab";
import { ProjectManager } from "~/app/_components/ProjectManager";

interface ResidentDashboardProps {
  eventId: string;
  eventName: string;
  userApplication: {
    status: string;
  } | null;
}

export default function ResidentDashboard({
  eventId,
  eventName,
  userApplication: _userApplication,
}: ResidentDashboardProps) {
  const { data: session } = useSession();

  // Get profile completion data
  const { data: profileCompletion } = api.profile.getProfileCompletion.useQuery();

  // Get current user's projects - we'll need to refetch this when projects change
  const { data: userProfile, refetch: refetchUserProfile } = api.profile.getMyProfile.useQuery();

  // Get accepted residents
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery({
    eventId,
  });

  // Get resident projects
  const { data: residentProjects } = api.application.getResidentProjects.useQuery({
    eventId,
  });

  // Check for active deliberation
  const { data: deliberation } = api.deliberation.getDeliberation.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  const userProjects = userProfile?.projects ?? [];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="xs">
            Welcome to {eventName}!
          </Title>
          <Text c="dimmed">
            Your resident dashboard - connect, collaborate, and create amazing things together.
          </Text>
        </div>

        <Grid gutter="xl">
          {/* Profile Section - Show completion widget only if profile is under 70% */}
          {!profileCompletion?.meetsThreshold ? (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <IconUser size={20} />
                    <Text fw={600}>Profile Completion</Text>
                  </Group>
                  <Badge
                    color="orange"
                    variant="light"
                  >
                    {profileCompletion?.percentage ?? 0}%
                  </Badge>
                </Group>

                <Progress
                  value={profileCompletion?.percentage ?? 0}
                  color="orange"
                  size="lg"
                  mb="md"
                />

                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                  <Text size="sm">
                    <strong>Other residents will not be able to find you</strong> until you complete your profile 
                    (currently at {profileCompletion?.percentage ?? 0}%). Complete your profile to be visible 
                    in the participant directory.
                  </Text>
                </Alert>

                {profileCompletion && profileCompletion.missingFields.length > 0 && (
                  <Stack gap="xs" mb="md">
                    <Text size="sm" fw={500}>Missing fields:</Text>
                    {profileCompletion.missingFields.slice(0, 3).map((field) => (
                      <Text key={field} size="xs" c="dimmed">
                        • {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Text>
                    ))}
                    {profileCompletion.missingFields.length > 3 && (
                      <Text size="xs" c="dimmed">
                        • And {profileCompletion.missingFields.length - 3} more...
                      </Text>
                    )}
                  </Stack>
                )}

                <Button
                  component={Link}
                  href={`/profile/edit?from-event=${eventId}`}
                  leftSection={<IconEdit size={16} />}
                  variant="filled"
                  fullWidth
                >
                  Complete Profile
                </Button>
              </Card>
            </Grid.Col>
          ) : null}
          {/* <Stack align="center" gap="md">
                  <Group gap="xs">
                    <IconUser size={20} />
                    <Text fw={600}>Profile</Text>
                  </Group>
                  <Button
                    component={Link}
                    href={`/profile/edit?from-event=${eventId}`}
                    leftSection={<IconEdit size={16} />}
                    variant="light"
                  >
                    Edit Profile
                  </Button>
                </Stack> */}

          {/* Your Projects Widget */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ProjectManager
              projects={userProjects}
              onProjectsChange={() => void refetchUserProfile()}
              eventId={eventId}
            />
          </Grid.Col>

          {/* Asks and Offers Widget */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <AsksAndOffers eventId={eventId} session={session} />
          </Grid.Col>

          {/* Participants and Projects Tabs */}
          <Grid.Col span={12}>
            <Tabs defaultValue="participants" variant="outline">
              <Tabs.List grow>
                <Tabs.Tab value="participants" leftSection={<IconUsers size={20} />}>
                  Participants
                </Tabs.Tab>
                <Tabs.Tab value="projects" leftSection={<IconBulb size={20} />}>
                  Projects
                </Tabs.Tab>
                <Tabs.Tab value="asks-offers" leftSection={<IconHandStop size={20} />}>
                  Asks & Offers
                </Tabs.Tab>
                {deliberation && (
                  <Tabs.Tab value="priorities" leftSection={<IconTarget size={20} />}>
                    Priorities
                  </Tabs.Tab>
                )}
              </Tabs.List>

              <Tabs.Panel value="participants" pt="lg">
                <ParticipantsTab
                  residentsData={residentsData}
                  eventId={eventId}
                  session={session}
                />
              </Tabs.Panel>

              <Tabs.Panel value="projects" pt="lg">
                <ProjectsTab
                  residentProjects={residentProjects}
                />
              </Tabs.Panel>

              <Tabs.Panel value="asks-offers" pt="lg">
                <AsksOffersTab
                  eventId={eventId}
                  session={session}
                />
              </Tabs.Panel>

              {deliberation && (
                <Tabs.Panel value="priorities" pt="lg">
                  <Card withBorder p="lg">
                    <Stack gap="md" align="center">
                      <IconTarget size={40} color="var(--mantine-color-grape-6)" />
                      <Title order={4}>{deliberation.title}</Title>
                      <Text size="sm" c="dimmed" ta="center">
                        {deliberation.description ?? "Share what matters most and vote on community priorities."}
                      </Text>
                      <Group gap="xs">
                        <Badge variant="light" color="green" size="sm">
                          {deliberation._count.priorities} priorities
                        </Badge>
                        <Badge variant="light" color="blue" size="sm">
                          {deliberation.totalVotes} votes
                        </Badge>
                      </Group>
                      <Button
                        component={Link}
                        href={`/events/${eventId}/deliberation`}
                        leftSection={<IconTarget size={16} />}
                        variant="light"
                        color="grape"
                      >
                        Open Deliberation
                      </Button>
                    </Stack>
                  </Card>
                </Tabs.Panel>
              )}
            </Tabs>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

// Helper function for social icons
function getSocialIcon(url: string, type: 'github' | 'linkedin' | 'twitter' | 'website') {
  const icons = {
    github: IconBrandGithub,
    linkedin: IconBrandLinkedin,
    twitter: IconBrandTwitter,
    website: IconWorld,
  };
  const Icon = icons[type];
  return (
    <ActionIcon
      variant="light"
      size="sm"
      color="blue"
      onClick={() => window.open(url, '_blank')}
    >
      <Icon size={16} />
    </ActionIcon>
  );
}

interface ParticipantsTabProps {
  residentsData: {
    residents: Array<{
      user?: {
        id: string;
        name: string | null;
        image: string | null;
        email?: string | null;
        profile?: {
          avatarUrl?: string | null;
          jobTitle?: string | null;
          company?: string | null;
          location?: string | null;
          bio?: string | null;
          skills?: string[];
          githubUrl?: string | null;
          linkedinUrl?: string | null;
          twitterUrl?: string | null;
          website?: string | null;
          availableForMentoring?: boolean | null;
          availableForHiring?: boolean | null;
          availableForOfficeHours?: boolean | null;
        } | null;
      } | null;
      completionPercentage: number;
    }>;
    visibleResidents: number;
    hiddenCount: number;
  } | undefined;
  session: Session | null;
  eventId: string;
}
function ParticipantsTab({ residentsData, session, eventId }: ParticipantsTabProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600}>Event Participants</Text>
        </Group>
        <Group gap="xs">
          <Badge variant="light">
            {residentsData?.visibleResidents ?? 0} visible
          </Badge>
          {residentsData && residentsData.hiddenCount > 0 && (
            <Badge variant="outline" color="gray">
              {residentsData.hiddenCount} private
            </Badge>
          )}
          {session && (
            <Button component={Link} href={`/profile/edit?from-event=${eventId}`} size="xs" variant="light" leftSection={<IconEdit size={14} />}>
              Edit My Profile
            </Button>
          )}
        </Group>
      </Group>

      {residentsData && residentsData.hiddenCount > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
          <Text size="sm">
            <strong>{residentsData.hiddenCount} participants</strong> haven&apos;t completed their profiles yet.
            Complete your profile to help build our participant community!
          </Text>
        </Alert>
      )}

      {residentsData?.residents && residentsData.residents.length > 0 ? (
        <Grid>
          {residentsData.residents.map((resident) => (
            <Grid.Col key={resident.user?.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card 
                shadow="sm" 
                padding="lg" 
                radius="md" 
                withBorder 
                h="100%"
                component={Link}
                href={`/profiles/${resident.user?.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card.Section p="lg" pb="xs">
                  <Group gap="sm">
                    <Avatar
                      src={getAvatarUrl({
                        customAvatarUrl: resident.user?.profile?.avatarUrl,
                        oauthImageUrl: resident.user?.image,
                        name: resident.user?.name,
                        email: resident.user?.email,
                      })}
                      size="lg"
                      radius="md"
                    >
                      {getAvatarInitials({
                        name: resident.user?.name,
                        email: resident.user?.email,
                      })}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="lg" lineClamp={1}>
                        {resident.user?.name ?? "Anonymous"}
                      </Text>
                      {resident.user?.profile?.jobTitle && (
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          {resident.user?.profile?.jobTitle}
                          {resident.user?.profile?.company && ` at ${resident.user?.profile?.company}`}
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

                  {resident.user?.profile?.skills && resident.user?.profile?.skills.length > 0 && (
                    <Group gap={4} mb="xs">
                      {resident.user?.profile?.skills.slice(0, 3).map((skill) => (
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
                  <Group justify="space-between" align="flex-end" h={40}>
                    <Group gap={4}>
                      {resident.user?.profile?.availableForMentoring && (
                        <Tooltip label="Available for mentoring">
                          <Badge
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconHeart size={10} />}
                          >
                            Mentor
                          </Badge>
                        </Tooltip>
                      )}
                      {resident.user?.profile?.availableForHiring && (
                        <Tooltip label="Available for hiring">
                          <Badge
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconBriefcase size={10} />}
                          >
                            Hiring
                          </Badge>
                        </Tooltip>
                      )}
                      {resident.user?.profile?.availableForOfficeHours && (
                        <Tooltip label="Office hours available">
                          <Badge
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<IconClock size={10} />}
                          >
                            Office Hours
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>

                    <Group gap={4}>
                      {resident.user?.profile?.githubUrl && getSocialIcon(resident.user?.profile?.githubUrl, 'github')}
                      {resident.user?.profile?.linkedinUrl && getSocialIcon(resident.user?.profile?.linkedinUrl, 'linkedin')}
                      {resident.user?.profile?.twitterUrl && getSocialIcon(resident.user?.profile?.twitterUrl, 'twitter')}
                      {resident.user?.profile?.website && getSocialIcon(resident.user?.profile?.website, 'website')}
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
            Be the first to complete your profile and appear in the directory!
          </Text>
        </Stack>
      )}

      {residentsData && residentsData.visibleResidents > 8 && (
        <Group justify="center" mt="md">
          <Button
            component={Link}
            href="/profiles"
            variant="light"
          >
            View All Participants ({residentsData.visibleResidents})
          </Button>
        </Group>
      )}
    </Card>
  );
}

interface ProjectsTabProps {
  residentProjects: Array<{
    id: string;
    title: string;
    description: string | null;
    technologies: string[];
    liveUrl: string | null;
    githubUrl: string | null;
    profile: {
      avatarUrl?: string | null;
      user?: {
        id: string;
        name: string | null;
        image: string | null;
        email?: string | null;
      } | null;
    };
  }> | undefined;
}

function ProjectsTab({ residentProjects }: ProjectsTabProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600}>Participant Projects</Text>
        </Group>
        <Badge variant="light">
          {residentProjects?.length ?? 0} projects
        </Badge>
      </Group>

      {residentProjects && residentProjects.length > 0 ? (
        <Grid>
          {residentProjects.map((project) => (
            <Grid.Col key={project.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card 
                shadow="xs" 
                padding="md" 
                radius="md" 
                withBorder 
                h="100%"
                component={Link}
                href={`/projects/${project.id}`}
                style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Text fw={500} size="sm" lineClamp={1}>
                      {project.title}
                    </Text>
                    <Group gap="xs">
                      {project.liveUrl && (
                        <Tooltip label="View Demo">
                          <ActionIcon
                            variant="light"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(project.liveUrl!, '_blank');
                            }}
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {project.githubUrl && (
                        <Tooltip label="View Source">
                          <ActionIcon
                            variant="light"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(project.githubUrl!, '_blank');
                            }}
                          >
                            <IconBrandGithub size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>

                  {project.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {project.description}
                    </Text>
                  )}

                  {project.technologies.length > 0 && (
                    <Group gap="xs">
                      {project.technologies.slice(0, 2).map((tech) => (
                        <Badge key={tech} size="xs" variant="outline">
                          {tech}
                        </Badge>
                      ))}
                      {project.technologies.length > 2 && (
                        <Badge size="xs" variant="outline" color="gray">
                          +{project.technologies.length - 2}
                        </Badge>
                      )}
                    </Group>
                  )}

                  <Group gap="xs" mt="auto">
                    <Avatar
                      src={getAvatarUrl({
                        customAvatarUrl: project.profile.avatarUrl,
                        oauthImageUrl: project.profile.user?.image,
                        name: project.profile.user?.name,
                        email: project.profile.user?.email,
                      })}
                      size="xs"
                      radius="xl"
                    >
                      {getAvatarInitials({
                        name: project.profile.user?.name,
                        email: project.profile.user?.email,
                      })}
                    </Avatar>
                    <Text size="xs" c="dimmed">
                      {project.profile.user?.name ?? "Anonymous"}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Stack align="center" gap="md" py="xl">
          <Text ta="center" c="dimmed">
            No projects shared yet
          </Text>
          <Text ta="center" size="sm" c="dimmed">
            Be the first to showcase your work in the event!
          </Text>
        </Stack>
      )}

      {residentProjects && residentProjects.length > 6 && (
        <Group justify="center" mt="md">
          <Button
            component={Link}
            href="/projects"
            variant="light"
          >
            View All Projects ({residentProjects.length})
          </Button>
        </Group>
      )}
    </Card>
  );
}
