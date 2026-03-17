"use client";

import {
  Button,
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Switch,
  Badge,
  SimpleGrid,
  Divider,
  ThemeIcon,
  TextInput,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUsers,
  IconMicrophone,
  IconUserCheck,
  IconSparkles,
  IconBulb,
  IconHandStop,
  IconNews,
  IconHeart,
  IconMapPin,
  IconCalendarEvent,
  IconSettings,
  IconBuilding,
  IconClipboardList,
  IconChevronRight,
  IconLink,
  IconTicket,
  IconCertificate,
  IconTarget,
  IconRefresh,
} from "@tabler/icons-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface EventData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  isOnline: boolean;
  status: string;
  featureApplicantVetting: boolean;
  featureSpeakerVetting: boolean;
  featureMentorVetting: boolean;
  featurePraise: boolean;
  featureProjects: boolean;
  featureAsksOffers: boolean;
  featureNewsfeed: boolean;
  featureImpactAnalytics: boolean;
  featureSponsorManagement: boolean;
  featureScheduleManagement: boolean;
  featureFloorManagement: boolean;
  featureDeliberation: boolean;
  registrationUrl: string | null;
  lumaEventId: string | null;
  _count: {
    applications: number;
    sponsors: number;
  };
}

type FeatureFlagKey =
  | "featureApplicantVetting"
  | "featureSpeakerVetting"
  | "featureMentorVetting"
  | "featurePraise"
  | "featureProjects"
  | "featureAsksOffers"
  | "featureNewsfeed"
  | "featureImpactAnalytics"
  | "featureSponsorManagement"
  | "featureScheduleManagement"
  | "featureFloorManagement"
  | "featureDeliberation";

const FEATURE_FLAGS: {
  key: FeatureFlagKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
}[] = [
  {
    key: "featureApplicantVetting",
    label: "Applicant Vetting Process",
    description: "Accept and review applications for residents/attendees",
    icon: IconUsers,
  },
  {
    key: "featureSpeakerVetting",
    label: "Speaker Vetting Process",
    description: "Manage speaker applications and speaker lineup",
    icon: IconMicrophone,
  },
  {
    key: "featureMentorVetting",
    label: "Mentor Vetting Process",
    description: "Manage mentor applications and mentor assignments",
    icon: IconUserCheck,
  },
  {
    key: "featurePraise",
    label: "Praise",
    description: "Enable the praise/kudos system for participants",
    icon: IconSparkles,
  },
  {
    key: "featureProjects",
    label: "Projects",
    description: "List and track projects created during the event",
    icon: IconBulb,
  },
  {
    key: "featureAsksOffers",
    label: "Asks & Offers",
    description: "Enable the asks & offers marketplace for participants",
    icon: IconHandStop,
  },
  {
    key: "featureNewsfeed",
    label: "Newsfeed",
    description: "Enable the latest updates newsfeed for the event",
    icon: IconNews,
  },
  {
    key: "featureImpactAnalytics",
    label: "Impact Analytics",
    description: "Enable impact metrics and analytics dashboard",
    icon: IconHeart,
  },
  {
    key: "featureSponsorManagement",
    label: "Sponsor Management",
    description: "Enable sponsor tracking and management for the event",
    icon: IconBuilding,
  },
  {
    key: "featureScheduleManagement",
    label: "Schedule Management",
    description: "Allow floor leads to manage their floor schedules",
    icon: IconSettings,
  },
  {
    key: "featureFloorManagement",
    label: "Floor Leads",
    description: "Enable floor lead assignments and venue management",
    icon: IconMapPin,
  },
  {
    key: "featureDeliberation",
    label: "Deliberation",
    description: "Enable community priority deliberation for this event",
    icon: IconTarget,
  },
];

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "COMPLETED":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminEventDetailClientProps {
  event: EventData;
}

export default function AdminEventDetailClient({
  event,
}: AdminEventDetailClientProps) {
  const router = useRouter();
  const eventIdentifier = event.slug ?? event.id;

  const [registrationUrl, setRegistrationUrl] = useState(
    event.registrationUrl ?? "",
  );
  const [lumaEventId, setLumaEventId] = useState(event.lumaEventId ?? "");

  const activityCertStatus = api.hypercerts.getEventActivityCertStatus.useQuery(
    { eventId: event.id },
  );

  const publishActivityCert =
    api.hypercerts.publishEventActivityCert.useMutation({
      onSuccess: (data) => {
        notifications.show({
          title: "Activity Cert Published",
          message: `Published with ${String(data.contributorCount)} contributor${data.contributorCount === 1 ? "" : "s"}`,
          color: "green",
        });
        void activityCertStatus.refetch();
      },
      onError: (error) => {
        notifications.show({
          title: "Failed to Publish",
          message: error.message,
          color: "red",
        });
      },
    });

  const republishActivityCert =
    api.hypercerts.republishEventActivityCert.useMutation({
      onSuccess: (data) => {
        notifications.show({
          title: "Activity Cert Re-published",
          message: `Re-published with ${String(data.contributorCount)} contributor${data.contributorCount === 1 ? "" : "s"}`,
          color: "green",
        });
        void activityCertStatus.refetch();
      },
      onError: (error) => {
        notifications.show({
          title: "Failed to Re-publish",
          message: error.message,
          color: "red",
        });
      },
    });

  const updateEvent = api.event.updateEvent.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Saved",
        message: "Integration settings updated.",
        color: "green",
      });
      router.refresh();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to save",
        color: "red",
      });
    },
  });

  const handleSaveField = (
    field: "registrationUrl" | "lumaEventId",
    value: string,
  ) => {
    const currentValue =
      field === "registrationUrl" ? event.registrationUrl : event.lumaEventId;
    if (value === (currentValue ?? "")) return;
    updateEvent.mutate({ id: event.id, [field]: value || undefined });
  };

  const updateFeatureFlags = api.event.updateEventFeatureFlags.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Feature configuration saved.",
        color: "green",
      });
      router.refresh();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update feature configuration",
        color: "red",
      });
    },
  });

  const handleToggle = (key: FeatureFlagKey, checked: boolean) => {
    updateFeatureFlags.mutate({
      id: event.id,
      [key]: checked,
    });
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Event Header */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Title order={2}>{event.name}</Title>
                {event.description && (
                  <Text size="sm" c="dimmed" maw={600}>
                    {event.description}
                  </Text>
                )}
              </Stack>
              <Group gap="xs">
                <Badge variant="light" tt="uppercase">
                  {event.type}
                </Badge>
                <Badge
                  color={getStatusColor(event.status)}
                  variant="light"
                  tt="uppercase"
                >
                  {event.status}
                </Badge>
              </Group>
            </Group>

            <Group gap="lg">
              <Group gap={4}>
                <IconCalendarEvent size={14} />
                <Text size="sm">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </Text>
              </Group>
              {event.location && (
                <Group gap={4}>
                  <IconMapPin size={14} />
                  <Text size="sm">{event.location}</Text>
                </Group>
              )}
              {event.isOnline && (
                <Badge size="sm" variant="light" color="blue">
                  Online
                </Badge>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Management Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {[
            {
              label: "Applications",
              description: "Review and manage event applications",
              icon: IconUsers,
              color: "blue",
              href: `/admin/events/${eventIdentifier}/applications`,
              count: event._count.applications,
              visible: event.featureApplicantVetting,
            },
            {
              label: "Sponsors",
              description: "View and manage event sponsors",
              icon: IconBuilding,
              color: "orange",
              href: `/admin/events/${eventIdentifier}/sponsors`,
              count: event._count.sponsors,
              visible: event.featureSponsorManagement,
            },
            {
              label: "Mentors",
              description: "Manage mentor applications and assignments",
              icon: IconUserCheck,
              color: "green",
              href: `/admin/events/${eventIdentifier}/mentors`,
              visible: event.featureMentorVetting,
            },
            {
              label: "Speakers",
              description: "Manage speaker invitations and applications",
              icon: IconMicrophone,
              color: "teal",
              href: `/admin/events/${eventIdentifier}/speakers`,
              visible: event.featureSpeakerVetting,
            },
            {
              label: "Selection Rubric",
              description: "Configure application evaluation criteria",
              icon: IconClipboardList,
              color: "purple",
              href: `/admin/events/${eventIdentifier}/select-rubric`,
              visible: event.featureApplicantVetting,
            },
            {
              label: "Floor Leads",
              description: "Manage floor assignments and venue leads",
              icon: IconMapPin,
              color: "cyan",
              href: `/admin/events/${eventIdentifier}/floor-owners`,
              visible: event.featureFloorManagement,
            },
            {
              label: "Deliberation",
              description: "Manage community priority deliberation and results",
              icon: IconTarget,
              color: "grape",
              href: `/admin/events/${eventIdentifier}/deliberations`,
              visible: event.featureDeliberation,
            },
            {
              label: "Manage Schedule",
              description: "Create and manage sessions, floors, and tracks",
              icon: IconCalendarEvent,
              color: "indigo",
              href: `/events/${eventIdentifier}/manage-schedule`,
              visible: event.featureScheduleManagement,
            },
          ]
            .filter((card) => card.visible !== false)
            .map((card) => {
              const CardIcon = card.icon;
              return (
                <Paper
                  key={card.label}
                  p="lg"
                  radius="md"
                  withBorder
                  component={Link}
                  href={card.href}
                  style={{
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "box-shadow 150ms ease",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.boxShadow =
                      "var(--mantine-shadow-md)";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                  >
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                      <ThemeIcon
                        size="lg"
                        radius="md"
                        variant="light"
                        color={card.color}
                      >
                        <CardIcon size={20} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Text size="sm" fw={600}>
                            {card.label}
                          </Text>
                          {"count" in card && card.count !== undefined && (
                            <Badge size="sm" variant="light" color={card.color}>
                              {card.count}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {card.description}
                        </Text>
                      </Stack>
                    </Group>
                    <IconChevronRight size={16} style={{ opacity: 0.5 }} />
                  </Group>
                </Paper>
              );
            })}
        </SimpleGrid>

        {/* Integrations */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconLink size={20} />
              <Title order={3}>Integrations</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Configure external service integrations for this event.
            </Text>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                label="Registration URL"
                placeholder="https://luma.com/your-event"
                leftSection={<IconLink size={16} />}
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.currentTarget.value)}
                onBlur={() =>
                  handleSaveField("registrationUrl", registrationUrl)
                }
                disabled={updateEvent.isPending}
              />
              <TextInput
                label="Luma Event ID"
                description="Required for auto-generating speaker coupon codes"
                placeholder="evt-..."
                leftSection={<IconTicket size={16} />}
                value={lumaEventId}
                onChange={(e) => setLumaEventId(e.currentTarget.value)}
                onBlur={() => handleSaveField("lumaEventId", lumaEventId)}
                disabled={updateEvent.isPending}
              />
            </SimpleGrid>

            <Divider />

            {/* Activity Cert (Hypercerts) */}
            <Paper p="md" radius="sm" withBorder>
              <Stack gap="sm">
                <Group gap="xs">
                  <IconCertificate size={20} />
                  <Text size="sm" fw={500}>
                    Activity Cert (Hypercerts)
                  </Text>
                </Group>

                {activityCertStatus.data?.isPublished ? (
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Badge color="green" variant="light">
                        Published
                      </Badge>
                      {activityCertStatus.data.publishedAt && (
                        <Text size="xs" c="dimmed">
                          {new Date(
                            activityCertStatus.data.publishedAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      )}
                    </Group>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ wordBreak: "break-all" }}
                    >
                      {activityCertStatus.data.activityUri}
                    </Text>
                    <Button
                      size="sm"
                      variant="light"
                      color="orange"
                      leftSection={
                        republishActivityCert.isPending ? (
                          <Loader size={14} />
                        ) : (
                          <IconRefresh size={14} />
                        )
                      }
                      onClick={() =>
                        republishActivityCert.mutate({ eventId: event.id })
                      }
                      loading={republishActivityCert.isPending}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Delete &amp; Re-publish
                    </Button>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">
                      Publish this event as an activity cert on the Hypersphere
                      with speakers as contributors and a hyperboard.
                    </Text>
                    <Button
                      size="sm"
                      variant="light"
                      leftSection={
                        publishActivityCert.isPending ? (
                          <Loader size={14} />
                        ) : (
                          <IconCertificate size={14} />
                        )
                      }
                      onClick={() =>
                        publishActivityCert.mutate({ eventId: event.id })
                      }
                      loading={publishActivityCert.isPending}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Publish Activity Cert
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        {/* Feature Configuration */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconSettings size={20} />
              <Title order={3}>Feature Configuration</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Toggle which features are enabled for this event. Disabled
              features will be hidden from the event navigation.
            </Text>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {FEATURE_FLAGS.map((flag) => {
                const FlagIcon = flag.icon;
                return (
                  <Paper key={flag.key} p="md" radius="sm" withBorder>
                    <Group
                      wrap="nowrap"
                      justify="space-between"
                      align="flex-start"
                    >
                      <Group wrap="nowrap" gap="sm" style={{ flex: 1 }}>
                        <FlagIcon size={20} />
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {flag.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {flag.description}
                          </Text>
                        </Stack>
                      </Group>
                      <Switch
                        checked={event[flag.key]}
                        onChange={(e) =>
                          handleToggle(flag.key, e.currentTarget.checked)
                        }
                        disabled={updateFeatureFlags.isPending}
                      />
                    </Group>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
