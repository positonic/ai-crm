"use client";

import {
  Modal,
  Stack,
  Card,
  Group,
  Avatar,
  Text,
  ActionIcon,
  ScrollArea,
  Loader,
  Alert,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconExternalLink } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import CategoryFilter from "../coins/CategoryFilter";
import { useState } from "react";

interface AddLeadPanelProps {
  opened: boolean;
  onClose: () => void;
  onAddSponsor: (sponsorId: string) => void;
  isAddingLead?: boolean;
  existingSponsorIds?: string[];
}

export default function AddLeadPanel({
  opened,
  onClose,
  onAddSponsor,
  isAddingLead = false,
  existingSponsorIds = [],
}: AddLeadPanelProps) {
  const {
    data: sponsors,
    isLoading,
    error,
  } = api.sponsor.getSponsors.useQuery();

  const categories = [
    { id: "layer-1", name: "layer-1", _count: { geckoCoins: 0, sponsors: 0 } },
    { id: "layer-2", name: "layer-2", _count: { geckoCoins: 0, sponsors: 0 } },
  ];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Filter out sponsors that are already added to the event
  let availableSponsors =
    sponsors?.filter((sponsor) => !existingSponsorIds.includes(sponsor.id)) ??
    [];
  if (selectedCategory) {
    availableSponsors = availableSponsors.filter((sponsor) =>
      sponsor.categories?.some(
        (catObj: { category?: { name?: string } }) =>
          catObj.category?.name === selectedCategory,
      ),
    );
  }
  if (search.trim()) {
    const searchLower = search.trim().toLowerCase();
    availableSponsors = availableSponsors.filter(
      (sponsor) =>
        sponsor.name.toLowerCase().includes(searchLower) ||
        sponsor.websiteUrl?.toLowerCase().includes(searchLower),
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Lead"
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search sponsors by name or website..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Text size="sm" c="dimmed">
          Select a sponsor to add as a lead for this event
        </Text>

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {isLoading && (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text>Loading sponsors...</Text>
          </Group>
        )}

        {error && (
          <Alert color="red" title="Error loading sponsors">
            {error.message}
          </Alert>
        )}

        {sponsors && (
          <ScrollArea h={400} type="auto">
            <Stack gap="sm">
              {availableSponsors.map((sponsor) => (
                <Card
                  key={sponsor.id}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                >
                  <Group justify="space-between">
                    <Group>
                      <Avatar
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        radius="xl"
                      >
                        {sponsor.name[0]?.toUpperCase()}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={500}>{sponsor.name}</Text>
                        {sponsor.websiteUrl && (
                          <Text
                            size="xs"
                            c="dimmed"
                            component="a"
                            href={sponsor.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            <Group gap={4}>
                              {sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                              <IconExternalLink size={12} />
                            </Group>
                          </Text>
                        )}
                        {sponsor.contacts.length > 0 && (
                          <Text size="xs" c="dimmed">
                            {sponsor.contacts.length} contact
                            {sponsor.contacts.length !== 1 ? "s" : ""}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                    <ActionIcon
                      variant="filled"
                      color="blue"
                      size="lg"
                      radius="xl"
                      disabled={isAddingLead}
                      onClick={() => {
                        onAddSponsor(sponsor.id);
                      }}
                    >
                      {isAddingLead ? (
                        <Loader size={16} color="white" />
                      ) : (
                        <IconPlus size={16} />
                      )}
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}

        {sponsors && availableSponsors.length === 0 && (
          <Text ta="center" c="dimmed" p="xl">
            {sponsors.length === 0
              ? "No sponsors found. Add some sponsors first to use this feature."
              : "All available sponsors are already added to this event."}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
