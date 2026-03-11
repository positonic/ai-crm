"use client";

import React from "react";
import {
  Stack,
  Title,
  Text,
  Group,
  Avatar,
  Badge,
  Paper,
  Card,
  Divider,
  Container,
  Alert,
  LoadingOverlay,
} from "@mantine/core";
import { IconInfoCircle, IconCalendar, IconMapPin } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import VisitRequestForm from "./components/VisitRequestForm";
import DeliverablesAccordion from "./components/DeliverablesAccordion";
import ResidencyFAQ from "./components/ResidencyFAQ";

interface SponsorResidencyDashboardProps {
  eventSponsorId: string;
  sponsorId: string;
  eventId: string;
}

export default function SponsorResidencyDashboard({
  eventSponsorId,
  sponsorId: _sponsorId,
  eventId: _eventId,
}: SponsorResidencyDashboardProps) {
  const {
    data: residencyData,
    isLoading,
    error,
  } = api.sponsor.getSponsorResidencyData.useQuery({
    eventSponsorId,
  });

  const { mutate: createDefaultDeliverables } =
    api.sponsor.createDefaultDeliverables.useMutation({
      onSuccess: () => {
        // Refresh the data after creating deliverables
        void utils.sponsor.getSponsorResidencyData.invalidate({
          eventSponsorId,
        });
      },
    });

  const utils = api.useUtils();

  // Auto-create default deliverables if none exist
  React.useEffect(() => {
    if (residencyData && residencyData.deliverables.length === 0) {
      createDefaultDeliverables({ eventSponsorId });
    }
  }, [residencyData, eventSponsorId, createDefaultDeliverables]);

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
        <Stack gap="xl">
          <Text>Loading sponsor residency dashboard...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !residencyData) {
    return (
      <Container size="lg" py="xl">
        <Alert
          icon={<IconInfoCircle size={16} />}
          title="Error Loading Dashboard"
          color="red"
        >
          Unable to load sponsor residency data. Please contact support.
        </Alert>
      </Container>
    );
  }

  const { sponsor, event, visitRequests, deliverables } = residencyData;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header Section */}
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap="lg">
                <Avatar
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  size="xl"
                  radius="md"
                >
                  {sponsor.name[0]}
                </Avatar>
                <Stack gap="xs">
                  <Title order={2}>Welcome to the {event.name}</Title>
                  <Text size="lg" fw={500}>
                    {sponsor.name}
                  </Text>
                  <Badge color="green" size="lg" variant="light">
                    Contract Signed - Active Sponsor
                  </Badge>
                </Stack>
              </Group>
            </Group>

            <Divider />

            <Group gap="xl">
              <Group gap="xs">
                <IconCalendar size={20} />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    Program Duration
                  </Text>
                  <Text size="sm" c="dimmed">
                    {new Date(event.startDate).toLocaleDateString()} -{" "}
                    {new Date(event.endDate).toLocaleDateString()}
                  </Text>
                </Stack>
              </Group>

              <Group gap="xs">
                <IconMapPin size={20} />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    Location
                  </Text>
                  <Text size="sm" c="dimmed">
                    {event.location ?? "TBD"}
                  </Text>
                </Stack>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Program Context */}
        <Card withBorder radius="md" p="xl">
          <Stack gap="md">
            <Title order={3}>About the Builder Residency</Title>
            <Text>
              The Residency is designed as an intensive, hands-on environment
              where selected builders develop their projects from concept toward
              sustainability. This 3-week program focuses on practical
              development with tracks including AI for Public Use, Identity &
              Privacy, and Funding Systems.
            </Text>
            <Text>
              Your role as a sponsor brings both technical depth and ecosystem
              connectivity to help residents transition from prototype to
              sustainable projects within your ecosystem.
            </Text>
          </Stack>
        </Card>

        {/* Visit Request Section */}
        <VisitRequestForm
          eventSponsorId={eventSponsorId}
          eventDates={{ start: event.startDate, end: event.endDate }}
          existingRequests={visitRequests}
        />

        {/* Deliverables Section */}
        <DeliverablesAccordion
          deliverables={deliverables}
          eventSponsorId={eventSponsorId}
        />

        {/* FAQ Section */}
        <ResidencyFAQ />
      </Stack>
    </Container>
  );
}
