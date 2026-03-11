"use client";

import { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import {
  Table,
  Stack,
  Title,
  Text,
  Badge,
  Avatar,
  Group,
  Paper,
  Container,
  Drawer,
  ActionIcon,
  Divider,
  Anchor,
  Tooltip,
  TextInput,
} from "@mantine/core";
import {
  IconEye,
  IconWorld,
  IconBuilding,
  IconSearch,
  IconX,
  IconUsers,
  IconCalendar,
  IconExternalLink,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Sponsor {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  events: Array<{
    id: string;
    eventId: string;
    sponsorId: string;
    qualified: boolean;
  }>;
  categories: Array<{
    id: string;
    category: {
      id: string;
      name: string;
    };
  }>;
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Sponsor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: organizations, isLoading } = api.sponsor.getSponsors.useQuery();

  const openDrawer = useCallback((organization: Sponsor) => {
    setSelectedOrganization(organization);
    setDrawerOpened(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpened(false);
    setSelectedOrganization(null);
  }, []);

  // Filtered organizations for display (memoized)
  const displayOrganizations = useMemo(() => {
    let filtered = organizations;

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered =
        filtered?.filter((org) => {
          const name = org.name.toLowerCase();
          const websiteUrl = org.websiteUrl?.toLowerCase() ?? "";
          const categories = org.categories
            .map((c) => c.category.name.toLowerCase())
            .join(" ");

          return (
            name.includes(query) ||
            websiteUrl.includes(query) ||
            categories.includes(query)
          );
        }) ?? [];
    }

    return filtered;
  }, [organizations, searchQuery]);

  // Transform organizations into table data format for Mantine Table (memoized)
  const tableData = useMemo(
    () =>
      displayOrganizations
        ? {
            head: [
              "Organization",
              "Website",
              "Contacts",
              "Events",
              "Categories",
              "Actions",
            ],
            body: displayOrganizations.map((org) => [
              // Organization column with logo and name
              <Group gap="sm" key={`org-${org.id}`}>
                {org.logoUrl ? (
                  <Avatar src={org.logoUrl} size="sm" radius="sm">
                    {org.name[0]?.toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar size="sm" color="blue" radius="sm">
                    <IconBuilding size={16} />
                  </Avatar>
                )}
                <Anchor
                  component={Link}
                  href={`/crm/organizations/${org.id}`}
                  fw={500}
                  size="sm"
                  c="inherit"
                  underline="hover"
                >
                  {org.name}
                </Anchor>
              </Group>,
              // Website column
              <Group gap="xs" key={`website-${org.id}`}>
                {org.websiteUrl ? (
                  <Anchor href={org.websiteUrl} target="_blank" size="sm">
                    <Group gap={4}>
                      <IconWorld size={14} />
                      <Text size="xs">Visit</Text>
                    </Group>
                  </Anchor>
                ) : (
                  <Text size="xs" c="dimmed">
                    No website
                  </Text>
                )}
              </Group>,
              // Contacts count
              <Group gap="xs" key={`contacts-${org.id}`}>
                <IconUsers size={14} />
                <Text size="sm">{org.contacts.length}</Text>
              </Group>,
              // Events count
              <Group gap="xs" key={`events-${org.id}`}>
                <IconCalendar size={14} />
                <Text size="sm">{org.events.length}</Text>
              </Group>,
              // Categories
              <Group gap={4} key={`categories-${org.id}`}>
                {org.categories.length > 0 ? (
                  org.categories.slice(0, 2).map((cat) => (
                    <Badge key={cat.id} size="xs" variant="light">
                      {cat.category.name}
                    </Badge>
                  ))
                ) : (
                  <Text size="xs" c="dimmed">
                    None
                  </Text>
                )}
                {org.categories.length > 2 && (
                  <Tooltip
                    label={org.categories
                      .slice(2)
                      .map((c) => c.category.name)
                      .join(", ")}
                  >
                    <Badge size="xs" variant="light" color="gray">
                      +{org.categories.length - 2}
                    </Badge>
                  </Tooltip>
                )}
              </Group>,
              // Actions column
              <Group gap="xs" key={`actions-${org.id}`}>
                <Tooltip label="Quick view">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => openDrawer(org)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="View full details">
                  <ActionIcon
                    component={Link}
                    href={`/crm/organizations/${org.id}`}
                    variant="subtle"
                    color="blue"
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>,
            ]),
          }
        : null,
    [displayOrganizations, openDrawer],
  );

  // Handle authentication on client side
  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/organizations");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  if (isLoading) {
    return <div>Loading organizations...</div>;
  }

  return (
    <>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Title order={2}>Organizations</Title>

          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={500} size="lg">
                  All Organizations ({displayOrganizations?.length ?? 0})
                </Text>
              </Group>

              {/* Search Box */}
              <TextInput
                placeholder="Search by name, website, or category..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rightSection={
                  searchQuery ? (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setSearchQuery("")}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  ) : null
                }
              />

              {tableData && tableData.body.length > 0 ? (
                <Table
                  data={tableData}
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                />
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  {searchQuery
                    ? `No organizations match "${searchQuery}". Try a different search term.`
                    : "No organizations found."}
                </Text>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>

      {/* Organization Details Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={selectedOrganization?.name ?? "Organization Details"}
        position="right"
        size="lg"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        {selectedOrganization && (
          <Stack gap="lg">
            {/* Logo and Basic Info */}
            <Paper p="md" withBorder>
              <Stack gap="md" align="center">
                {selectedOrganization.logoUrl ? (
                  <Avatar
                    src={selectedOrganization.logoUrl}
                    size={80}
                    radius="md"
                  >
                    {selectedOrganization.name[0]?.toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar size={80} color="blue" radius="md">
                    <IconBuilding size={40} />
                  </Avatar>
                )}
                <Stack gap={4} align="center">
                  <Text fw={600} size="xl">
                    {selectedOrganization.name}
                  </Text>
                  {selectedOrganization.websiteUrl && (
                    <Anchor
                      href={selectedOrganization.websiteUrl}
                      target="_blank"
                      size="sm"
                    >
                      <Group gap={4}>
                        <IconWorld size={14} />
                        Visit Website
                      </Group>
                    </Anchor>
                  )}
                </Stack>
              </Stack>
            </Paper>

            {/* Statistics */}
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Text fw={500} size="lg">
                  Statistics
                </Text>
                <Group grow>
                  <Paper p="sm" withBorder bg="blue.0">
                    <Stack gap={4} align="center">
                      <IconUsers
                        size={24}
                        color="var(--mantine-color-blue-6)"
                      />
                      <Text size="xl" fw={600}>
                        {selectedOrganization.contacts.length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Contacts
                      </Text>
                    </Stack>
                  </Paper>
                  <Paper p="sm" withBorder bg="green.0">
                    <Stack gap={4} align="center">
                      <IconCalendar
                        size={24}
                        color="var(--mantine-color-green-6)"
                      />
                      <Text size="xl" fw={600}>
                        {selectedOrganization.events.length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Events
                      </Text>
                    </Stack>
                  </Paper>
                </Group>
              </Stack>
            </Paper>

            {/* Categories */}
            {selectedOrganization.categories.length > 0 && (
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Categories
                  </Text>
                  <Group gap="xs">
                    {selectedOrganization.categories.map((cat) => (
                      <Badge key={cat.id} size="md" variant="light">
                        {cat.category.name}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Contacts List */}
            {selectedOrganization.contacts.length > 0 && (
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Contacts ({selectedOrganization.contacts.length})
                  </Text>
                  <Stack gap="xs">
                    {selectedOrganization.contacts.map((contact) => (
                      <Paper key={contact.id} p="sm" withBorder>
                        <Group gap="sm">
                          <Avatar size="sm" color="blue">
                            {contact.firstName[0]?.toUpperCase()}
                            {contact.lastName[0]?.toUpperCase()}
                          </Avatar>
                          <Text size="sm">
                            {contact.firstName} {contact.lastName}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* Events List */}
            {selectedOrganization.events.length > 0 && (
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Events ({selectedOrganization.events.length})
                  </Text>
                  <Stack gap="xs">
                    {selectedOrganization.events.map((eventSponsor) => (
                      <Paper key={eventSponsor.id} p="sm" withBorder>
                        <Group gap="sm" justify="space-between">
                          <Group gap="sm">
                            <IconCalendar size={16} />
                            <Text size="sm">
                              Event ID: {eventSponsor.eventId}
                            </Text>
                          </Group>
                          {eventSponsor.qualified && (
                            <Badge size="xs" color="green">
                              Qualified
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}

            <Divider />

            {/* Organization ID */}
            <Paper p="sm" withBorder>
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                ID: {selectedOrganization.id}
              </Text>
            </Paper>
          </Stack>
        )}
      </Drawer>
    </>
  );
}
