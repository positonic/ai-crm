"use client";

import Link from "next/link";
import { Container, Card, Stack, Text, Group, Button } from "@mantine/core";
import {
  IconCalendarX,
  IconArrowLeft,
  IconInfoCircle,
} from "@tabler/icons-react";
import { getEventContent } from "~/utils/eventContent";
import { normalizeEventType } from "~/types/event";

interface ApplicationClosedMessageProps {
  event?: {
    id: string;
    name: string;
    slug: string | null;
    type: string;
  };
}

export default function ApplicationClosedMessage({
  event,
}: ApplicationClosedMessageProps) {
  // Get event-specific content or fallback to residency
  const eventType = normalizeEventType(event?.type) ?? "RESIDENCY";
  const content = getEventContent(eventType);

  // Use dynamic event data or fallback
  const eventName = event?.name ?? content.name;
  const eventDescription = content.shortDescription;
  const backUrl = event
    ? `/events/${event.slug ?? event.id}`
    : "/events/funding-commons-residency-2025";
  const gradientClass = `bg-gradient-to-r ${content.branding.colors.gradient}`;

  return (
    <Container size="md" py="xl">
      <Stack gap="xl" align="center">
        {/* Main Closure Card */}
        <Card
          p="xl"
          radius="lg"
          withBorder
          className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 max-w-2xl w-full"
        >
          <Stack gap="xl" align="center">
            {/* Icon */}
            <div className={`${gradientClass} rounded-full p-6`}>
              <IconCalendarX size={48} color="white" />
            </div>

            {/* Heading */}
            <Stack gap="sm" align="center">
              <Text size="xl" fw={700} ta="center" className="text-gray-800">
                {content.applicationClosedMessage.title}
              </Text>
              <Text size="md" c="dimmed" ta="center">
                {eventName} • {eventDescription}
              </Text>
            </Stack>

            {/* Message */}
            <Stack gap="md">
              <Text size="md" ta="center" className="text-gray-700">
                {content.applicationClosedMessage.description}
              </Text>

              <Card
                p="md"
                radius="md"
                className={`bg-${content.branding.colors.primary}-50 border border-${content.branding.colors.primary}-200`}
              >
                <Group gap="sm">
                  <IconInfoCircle
                    size={20}
                    className={`text-${content.branding.colors.primary}-600`}
                  />
                  <Text
                    size="sm"
                    className={`text-${content.branding.colors.primary}-800`}
                  >
                    {content.applicationClosedMessage.infoMessage}
                  </Text>
                </Group>
              </Card>
            </Stack>

            {/* Action Buttons */}
            <Group gap="md" mt="md">
              <Button
                component={Link}
                href={backUrl}
                leftSection={<IconArrowLeft size={16} />}
                variant="filled"
                className={`bg-gradient-to-r ${content.branding.colors.gradient} hover:from-${content.branding.colors.primary}-700 hover:to-${content.branding.colors.secondary}-700`}
                size="md"
              >
                Back to {eventType === "HACKATHON" ? "Hackathon" : "Residency"}{" "}
                Overview
              </Button>

              <Button
                component={Link}
                href="/events"
                variant="light"
                color="gray"
                size="md"
              >
                Browse Other Events
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Additional Info */}
        <Card
          p="lg"
          radius="md"
          withBorder
          className={`bg-gradient-to-r from-${content.branding.colors.primary}-50 to-${content.branding.colors.secondary}-50 max-w-2xl w-full`}
        >
          <Stack gap="md">
            <Text
              size="lg"
              fw={600}
              className={`text-${content.branding.colors.primary}-900`}
            >
              About the{" "}
              {eventType === "HACKATHON"
                ? "RealFi Hackathon"
                : "RealFi Residency"}
            </Text>
            <Text
              size="sm"
              className={`text-${content.branding.colors.primary}-700`}
            >
              {eventType === "HACKATHON"
                ? "A competitive event where builders and entrepreneurs develop innovative RealFi solutions that solve everyday problems for Argentinians. Join us for an intensive coding and collaboration experience in Buenos Aires."
                : "This 8-week intensive program brings together builders, researchers, and entrepreneurs to develop real-world blockchain applications that solve everyday problems for Argentinians. The residency combines hands-on development, mentorship, and collaboration in Buenos Aires."}
            </Text>
            <Group gap="md" mt="sm">
              <Button
                component={Link}
                href={`${backUrl}/about`}
                variant="light"
                color={content.branding.colors.primary}
                size="sm"
              >
                Learn More
              </Button>
              <Button
                component={Link}
                href={`${backUrl}/faq`}
                variant="light"
                color={content.branding.colors.secondary}
                size="sm"
              >
                View FAQ
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
