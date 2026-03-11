"use client";

import { useState } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  Paper,
  ActionIcon,
  Tooltip,
  Avatar,
  Tabs,
  SimpleGrid,
  Button,
} from "@mantine/core";
import {
  IconHandStop,
  IconGift,
  IconCheck,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type Session } from "next-auth";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { LikeButton } from "~/app/_components/LikeButton";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import Link from "next/link";
import { getDisplayName } from "~/utils/userDisplay";
import { CreateAskOfferModal } from "./CreateAskOfferModal";

interface AsksOffersTabProps {
  eventId: string;
  session: Session | null;
}

export function AsksOffersTab({ eventId, session }: AsksOffersTabProps) {
  const [activeTab, setActiveTab] = useState<string | null>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"ASK" | "OFFER">("ASK");

  const utils = api.useUtils();

  // Fetch all asks and offers (not filtered by active)
  const { data: asksData = [] } = api.askOffer.getEventAsksOffers.useQuery({
    eventId,
    type: "ASK",
    onlyActive: true,
  });

  const { data: offersData = [] } = api.askOffer.getEventAsksOffers.useQuery({
    eventId,
    type: "OFFER",
    onlyActive: true,
  });

  // Mutations
  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
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

  const handleOpenModal = (type: "ASK" | "OFFER") => {
    if (!session) {
      notifications.show({
        title: "Not Logged In",
        message: "Please log in to create asks and offers",
        color: "red",
      });
      return;
    }
    setModalType(type);
    setIsModalOpen(true);
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
        href={`/events/${eventId}/asks-offers/${item.id}`}
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

  const allItems = [
    ...asksData.map((ask) => ({ ...ask, itemType: "ASK" as const })),
    ...offersData.map((offer) => ({ ...offer, itemType: "OFFER" as const })),
  ].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Group justify="space-between" align="flex-start" mb="md">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<IconHandStop size={16} />}>
              All
              <Badge ml="xs" size="sm" variant="light">
                {allItems.length}
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

          {session && (
            <Group gap="sm">
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenModal("ASK")}
                size="sm"
                variant="light"
                color="orange"
              >
                Add Ask
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenModal("OFFER")}
                size="sm"
                variant="light"
                color="blue"
              >
                Add Offer
              </Button>
            </Group>
          )}
        </Group>

        <Tabs.Panel value="all" pt="lg">
          {allItems.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <Text ta="center" c="dimmed">
                No asks or offers yet
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                Be the first to add an ask or offer to the community
              </Text>
              {session && (
                <Group gap="sm">
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("ASK")}
                    size="sm"
                    color="orange"
                  >
                    Add Ask
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("OFFER")}
                    size="sm"
                    color="blue"
                  >
                    Add Offer
                  </Button>
                </Group>
              )}
            </Stack>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {allItems.map((item) => renderAskOfferCard(item, item.itemType))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="asks" pt="lg">
          {asksData.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <Text ta="center" c="dimmed">
                No asks yet
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                Be the first to share what you&apos;re looking for help with
              </Text>
              {session && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => handleOpenModal("ASK")}
                  size="sm"
                  color="orange"
                >
                  Add Ask
                </Button>
              )}
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
              <Text ta="center" size="sm" c="dimmed">
                Be the first to share what you can help others with
              </Text>
              {session && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => handleOpenModal("OFFER")}
                  size="sm"
                  color="blue"
                >
                  Add Offer
                </Button>
              )}
            </Stack>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {offersData.map((item) => renderAskOfferCard(item, "OFFER"))}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>

      <CreateAskOfferModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
      />
    </>
  );
}
