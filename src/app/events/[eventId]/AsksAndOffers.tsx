"use client";

import { useState } from "react";
import {
  Card,
  Tabs,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Paper,
  ActionIcon,
  Tooltip,
  Avatar,
} from "@mantine/core";
import {
  IconHandStop,
  IconGift,
  IconPlus,
  IconTrash,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type Session } from "next-auth";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { useRouter } from "next/navigation";
import { LikeButton } from "~/app/_components/LikeButton";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { getDisplayName } from "~/utils/userDisplay";
import { CreateAskOfferModal } from "./CreateAskOfferModal";

interface AsksAndOffersProps {
  eventId: string;
  session: Session | null;
}

export function AsksAndOffers({ eventId, session }: AsksAndOffersProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>("asks");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"ASK" | "OFFER">("ASK");

  const utils = api.useUtils();

  // Fetch user's asks and offers (filtered to only their own items)
  const { data: asksData = [] } = api.askOffer.getUserAsksOffers.useQuery(
    { eventId, type: "ASK", onlyActive: true },
    { enabled: !!session },
  );

  const { data: offersData = [] } = api.askOffer.getUserAsksOffers.useQuery(
    { eventId, type: "OFFER", onlyActive: true },
    { enabled: !!session },
  );

  // Mutations
  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      void utils.askOffer.getUserAsksOffers.invalidate();
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
      void utils.askOffer.getUserAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
    },
  });

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

  const isOwnAskOffer = (userId: string) => {
    return session?.user?.id === userId;
  };

  const renderAskOfferCard = (item: (typeof asksData)[0]) => {
    const isOwn = isOwnAskOffer(item.userId);

    const handleCardClick = (e: React.MouseEvent) => {
      // Don't navigate if clicking on action buttons
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      router.push(`/events/${eventId}/asks-offers/${item.id}`);
    };

    return (
      <Paper
        key={item.id}
        p="md"
        withBorder
        style={{
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }}
        onClick={handleCardClick}
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
          {isOwn && (
            <Group gap="xs">
              <Tooltip label="Mark as fulfilled">
                <ActionIcon
                  variant="subtle"
                  color="green"
                  size="sm"
                  onClick={(e) => {
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
                    e.stopPropagation();
                    deleteMutation.mutate({ id: item.id });
                  }}
                  loading={deleteMutation.isPending}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>

        <Text fw={600} mb="xs">
          {item.title}
        </Text>
        <MarkdownRenderer content={item.description} />

        <Group gap="xs" mt="sm">
          {item.tags.map((tag, idx) => (
            <Badge key={idx} size="sm" variant="light">
              {tag}
            </Badge>
          ))}
          {isOwn && (
            <Badge size="sm" color="blue">
              Your {item.type.toLowerCase()}
            </Badge>
          )}
        </Group>

        <Group justify="flex-end" mt="sm">
          <div onClick={(e) => e.stopPropagation()}>
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

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconHandStop size={20} />
            <Text fw={600}>Your Asks & Offers</Text>
          </Group>
          <Badge variant="light">
            {asksData.length + offersData.length} total
          </Badge>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow mb="md">
            <Tabs.Tab value="asks" leftSection={<IconHandStop size={16} />}>
              Asks
              <Badge ml="xs" size="sm" variant="light">
                {asksData.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="offers" leftSection={<IconGift size={16} />}>
              Offers
              <Badge ml="xs" size="sm" variant="light">
                {offersData.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="asks">
            <Stack gap="md">
              {asksData.length === 0 ? (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No asks yet
                  </Text>
                  <Text ta="center" size="sm" c="dimmed">
                    Share what you&apos;re looking for help with
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("ASK")}
                    size="xs"
                  >
                    Add Ask
                  </Button>
                </Stack>
              ) : (
                <>
                  {asksData.slice(0, 3).map(renderAskOfferCard)}
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("ASK")}
                    variant="light"
                    size="xs"
                    fullWidth
                  >
                    Add Ask
                  </Button>
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="offers">
            <Stack gap="md">
              {offersData.length === 0 ? (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No offers yet
                  </Text>
                  <Text ta="center" size="sm" c="dimmed">
                    Share what you can help others with
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("OFFER")}
                    size="xs"
                  >
                    Add Offer
                  </Button>
                </Stack>
              ) : (
                <>
                  {offersData.slice(0, 3).map(renderAskOfferCard)}
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("OFFER")}
                    variant="light"
                    size="xs"
                    fullWidth
                  >
                    Add Offer
                  </Button>
                </>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      <CreateAskOfferModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
      />
    </>
  );
}
