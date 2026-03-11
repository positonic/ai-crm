"use client";

import { useState } from "react";
import {
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Title,
  Loader,
  Center,
  Container,
  SimpleGrid,
  Tabs,
  Avatar,
  ActionIcon,
  Tooltip,
  Button,
  Modal,
  Select,
} from "@mantine/core";
import {
  IconHandStop,
  IconGift,
  IconCheck,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";
import { CreateAskOfferModal } from "~/app/events/[eventId]/CreateAskOfferModal";

export default function AsksOffersClient() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  // Modal state
  const [eventSelectModalOpen, setEventSelectModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<"ASK" | "OFFER">("ASK");

  // Fetch available events for the dropdown
  const { data: availableEvents, isLoading: loadingEvents } =
    api.event.getAvailableEvents.useQuery();

  // Fetch all asks and offers
  const { data: asksData = [], isLoading: asksLoading } =
    api.askOffer.getAllAsksOffers.useQuery({
      type: "ASK",
      onlyActive: true,
    });

  const { data: offersData = [], isLoading: offersLoading } =
    api.askOffer.getAllAsksOffers.useQuery({
      type: "OFFER",
      onlyActive: true,
    });

  // Mutations for asks/offers
  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      void utils.askOffer.getAllAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: () => {
      void utils.askOffer.getAllAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
    },
  });

  const isOwnAskOffer = (userId: string) => {
    return session?.user?.id === userId;
  };

  const renderAskOfferCard = (
    item: (typeof asksData)[0],
    type: "ASK" | "OFFER",
  ) => {
    const isOwn = isOwnAskOffer(item.userId);

    return (
      <Paper
        key={item.id}
        p="md"
        withBorder
        component={Link}
        href={
          item.eventId
            ? `/events/${item.eventId}/asks-offers/${item.id}`
            : `/community/asks-offers/${item.id}`
        }
        style={{
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <Group justify="space-between" align="flex-start" mb="xs">
          <Group gap="sm">
            <Avatar
              src={getAvatarUrl({
                customAvatarUrl: item.user.profile?.avatarUrl,
                oauthImageUrl: item.user.image,
                name: item.user.name,
                email: item.user.email,
              })}
              alt={item.user.name ?? "User"}
              size="sm"
              radius="xl"
            >
              {getAvatarInitials({
                name: item.user.name,
                email: item.user.email,
              })}
            </Avatar>
            <div>
              <Text fw={500} size="sm">
                {getDisplayName(item.user, "Unknown")}
              </Text>
              {item.user.profile?.jobTitle && (
                <Text size="xs" c="dimmed">
                  {item.user.profile.jobTitle}
                  {item.user.profile.company &&
                    ` at ${item.user.profile.company}`}
                </Text>
              )}
            </div>
          </Group>
          <Group gap="xs">
            <Badge
              size="sm"
              color={type === "ASK" ? "orange" : "blue"}
              variant="light"
            >
              {type === "ASK" ? "Ask" : "Offer"}
            </Badge>
            {item.event && (
              <Badge size="xs" variant="outline" color="gray">
                {item.event.name}
              </Badge>
            )}
            {isOwn && (
              <>
                <Tooltip label="Mark as fulfilled">
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markFulfilledMutation.mutate({ id: item.id });
                    }}
                    loading={markFulfilledMutation.isPending}
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteMutation.mutate({ id: item.id });
                    }}
                    loading={deleteMutation.isPending}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
        </Group>

        <Text fw={600} mb="xs">
          {item.title}
        </Text>
        <MarkdownRenderer content={item.description} />

        {item.tags.length > 0 && (
          <Group gap="xs" mt="sm">
            {item.tags.map((tag, idx) => (
              <Badge key={idx} size="sm" variant="light">
                {tag}
              </Badge>
            ))}
          </Group>
        )}

        <Group justify="flex-end" mt="sm">
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <LikeButton
              updateId={item.id}
              initialLikeCount={item.likes.length}
              initialHasLiked={
                session?.user
                  ? item.likes.some((like) => like.userId === session.user.id)
                  : false
              }
              userId={session?.user?.id}
              likeType="askOffer"
            />
          </div>
        </Group>
      </Paper>
    );
  };

  const allAsksOffers = [
    ...asksData.map((ask) => ({ ...ask, itemType: "ASK" as const })),
    ...offersData.map((offer) => ({ ...offer, itemType: "OFFER" as const })),
  ].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isLoading = asksLoading || offersLoading;

  // Handlers for create flow
  const handleOpenCreateModal = (type: "ASK" | "OFFER") => {
    setCreateType(type);
    setSelectedEventId(null);
    setEventSelectModalOpen(true);
  };

  const handleEventSelect = (eventId: string | null) => {
    setSelectedEventId(eventId);
    setEventSelectModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleSkipEvent = () => {
    setSelectedEventId(null);
    setEventSelectModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setCreateModalOpen(false);
    setSelectedEventId(null);
  };

  const handleCreateSuccess = () => {
    void utils.askOffer.getAllAsksOffers.invalidate();
  };

  // Format events for the select dropdown
  const eventOptions =
    availableEvents?.map((event) => ({
      value: event.id,
      label: event.name,
    })) ?? [];

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2}>Asks & Offers</Title>
            <Text c="dimmed">
              Browse asks and offers from across all events
            </Text>
          </Stack>
          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              color="orange"
              onClick={() => handleOpenCreateModal("ASK")}
            >
              Create Ask
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              color="blue"
              onClick={() => handleOpenCreateModal("OFFER")}
            >
              Create Offer
            </Button>
          </Group>
        </Group>

        {/* Tabs for filtering */}
        <Tabs defaultValue="all">
          <Group justify="space-between" align="flex-start" mb="md">
            <Tabs.List>
              <Tabs.Tab value="all" leftSection={<IconHandStop size={16} />}>
                All
                <Badge ml="xs" size="sm" variant="light">
                  {allAsksOffers.length}
                </Badge>
              </Tabs.Tab>
              <Tabs.Tab value="asks" leftSection={<IconHandStop size={16} />}>
                Asks
                <Badge ml="xs" size="sm" variant="light" color="orange">
                  {asksData.length}
                </Badge>
              </Tabs.Tab>
              <Tabs.Tab value="offers" leftSection={<IconGift size={16} />}>
                Offers
                <Badge ml="xs" size="sm" variant="light" color="blue">
                  {offersData.length}
                </Badge>
              </Tabs.Tab>
            </Tabs.List>
          </Group>

          <Tabs.Panel value="all" pt="lg">
            {allAsksOffers.length === 0 ? (
              <Stack align="center" gap="md" py="xl">
                <Text ta="center" c="dimmed">
                  No asks or offers yet
                </Text>
                <Text ta="center" size="sm" c="dimmed">
                  Visit an event page to add asks and offers
                </Text>
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {allAsksOffers.map((item) =>
                  renderAskOfferCard(item, item.itemType),
                )}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="asks" pt="lg">
            {asksData.length === 0 ? (
              <Stack align="center" gap="md" py="xl">
                <Text ta="center" c="dimmed">
                  No asks yet
                </Text>
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {asksData.map((item) => renderAskOfferCard(item, "ASK"))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="offers" pt="lg">
            {offersData.length === 0 ? (
              <Stack align="center" gap="md" py="xl">
                <Text ta="center" c="dimmed">
                  No offers yet
                </Text>
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {offersData.map((item) => renderAskOfferCard(item, "OFFER"))}
              </SimpleGrid>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Event Selection Modal */}
      <Modal
        opened={eventSelectModalOpen}
        onClose={() => setEventSelectModalOpen(false)}
        title={`Select Event for ${createType === "ASK" ? "Ask" : "Offer"}`}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Optionally associate this {createType.toLowerCase()} with an event,
            or create it as a community-wide post:
          </Text>
          <Select
            label="Event (Optional)"
            placeholder="Select an event"
            data={eventOptions}
            value={selectedEventId}
            onChange={handleEventSelect}
            searchable
            clearable
            disabled={loadingEvents}
            nothingFoundMessage="No events available"
          />
          <Button variant="light" onClick={handleSkipEvent} fullWidth>
            Continue without event (community-wide)
          </Button>
        </Stack>
      </Modal>

      {/* Create Ask/Offer Modal */}
      <CreateAskOfferModal
        eventId={selectedEventId}
        isOpen={createModalOpen}
        onClose={handleCreateModalClose}
        initialType={createType}
        onSuccess={handleCreateSuccess}
      />
    </Container>
  );
}
