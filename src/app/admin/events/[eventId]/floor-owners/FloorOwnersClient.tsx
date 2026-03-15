"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Loader,
  Center,
  Button,
  TextInput,
  Select,
  Avatar,
  Badge,
  ActionIcon,
  Divider,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBuilding,
  IconTrash,
  IconUserPlus,
  IconSearch,
  IconMail,
  IconMailForward,
  IconX,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useInvitationMutations } from "~/app/admin/_components/invitations";
import { getDisplayName } from "~/utils/userDisplay";

interface FloorOwnersClientProps {
  eventId: string;
}

export default function FloorOwnersClient({ eventId }: FloorOwnersClientProps) {
  const { data: venueOwners, isLoading: ownersLoading } =
    api.schedule.getVenueOwners.useQuery({ eventId });

  const { data: filterData, isLoading: filtersLoading } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const { data: pendingInvitations, isLoading: invitationsLoading } =
    api.invitation.getAll.useQuery({
      eventId,
      type: "VENUE_OWNER",
      status: "PENDING",
    });

  if (ownersLoading || filtersLoading || invitationsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const venues = filterData?.venues ?? [];

  // Group owners by venue
  const ownersByVenue = new Map<string, typeof venueOwners>();
  for (const owner of venueOwners ?? []) {
    const venueId = owner.venue.id;
    const existing = ownersByVenue.get(venueId) ?? [];
    existing.push(owner);
    ownersByVenue.set(venueId, existing);
  }

  // Group pending invitations by venue
  const invitationsByVenue = new Map<string, typeof pendingInvitations>();
  for (const invitation of pendingInvitations ?? []) {
    if (!invitation.venueId) continue;
    const existing = invitationsByVenue.get(invitation.venueId) ?? [];
    existing.push(invitation);
    invitationsByVenue.set(invitation.venueId, existing);
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Floor Leads</Title>
          <Text c="dimmed" size="sm">
            Assign users to manage floor schedules. Floor leads can add, edit,
            and delete sessions on their assigned floors.
          </Text>
        </div>

        {/* Assign new floor lead */}
        <AssignFloorOwnerForm eventId={eventId} venues={venues} />

        {/* Invite external floor lead */}
        <InviteFloorOwnerForm eventId={eventId} venues={venues} />

        <Divider />

        {/* Current assignments grouped by venue */}
        <Title order={3}>Current Assignments</Title>

        {venues.length === 0 ? (
          <Paper p="xl" withBorder>
            <Center>
              <Stack align="center" gap="sm">
                <IconBuilding size={32} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed">
                  No venues created yet. Create venues first to assign floor
                  leads.
                </Text>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <Stack gap="md">
            {venues.map((venue) => {
              const owners = ownersByVenue.get(venue.id) ?? [];
              const invitations = invitationsByVenue.get(venue.id) ?? [];
              return (
                <VenueOwnerCard
                  key={venue.id}
                  venue={venue}
                  owners={owners}
                  pendingInvitations={invitations}
                  eventId={eventId}
                />
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

// ──────────────────────────────────────────
// AssignFloorLeadForm
// ──────────────────────────────────────────

interface AssignFormProps {
  eventId: string;
  venues: { id: string; name: string }[];
}

function AssignFloorOwnerForm({ eventId, venues }: AssignFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserOption, setSelectedUserOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: searchResults } = api.user.searchUsers.useQuery(
    { query: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.length >= 2 },
  );

  const assignMutation = api.schedule.assignVenueOwner.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Assigned",
        message: "Floor lead assigned successfully",
        color: "green",
      });
      setSelectedUserId(null);
      setSelectedUserOption(null);
      setSelectedVenueId(null);
      setSearchQuery("");
      void utils.schedule.getVenueOwners.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const userOptions = (searchResults ?? []).map((user) => {
    const name = getDisplayName(user, "Unknown");
    const email = user.email ? ` (${user.email})` : "";
    return { value: user.id, label: `${name}${email}` };
  });

  // Always include the selected user in the options so the label persists when search clears
  const userOptionsWithSelected =
    selectedUserOption &&
    !userOptions.some((o) => o.value === selectedUserOption.value)
      ? [selectedUserOption, ...userOptions]
      : userOptions;

  const handleAssign = () => {
    if (!selectedUserId || !selectedVenueId) {
      notifications.show({
        title: "Missing fields",
        message: "Select both a user and a venue",
        color: "orange",
      });
      return;
    }
    assignMutation.mutate({
      userId: selectedUserId,
      venueId: selectedVenueId,
      eventId,
    });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconUserPlus size={18} />
          <Text fw={600}>Assign Existing User</Text>
        </Group>
        <Group grow align="flex-end">
          <Select
            label="Search User"
            placeholder="Type to search..."
            searchable
            data={userOptionsWithSelected}
            value={selectedUserId}
            onChange={(value) => {
              setSelectedUserId(value);
              const option = userOptions.find((o) => o.value === value);
              setSelectedUserOption(option ?? null);
            }}
            onSearchChange={setSearchQuery}
            searchValue={searchQuery}
            nothingFoundMessage={
              debouncedSearch.length >= 2
                ? "No users found"
                : "Type at least 2 characters"
            }
            leftSection={<IconSearch size={14} />}
          />
          <Select
            label="Floor"
            placeholder="Select floor"
            data={venues.map((v) => ({ value: v.id, label: v.name }))}
            value={selectedVenueId}
            onChange={setSelectedVenueId}
            leftSection={<IconBuilding size={14} />}
          />
          <Button
            onClick={handleAssign}
            loading={assignMutation.isPending}
            disabled={!selectedUserId || !selectedVenueId}
          >
            Assign
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

// ──────────────────────────────────────────
// InviteFloorLeadForm
// ──────────────────────────────────────────

function InviteFloorOwnerForm({ eventId, venues }: AssignFormProps) {
  const [email, setEmail] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const utils = api.useUtils();

  const mutations = useInvitationMutations({
    roleName: "floor lead",
    onCreateSuccess: () => {
      setEmail("");
      setSelectedVenueId(null);
      void utils.invitation.getAll.invalidate({ eventId });
    },
  });

  const handleInvite = () => {
    if (!email || !selectedVenueId) {
      notifications.show({
        title: "Missing fields",
        message: "Enter email and select a venue",
        color: "orange",
      });
      return;
    }
    mutations.createInvitation.mutate({
      email,
      type: "VENUE_OWNER",
      eventId,
      venueId: selectedVenueId,
    });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconMail size={18} />
          <Text fw={600}>Invite by Email</Text>
        </Group>
        <Group grow align="flex-end">
          <TextInput
            label="Email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            type="email"
          />
          <Select
            label="Floor"
            placeholder="Select floor"
            data={venues.map((v) => ({ value: v.id, label: v.name }))}
            value={selectedVenueId}
            onChange={setSelectedVenueId}
            leftSection={<IconBuilding size={14} />}
          />
          <Button
            onClick={handleInvite}
            loading={mutations.createInvitation.isPending}
            disabled={!email || !selectedVenueId}
            variant="light"
          >
            Send Invitation
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

// ──────────────────────────────────────────
// VenueOwnerCard
// ──────────────────────────────────────────

interface PendingInvitation {
  id: string;
  email: string;
  venueId: string | null;
  status: string;
}

interface VenueOwnerCardProps {
  venue: { id: string; name: string };
  owners: {
    id: string;
    user: {
      id: string;
      firstName: string | null;
      surname: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    venue: { id: string; name: string };
  }[];
  pendingInvitations: PendingInvitation[];
  eventId: string;
}

function VenueOwnerCard({
  venue,
  owners,
  pendingInvitations,
  eventId,
}: VenueOwnerCardProps) {
  const utils = api.useUtils();

  const removeMutation = api.schedule.removeVenueOwner.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Removed",
        message: "Floor lead removed",
        color: "green",
      });
      void utils.schedule.getVenueOwners.invalidate({ eventId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const invitationMutations = useInvitationMutations({
    roleName: "floor lead",
    onCancelSuccess: () => {
      void utils.invitation.getAll.invalidate({ eventId });
    },
    onResendSuccess: () => {
      void utils.invitation.getAll.invalidate({ eventId });
    },
  });

  const totalCount = owners.length + pendingInvitations.length;
  const isEmpty = totalCount === 0;

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconBuilding size={18} />
          <Text fw={600}>{venue.name}</Text>
          <Badge size="sm" variant="light">
            {owners.length} {owners.length === 1 ? "owner" : "owners"}
          </Badge>
          {pendingInvitations.length > 0 && (
            <Badge size="sm" variant="light" color="yellow">
              {pendingInvitations.length} pending
            </Badge>
          )}
        </Group>
      </Group>

      {isEmpty ? (
        <Text c="dimmed" size="sm">
          No owners assigned
        </Text>
      ) : (
        <Stack gap="xs">
          {owners.map((owner) => {
            const displayName = getDisplayName(owner.user, "Unknown");

            return (
              <Group key={owner.id} justify="space-between">
                <Group gap="sm">
                  <Avatar src={owner.user.image} size="sm" radius="xl">
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text size="sm" fw={500}>
                      {displayName}
                    </Text>
                    {owner.user.email && (
                      <Text size="xs" c="dimmed">
                        {owner.user.email}
                      </Text>
                    )}
                  </div>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    removeMutation.mutate({
                      userId: owner.user.id,
                      venueId: venue.id,
                    })
                  }
                  loading={removeMutation.isPending}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            );
          })}

          {pendingInvitations.map((invitation) => (
            <Group key={invitation.id} justify="space-between">
              <Group gap="sm">
                <Avatar size="sm" radius="xl" color="yellow">
                  <IconMail size={14} />
                </Avatar>
                <div>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {invitation.email}
                    </Text>
                    <Badge size="xs" variant="light" color="yellow">
                      Pending
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Invitation sent
                  </Text>
                </div>
              </Group>
              <Group gap={4}>
                <Tooltip label="Resend invitation">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() =>
                      invitationMutations.resendInvitation.mutate({
                        invitationId: invitation.id,
                      })
                    }
                    loading={invitationMutations.resendInvitation.isPending}
                  >
                    <IconMailForward size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Cancel invitation">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() =>
                      invitationMutations.cancelInvitation.mutate({
                        invitationId: invitation.id,
                      })
                    }
                    loading={invitationMutations.cancelInvitation.isPending}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
