import { redirect, notFound } from "next/navigation";
import { Container, Stack, Title, Text, Paper } from "@mantine/core";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

interface AdminSponsorsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AdminSponsorsPage({
  params,
}: AdminSponsorsPageProps) {
  const { eventId } = await params;

  const session = await auth();

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/events/${eventId}/sponsors`);
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Try by ID first, then by slug for backward compatibility
  let event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
    },
  });

  // If not found by ID, try by slug
  event ??= await db.event.findUnique({
    where: { slug: eventId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="md">
        <Title order={2}>Sponsors - {event.name}</Title>

        <Paper p="xl" withBorder>
          <Stack gap="lg">
            <Stack align="center" gap="md">
              <Title order={3} c="dimmed">
                Coming Soon
              </Title>
              <Text c="dimmed" ta="center">
                Sponsor management functionality will be available in a future
                update.
              </Text>
            </Stack>

            <Stack gap="md">
              <Title order={4}>Discussion Points for Sponsor Onboarding</Title>

              <Text fw={500}>
                Should we use this platform for sponsor onboarding?
              </Text>

              <Stack gap="sm">
                <Text fw={500} c="blue">
                  Self-Service vs. White Glove Approach:
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Do we want sponsors to create accounts and submit forms
                  themselves?
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Or should we handle submissions on their behalf for a more
                  white-glove experience?
                </Text>
              </Stack>

              <Stack gap="sm">
                <Text fw={500} c="blue">
                  Information Requirements - Self-Service Model:
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Company details (name, website, description, logo)
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Contact information (primary contact, billing contact)
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Sponsorship preferences (tier, benefits desired)
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Marketing materials and brand guidelines
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Payment and invoicing preferences
                </Text>
              </Stack>

              <Stack gap="sm">
                <Text fw={500} c="blue">
                  Information Requirements - White Glove Model:
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Internal notes and relationship history
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Negotiated terms and custom arrangements
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Communication preferences and key stakeholders
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Follow-up schedules and renewal tracking
                </Text>
                <Text size="sm" c="dimmed" pl="md">
                  • Internal approval workflows and status tracking
                </Text>
              </Stack>

              <Text size="sm" c="dimmed" fs="italic">
                These considerations will help shape the sponsor management
                system architecture and user experience.
              </Text>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
