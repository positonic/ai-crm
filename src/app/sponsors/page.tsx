"use client";
import {
  Card,
  Group,
  Text,
  Title,
  Stack,
  Paper,
  ScrollArea,
  Badge,
  Avatar,
  SimpleGrid,
  ActionIcon,
  Button,
  Drawer,
  Modal,
  Select,
  Timeline,
  Checkbox,
  Tabs,
} from "@mantine/core";
import { useState, useMemo } from "react";
import "@mantine/core/styles.css";
import {
  IconExternalLink,
  IconPlus,
  IconTrash,
  IconMapPin,
  IconCalendar,
} from "@tabler/icons-react";
import AddLeadPanel from "../admin/events/AddLeadPanel";
import { api } from "~/trpc/react";
import Link from "next/link";

// Type definitions based on Prisma schema
interface Sponsor {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  contacts: Contact[];
}

interface EventSponsor {
  id: string;
  eventId: string;
  sponsorId: string;
  qualified: boolean;
  sponsor: Sponsor;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  sponsorId?: string | null;
}

// Status codes for sponsor pipeline - maintains logical order
const SPONSOR_STATUS_CODES = [
  {
    code: "ORG_ADDED",
    label: "Organization Added",
    description: "Organization added to sponsor database",
  },
  {
    code: "ON_EVENT_BOARD",
    label: "On Event Board",
    description: "Sponsor appears on the event kanban board",
  },
  {
    code: "QUALIFY_SPONSOR",
    label: "Qualify Sponsor",
    description: "Initial assessment of sponsor fit and potential",
  },
  {
    code: "SPONSOR_QUALIFIED",
    label: "Sponsor Qualified",
    description: "Sponsor meets qualification criteria",
  },
  {
    code: "CONTACT_IDENTIFIED",
    label: "Contact Identified",
    description: "Key contact person identified and added to system",
  },
  {
    code: "MATERIALS_SENT",
    label: "Materials Sent",
    description: "Initial materials and information sent to sponsor",
  },
  {
    code: "SCOUT_HANDOFF",
    label: "Scout Handoff",
    description: "Scouts have qualified and handed off to main team",
  },
  {
    code: "INITIAL_CALL_SETUP",
    label: "Initial Call Setup",
    description: "Schedule first formal conversation with sponsor",
  },
  {
    code: "INITIAL_CALL_TAKEN",
    label: "Initial Call Taken",
    description: "Present sponsorship opportunity and value proposition",
  },
  {
    code: "SUBSEQUENT_CALLS",
    label: "Subsequent Calls",
    description: "Follow-up discussions and Q&A sessions",
  },
  {
    code: "PROPOSAL_SENT",
    label: "Proposal Sent",
    description: "Formal proposal document created and shared",
  },
  {
    code: "TERMS_CONFIRMED",
    label: "Terms Confirmed",
    description: "Sponsor confirms agreement to proposed terms",
  },
  {
    code: "CONTRACT_SENT",
    label: "Contract Sent",
    description: "Legal contract documentation delivered",
  },
  {
    code: "CONTRACT_SIGNED",
    label: "Contract Signed",
    description: "Both parties have executed the agreement",
  },
  {
    code: "PAYMENT_INFO_SENT",
    label: "Payment Info Sent",
    description: "Invoice and payment details provided",
  },
  {
    code: "PAYMENT_PENDING",
    label: "Payment Pending",
    description: "Monitor payment status until received",
  },
  {
    code: "DELIVERABLES_CIRCULATED",
    label: "Deliverables Circulated",
    description: "Share sponsor requirements with internal team",
  },
  {
    code: "ASSETS_COLLECTED",
    label: "Assets Collected",
    description: "Collect logos, materials, and other assets",
  },
  {
    code: "MARKETING_COORDINATION",
    label: "Marketing Coordination",
    description: "Coordinate promotional activities and announcements",
  },
  {
    code: "POST_CONTRACT",
    label: "Post-Contract",
    description: "Ongoing relationship management and fulfillment",
  },
] as const;

// Type for status codes
type SponsorStatusCode = (typeof SPONSOR_STATUS_CODES)[number]["code"];

/**
 * Determines the current status of a sponsor based on available data
 * @param eventSponsor - The event sponsor data to analyze
 * @returns The current status code for the sponsor
 */
function determineSponsorStatus(eventSponsor: EventSponsor): SponsorStatusCode {
  const { sponsor, qualified } = eventSponsor;
  const hasContacts = sponsor.contacts && sponsor.contacts.length > 0;

  // TODO: Extend this logic as more data becomes available
  // For now, we can only determine status based on what we have:
  // - sponsor exists (ORG_ADDED, ON_EVENT_BOARD)
  // - qualified status
  // - contacts presence

  if (hasContacts) {
    // If we have contacts, we've at least identified them
    return "CONTACT_IDENTIFIED";
  } else if (qualified) {
    // If qualified but no contacts, we're in the qualification phase
    return "SPONSOR_QUALIFIED";
  } else {
    // If not qualified yet, we're still qualifying
    return "QUALIFY_SPONSOR";
  }

  // Note: As the system grows, you can add more logic here to detect:
  // - Materials sent (maybe a field on EventSponsor)
  // - Call scheduled/taken (maybe a separate Interaction table)
  // - Proposal sent (maybe a Document table)
  // - Contract status (maybe a Contract table)
  // - Payment status (maybe a Payment table)
  // etc.
}

/**
 * Gets the status object for a given status code
 * @param statusCode - The status code to look up
 * @returns The status object containing code, label, and description
 */
function getStatusInfo(statusCode: SponsorStatusCode) {
  return SPONSOR_STATUS_CODES.find((status) => status.code === statusCode);
}

/**
 * Gets the index/position of a status in the pipeline
 * @param statusCode - The status code to find the position of
 * @returns The 0-based index of the status in the pipeline
 */
function getStatusPosition(statusCode: SponsorStatusCode): number {
  return SPONSOR_STATUS_CODES.findIndex((status) => status.code === statusCode);
}

interface SponsorCardData {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  state: string;
  qualified: boolean;
  eventSponsorId: string;
}

// Kanban columns mapping status codes to display columns
const columns = [
  {
    title: "Lead",
    statusCodes: ["QUALIFY_SPONSOR", "SPONSOR_QUALIFIED"],
  },
  {
    title: "Contact Identified",
    statusCodes: [
      "CONTACT_IDENTIFIED",
      "MATERIALS_SENT",
      "SCOUT_HANDOFF",
      "INITIAL_CALL_SETUP",
    ],
  },
  {
    title: "Proposal",
    statusCodes: [
      "INITIAL_CALL_TAKEN",
      "SUBSEQUENT_CALLS",
      "PROPOSAL_SENT",
      "TERMS_CONFIRMED",
      "CONTRACT_SENT",
    ],
  },
  {
    title: "Contract Signed",
    statusCodes: [
      "CONTRACT_SIGNED",
      "PAYMENT_INFO_SENT",
      "PAYMENT_PENDING",
      "DELIVERABLES_CIRCULATED",
      "ASSETS_COLLECTED",
      "MARKETING_COORDINATION",
      "POST_CONTRACT",
    ],
  },
];

function SponsorCard({
  sponsor,
  onClick,
}: {
  sponsor: SponsorCardData;
  onClick: () => void;
}) {
  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <Avatar src={sponsor.logoUrl} alt={sponsor.name} radius="xl">
              {sponsor.name[0]}
            </Avatar>
            <Stack gap={0}>
              <Text fw={500}>{sponsor.name}</Text>
              {sponsor.websiteUrl && (
                <Text size="xs" c="dimmed">
                  {sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                </Text>
              )}
            </Stack>
          </Group>
          {sponsor.qualified && (
            <Badge color="green" size="xs" variant="light">
              Qualified
            </Badge>
          )}
        </Group>
        <Badge
          color="blue"
          size="sm"
          variant="filled"
          style={{ alignSelf: "flex-start" }}
        >
          {sponsor.state}
        </Badge>
      </Stack>
    </Card>
  );
}

function EventsTab({ sponsorId }: { sponsorId: string }) {
  const { data: sponsor, isLoading } = api.sponsor.getSponsor.useQuery({
    id: sponsorId,
  });

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Text c="dimmed">Loading events...</Text>
      </Stack>
    );
  }

  if (!sponsor?.events || sponsor.events.length === 0) {
    return (
      <Stack align="center" py="xl">
        <Text c="dimmed" ta="center">
          This sponsor is not associated with any events yet.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text fw={500} size="lg">
        Events
      </Text>
      <Text size="sm" c="dimmed">
        {sponsor.events.length} event{sponsor.events.length !== 1 ? "s" : ""}
      </Text>

      <Stack gap="sm">
        {sponsor.events.map((eventSponsor) => (
          <Paper key={eventSponsor.id} p="md" withBorder>
            <Group gap="sm" justify="space-between" align="flex-start">
              <Group gap="sm">
                <IconCalendar size={18} />
                <Stack gap={0}>
                  <Text fw={500} size="sm">
                    {eventSponsor.event.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(
                      eventSponsor.event.startDate,
                    ).toLocaleDateString()}{" "}
                    -{" "}
                    {new Date(eventSponsor.event.endDate).toLocaleDateString()}
                  </Text>
                  {eventSponsor.event.location && (
                    <Text size="xs" c="dimmed">
                      {eventSponsor.event.location}
                    </Text>
                  )}
                </Stack>
              </Group>
              {eventSponsor.qualified && (
                <Badge size="sm" color="green" variant="light">
                  Qualified
                </Badge>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

function CommunicationsTab({ sponsorId }: { sponsorId: string }) {
  const { data: communications, isLoading } =
    api.sponsor.getSponsorCommunications.useQuery({
      sponsorId,
      limit: 50,
    });

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Text c="dimmed">Loading communications...</Text>
      </Stack>
    );
  }

  if (!communications || communications.length === 0) {
    return (
      <Stack align="center" py="xl">
        <Text c="dimmed" ta="center">
          No communications found for this sponsor.
          <br />
          Communications are shown when contacts associated with this sponsor
          have been communicated with.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text fw={500} size="lg">
        Communication History
      </Text>
      <Text size="sm" c="dimmed">
        {communications.length} communication
        {communications.length !== 1 ? "s" : ""} found
      </Text>

      <Stack gap="sm">
        {communications.map((comm) => (
          <Paper key={comm.id} p="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text fw={500} size="sm">
                    {comm.subject ?? "No Subject"}
                  </Text>
                  {comm.contact && (
                    <Text size="xs" c="dimmed">
                      To: {comm.contact.firstName} {comm.contact.lastName}
                    </Text>
                  )}
                </Stack>
                <Badge
                  color={
                    comm.status === "SENT"
                      ? "green"
                      : comm.status === "FAILED"
                        ? "red"
                        : "gray"
                  }
                  size="sm"
                  variant="light"
                >
                  {comm.status}
                </Badge>
              </Group>

              <Group gap="xs">
                <Badge size="xs" variant="dot" color="blue">
                  {comm.channel}
                </Badge>
                <Text size="xs" c="dimmed">
                  {comm.sentAt
                    ? new Date(comm.sentAt).toLocaleString()
                    : new Date(comm.createdAt).toLocaleString()}
                </Text>
              </Group>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

export default function SponsorKanbanBoard() {
  const [addLeadPanelOpened, setAddLeadPanelOpened] = useState(false);
  const [selectedSponsor, setSelectedSponsor] =
    useState<SponsorCardData | null>(null);
  const [sponsorPanelOpened, setSponsorPanelOpened] = useState(false);
  const [addContactModalOpened, setAddContactModalOpened] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");

  // Get tRPC utils for invalidation
  const utils = api.useUtils();

  // Fetch event data from database
  const { data: event, isLoading } = api.event.getEvent.useQuery({
    id: "realfi-hackathon-2025",
  });

  // Fetch all contacts
  const { data: allContacts } = api.contact.getContacts.useQuery();

  // Fetch detailed sponsor information when one is selected
  const { data: detailedSponsor } = api.sponsor.getSponsor.useQuery(
    { id: selectedSponsor?.id ?? "" },
    { enabled: !!selectedSponsor?.id },
  );

  // Mutation to add sponsor to event
  const addSponsorMutation = api.event.addSponsorToEvent.useMutation({
    onSuccess: (data) => {
      // Invalidate and refetch the event data to ensure consistency
      void utils.event.getEvent.invalidate({ id: "realfi-hackathon-2025" });
      console.log(`✅ Successfully added ${data.sponsor.name} as a lead!`);
      // You could add a toast notification here for better UX
    },
    onError: (error) => {
      // Show error message to user
      console.error("❌ Failed to add sponsor:", error.message);
      // You could add a toast notification here
    },
  });

  // Mutation to assign contact to sponsor
  const assignContactMutation = api.contact.assignContactToSponsor.useMutation({
    onSuccess: () => {
      // Invalidate contact, sponsor, and event data to update columns
      void utils.contact.getContacts.invalidate();
      void utils.sponsor.getSponsor.invalidate({
        id: selectedSponsor?.id ?? "",
      });
      void utils.event.getEvent.invalidate({ id: "realfi-hackathon-2025" });
      setAddContactModalOpened(false);
      setSelectedContactId("");
    },
  });

  // Mutation to remove contact from sponsor
  const removeContactMutation =
    api.contact.removeContactFromSponsor.useMutation({
      onSuccess: () => {
        // Invalidate contact, sponsor, and event data to update columns
        void utils.contact.getContacts.invalidate();
        void utils.sponsor.getSponsor.invalidate({
          id: selectedSponsor?.id ?? "",
        });
        void utils.event.getEvent.invalidate({ id: "realfi-hackathon-2025" });
      },
    });

  // Mutation to update sponsor qualified status
  const updateQualifiedMutation = api.event.updateSponsorQualified.useMutation({
    onSuccess: (data) => {
      // Update the local selectedSponsor state to reflect the change immediately
      if (selectedSponsor) {
        setSelectedSponsor({
          ...selectedSponsor,
          qualified: data.qualified,
        });
      }

      // Invalidate event and sponsor data to update status
      void utils.event.getEvent.invalidate({ id: "realfi-hackathon-2025" });
      void utils.sponsor.getSponsor.invalidate({
        id: selectedSponsor?.id ?? "",
      });
    },
  });

  // Transform database sponsors into component format
  const sponsors = useMemo(() => {
    if (!event?.sponsors) return [];

    return event.sponsors.map((eventSponsor): SponsorCardData => {
      // Determine status using the new status system
      const statusCode = determineSponsorStatus(eventSponsor);
      const statusInfo = getStatusInfo(statusCode);

      return {
        id: eventSponsor.sponsor.id,
        name: eventSponsor.sponsor.name,
        websiteUrl: eventSponsor.sponsor.websiteUrl,
        logoUrl: eventSponsor.sponsor.logoUrl,
        state: statusInfo?.label ?? "Unknown",
        qualified: eventSponsor.qualified,
        eventSponsorId: eventSponsor.id,
      };
    });
  }, [event]);

  const handleAddSponsor = async (sponsorId: string) => {
    if (!event) return;

    try {
      // Perform the mutation - this will trigger the loading state
      await addSponsorMutation.mutateAsync({
        eventId: event.id,
        sponsorId: sponsorId,
      });

      // Close the add lead panel on success
      setAddLeadPanelOpened(false);
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      // Keep the modal open so user can try again
      console.error("Error in handleAddSponsor:", error);
    }
  };

  const handleSponsorClick = (sponsor: SponsorCardData) => {
    setSelectedSponsor(sponsor);
    setSponsorPanelOpened(true);
  };

  const handleAssignContact = async () => {
    if (!selectedContactId || !selectedSponsor?.id) return;

    try {
      await assignContactMutation.mutateAsync({
        contactId: selectedContactId,
        sponsorId: selectedSponsor.id,
      });
    } catch (error) {
      console.error("Error assigning contact:", error);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      await removeContactMutation.mutateAsync({
        contactId,
      });
    } catch (error) {
      console.error("Error removing contact:", error);
    }
  };

  // Get available contacts (not assigned to this sponsor)
  const availableContacts = useMemo(() => {
    if (!allContacts || !detailedSponsor) return [];

    const sponsorContactIds = detailedSponsor.contacts.map(
      (c: Contact) => c.id,
    );
    return allContacts.filter(
      (contact: Contact) => !sponsorContactIds.includes(contact.id),
    );
  }, [allContacts, detailedSponsor]);

  const handleQualifiedChange = async (checked: boolean) => {
    if (!event || !selectedSponsor) return;

    try {
      await updateQualifiedMutation.mutateAsync({
        eventId: event.id,
        sponsorId: selectedSponsor.id,
        qualified: checked,
      });
    } catch (error) {
      console.error("Error updating qualified status:", error);
    }
  };

  // Calculate timeline position for selected sponsor
  const timelinePosition = useMemo(() => {
    if (!selectedSponsor || !event) return 0;
    const eventSponsor = event.sponsors.find(
      (es) => es.sponsor.id === selectedSponsor.id,
    );
    const currentStatusCode = eventSponsor
      ? determineSponsorStatus(eventSponsor)
      : "QUALIFY_SPONSOR";
    return getStatusPosition(currentStatusCode);
  }, [selectedSponsor, event]);

  if (isLoading) {
    return (
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Text>Loading event data...</Text>
      </Stack>
    );
  }

  if (!event) {
    return (
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Text>Event not found</Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack p={{ base: 12, sm: 24, md: 32 }}>
        <Title order={4} mb="md">
          {event.name}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {columns.map((col) => (
            <Paper key={col.title} p="lg" radius="md" shadow="xs" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>
                    {col.title}{" "}
                    {col.title === "Lead" && (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => setAddLeadPanelOpened(true)}
                      >
                        (Add Lead)
                      </Button>
                    )}
                  </Title>
                  <Badge color="blue" variant="light">
                    {
                      sponsors.filter((sponsor) => {
                        const statusCode = determineSponsorStatus(
                          event.sponsors.find(
                            (es) => es.sponsor.id === sponsor.id,
                          )!,
                        );
                        return col.statusCodes.includes(statusCode);
                      }).length
                    }
                  </Badge>
                </Group>
                <ScrollArea h={500} type="auto" offsetScrollbars>
                  <Stack gap="sm">
                    {sponsors
                      .filter((sponsor) => {
                        const statusCode = determineSponsorStatus(
                          event.sponsors.find(
                            (es) => es.sponsor.id === sponsor.id,
                          )!,
                        );
                        return col.statusCodes.includes(statusCode);
                      })
                      .map((sponsor) => (
                        <SponsorCard
                          key={sponsor.id}
                          sponsor={sponsor}
                          onClick={() => handleSponsorClick(sponsor)}
                        />
                      ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>

      <AddLeadPanel
        opened={addLeadPanelOpened}
        onClose={() => setAddLeadPanelOpened(false)}
        onAddSponsor={handleAddSponsor}
        isAddingLead={addSponsorMutation.isPending}
        existingSponsorIds={sponsors.map((s) => s.id)}
      />

      <Drawer
        opened={sponsorPanelOpened}
        onClose={() => setSponsorPanelOpened(false)}
        position="right"
        size="33%"
        title={selectedSponsor?.name ?? "Sponsor Details"}
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        {selectedSponsor && (
          <Tabs defaultValue="general">
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
              <Tabs.Tab value="events">Events</Tabs.Tab>
              <Tabs.Tab value="communications">Communications</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="general" pt="md">
              <Stack gap="lg">
                <Group>
                  <Avatar
                    size="xl"
                    src={selectedSponsor.logoUrl}
                    alt={selectedSponsor.name}
                    radius="md"
                  >
                    {selectedSponsor.name[0]}
                  </Avatar>
                  <Stack gap={0}>
                    <Text size="xl" fw={600}>
                      {selectedSponsor.name}
                    </Text>
                    <Badge color="blue" size="md" variant="light">
                      {selectedSponsor.state}
                    </Badge>
                  </Stack>
                </Group>

                {selectedSponsor.websiteUrl && (
                  <Group gap="xs">
                    <Text fw={500}>Website:</Text>
                    <Text
                      component="a"
                      href={selectedSponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--mantine-color-blue-6)",
                        textDecoration: "none",
                      }}
                      className="hover:underline"
                    >
                      {selectedSponsor.websiteUrl.replace(/^https?:\/\//, "")}
                      <IconExternalLink
                        size={14}
                        style={{ marginLeft: 4, display: "inline" }}
                      />
                    </Text>
                  </Group>
                )}

                <Stack gap="xs">
                  <Text fw={500}>Status:</Text>
                  <Text c="dimmed">{selectedSponsor.state}</Text>
                </Stack>

                <Checkbox
                  label="Qualified"
                  checked={selectedSponsor.qualified}
                  onChange={(event) =>
                    void handleQualifiedChange(event.currentTarget.checked)
                  }
                  disabled={updateQualifiedMutation.isPending}
                />

                <Stack gap="xs">
                  <Text fw={500}>Sponsor ID:</Text>
                  <Text c="dimmed" size="sm">
                    {selectedSponsor.id}
                  </Text>
                </Stack>

                {/* Residency Dashboard Link - Show for qualified sponsors */}
                {selectedSponsor.qualified && (
                  <Stack gap="xs">
                    <Text fw={500}>Residency Program:</Text>
                    <Link
                      href={`/sponsors/${selectedSponsor.id}/residency?eventId=${event?.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button
                        fullWidth
                        variant="filled"
                        color="cyan"
                        leftSection={<IconMapPin size={16} />}
                      >
                        Access Residency Dashboard
                      </Button>
                    </Link>
                  </Stack>
                )}

                {/* Contacts Section */}
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text fw={500} size="lg">
                      Contacts
                    </Text>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      variant="light"
                      size="sm"
                      onClick={() => setAddContactModalOpened(true)}
                      disabled={!availableContacts.length}
                    >
                      Add Contact
                    </Button>
                  </Group>

                  {detailedSponsor?.contacts &&
                  detailedSponsor.contacts.length > 0 ? (
                    <Stack gap="sm">
                      {detailedSponsor.contacts.map((contact: Contact) => (
                        <Paper key={contact.id} p="md" withBorder>
                          <Group justify="space-between" align="center">
                            <Stack gap={0}>
                              <Text fw={500}>
                                {contact.firstName} {contact.lastName}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {contact.email}
                              </Text>
                            </Stack>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() =>
                                void handleRemoveContact(contact.id)
                              }
                              loading={removeContactMutation.isPending}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" ta="center" py="xl">
                      No contacts assigned to this sponsor
                    </Text>
                  )}
                </Stack>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="timeline" pt="md">
              <Stack gap="md">
                <Text fw={500} size="lg">
                  Sponsor Process Timeline
                </Text>
                <Timeline
                  active={timelinePosition}
                  bulletSize={24}
                  lineWidth={2}
                >
                  <Timeline.Item title="Add Organization to Sponsor Database">
                    <Text c="dimmed" size="sm">
                      Organization added to the system for tracking
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Add Organization to Event Board">
                    <Text c="dimmed" size="sm">
                      Sponsor appears on the event kanban board
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Qualify Sponsor">
                    <Text c="dimmed" size="sm">
                      Initial assessment of sponsor fit and potential
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Sponsor Qualified">
                    <Text c="dimmed" size="sm">
                      Sponsor meets qualification criteria
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Identify Sponsor Contact">
                    <Text c="dimmed" size="sm">
                      Key contact person identified and added to system
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Send Materials">
                    <Text c="dimmed" size="sm">
                      Initial materials and information sent to sponsor
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Flow 2: Scouts Have Qualified and Hand Off">
                    <Text c="dimmed" size="sm">
                      Transition from scouts to main team
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Setup Initial Call">
                    <Text c="dimmed" size="sm">
                      Schedule first formal conversation with sponsor
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Take Initial Call and Make Pitch">
                    <Text c="dimmed" size="sm">
                      Present sponsorship opportunity and value proposition
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Any Subsequent Calls">
                    <Text c="dimmed" size="sm">
                      Follow-up discussions and Q&A sessions
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Initial Notion Proposal">
                    <Text c="dimmed" size="sm">
                      Formal proposal document created and shared
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Get Terms Confirmation">
                    <Text c="dimmed" size="sm">
                      Sponsor confirms agreement to proposed terms
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Contract is Sent to the Sponsor">
                    <Text c="dimmed" size="sm">
                      Legal contract documentation delivered
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Contract is Signed">
                    <Text c="dimmed" size="sm">
                      Both parties have executed the agreement
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Send Sponsor Payment Information">
                    <Text c="dimmed" size="sm">
                      Invoice and payment details provided
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Automatically Check Payment Until Made">
                    <Text c="dimmed" size="sm">
                      Monitor payment status until received
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Circulate Sponsor Deliverables Internally">
                    <Text c="dimmed" size="sm">
                      Share sponsor requirements with internal team
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Get Assets from Sponsor">
                    <Text c="dimmed" size="sm">
                      Collect logos, materials, and other assets
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Marketing Co-ordination">
                    <Text c="dimmed" size="sm">
                      Coordinate promotional activities and announcements
                    </Text>
                  </Timeline.Item>

                  <Timeline.Item title="Post-contract Steps">
                    <Text c="dimmed" size="sm">
                      Ongoing relationship management and fulfillment
                    </Text>
                  </Timeline.Item>
                </Timeline>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="events" pt="md">
              <EventsTab sponsorId={selectedSponsor.id} />
            </Tabs.Panel>

            <Tabs.Panel value="communications" pt="md">
              <CommunicationsTab sponsorId={selectedSponsor.id} />
            </Tabs.Panel>
          </Tabs>
        )}
      </Drawer>

      {/* Add Contact Modal */}
      <Modal
        opened={addContactModalOpened}
        onClose={() => {
          setAddContactModalOpened(false);
          setSelectedContactId("");
        }}
        title="Add Contact to Sponsor"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Select Contact"
            placeholder="Choose a contact to add"
            value={selectedContactId}
            onChange={(value) => setSelectedContactId(value ?? "")}
            data={availableContacts.map((contact: Contact) => ({
              value: contact.id,
              label: `${contact.firstName} ${contact.lastName} (${contact.email})`,
            }))}
            searchable
            maxDropdownHeight={200}
          />

          <Group justify="end">
            <Button
              variant="outline"
              onClick={() => {
                setAddContactModalOpened(false);
                setSelectedContactId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAssignContact()}
              disabled={!selectedContactId}
              loading={assignContactMutation.isPending}
            >
              Add Contact
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
