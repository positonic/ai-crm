"use client";

import { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import {
  Text,
  Avatar,
  Group,
  ActionIcon,
  Checkbox,
  Menu,
  Button,
  Box,
  Loader,
  Center,
  Modal,
  TextInput,
  Stack,
  Select,
} from "@mantine/core";
import {
  IconChevronDown,
  IconSettings,
  IconDownload,
  IconUpload,
  IconPlus,
  IconFilter,
  IconArrowsSort,
  IconListDetails,
  IconMail,
  IconSearch,
  IconUser,
  IconFolder,
  IconX,
  IconBrandTelegram,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  github?: string | null;
  about?: string | null;
  skills?: string[];
  sponsor?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  } | null;
}

// Connection strength calculation based on communication history
type ConnectionStrength =
  | "very_strong"
  | "strong"
  | "good"
  | "weak"
  | "very_weak";

function getConnectionStrength(contact: Contact): ConnectionStrength {
  // Simple heuristic based on available data
  let score = 0;
  if (contact.email) score += 1;
  if (contact.phone) score += 1;
  if (contact.telegram) score += 2;
  if (contact.linkedIn) score += 1;
  if (contact.twitter) score += 1;
  if (contact.github) score += 1;
  if (contact.sponsor) score += 1;

  if (score >= 6) return "very_strong";
  if (score >= 4) return "strong";
  if (score >= 3) return "good";
  if (score >= 2) return "weak";
  return "very_weak";
}

function ConnectionStrengthBadge({
  strength,
}: {
  strength: ConnectionStrength;
}) {
  const config = {
    very_strong: { color: "#22c55e", label: "Very strong" },
    strong: { color: "#3b82f6", label: "Strong" },
    good: { color: "#22c55e", label: "Good" },
    weak: { color: "#f59e0b", label: "Weak" },
    very_weak: { color: "#ef4444", label: "Very weak" },
  };

  const { color, label } = config[strength];

  return (
    <Group gap={6}>
      <Box
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [addToListModalOpened, setAddToListModalOpened] = useState(false);
  const [createListView, setCreateListView] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListObjectType, setNewListObjectType] = useState<string | null>(
    "people",
  );

  const { data: contacts, isLoading } = api.contact.getContacts.useQuery();

  // Sort contacts alphabetically by name
  const sortedContacts = useMemo(() => {
    if (!contacts) return [];
    return [...contacts].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [contacts]);

  // Checkbox handlers
  const handleSelectContact = useCallback(
    (contactId: string, checked: boolean) => {
      setSelectedContactIds((prev) =>
        checked ? [...prev, contactId] : prev.filter((id) => id !== contactId),
      );
    },
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedContactIds(
        checked ? (sortedContacts?.map((c) => c.id) ?? []) : [],
      );
    },
    [sortedContacts],
  );

  const isAllSelected = useMemo(
    () =>
      sortedContacts &&
      sortedContacts.length > 0 &&
      selectedContactIds.length === sortedContacts.length,
    [sortedContacts, selectedContactIds],
  );

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/crm/contacts");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--crm-bg)",
      }}
    >
      {/* Header Bar */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--crm-sidebar-border)",
          background: "var(--crm-sidebar-bg)",
        }}
      >
        <Group justify="space-between">
          <Group gap="md">
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={
                    <Box
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background:
                          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      }}
                    />
                  }
                  rightSection={<IconChevronDown size={14} />}
                  styles={{
                    root: {
                      color: "var(--crm-sidebar-text-active)",
                      fontWeight: 500,
                    },
                  }}
                >
                  Recently Contacted People
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>All People</Menu.Item>
                <Menu.Item>Recently Contacted People</Menu.Item>
                <Menu.Item>Recently Created</Menu.Item>
                <Menu.Divider />
                <Menu.Item>Create new list...</Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconSettings size={14} />}
              rightSection={<IconChevronDown size={14} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                },
              }}
            >
              View settings
            </Button>
          </Group>

          <Group gap="sm">
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  leftSection={<IconDownload size={14} />}
                  rightSection={<IconChevronDown size={14} />}
                  styles={{
                    root: {
                      color: "var(--crm-sidebar-text)",
                    },
                  }}
                >
                  Import / Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconUpload size={14} />}>
                  Import contacts
                </Menu.Item>
                <Menu.Item leftSection={<IconDownload size={14} />}>
                  Export contacts
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Button
              component={Link}
              href="/crm/contacts/new"
              size="sm"
              leftSection={<IconPlus size={14} />}
            >
              New Person
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Toolbar */}
      <Box
        px="md"
        py="xs"
        style={{
          borderBottom: "1px solid var(--crm-sidebar-border)",
          background: "var(--crm-sidebar-bg)",
        }}
      >
        <Group gap="md">
          <Group gap={6}>
            <IconArrowsSort
              size={14}
              style={{ color: "var(--crm-sidebar-text)" }}
            />
            <Text size="sm" c="dimmed">
              Sorted by
            </Text>
            <Text
              size="sm"
              fw={500}
              style={{ color: "var(--crm-sidebar-text-active)" }}
            >
              Last email interaction
            </Text>
          </Group>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconFilter size={14} />}
            styles={{
              root: {
                color: "var(--crm-sidebar-text)",
              },
            }}
          >
            Filter
          </Button>
        </Group>
      </Box>

      {/* Table */}
      <Box style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--crm-sidebar-border)",
                background: "var(--crm-sidebar-bg)",
              }}
            >
              <th
                style={{ padding: "10px 16px", width: 40, textAlign: "left" }}
              >
                <Checkbox
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                  aria-label="Select all contacts"
                  size="sm"
                />
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left" }}>
                <Group gap={4}>
                  <Text size="sm" fw={500} c="dimmed">
                    Person
                  </Text>
                  <ActionIcon variant="subtle" size="xs" color="gray">
                    <IconPlus size={12} />
                  </ActionIcon>
                </Group>
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left" }}>
                <Group gap={4}>
                  <Box
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid var(--crm-sidebar-text)",
                      opacity: 0.5,
                    }}
                  />
                  <Text size="sm" fw={500} c="dimmed">
                    Connection stren...
                  </Text>
                </Group>
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left" }}>
                <Group gap={4}>
                  <Box
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      border: "1px solid var(--crm-sidebar-text)",
                      opacity: 0.5,
                    }}
                  />
                  <Text size="sm" fw={500} c="dimmed">
                    Last email interaction
                  </Text>
                </Group>
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left" }}>
                <Group gap={4}>
                  <Box
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      border: "1px solid var(--crm-sidebar-text)",
                      opacity: 0.5,
                    }}
                  />
                  <Text size="sm" fw={500} c="dimmed">
                    Last calendar interaction
                  </Text>
                </Group>
              </th>
              <th style={{ padding: "10px 16px", textAlign: "left" }}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconPlus size={12} />}
                  styles={{
                    root: {
                      color: "var(--crm-sidebar-text)",
                      fontWeight: 400,
                    },
                  }}
                >
                  Add column
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedContacts.map((contact) => {
              const connectionStrength = getConnectionStrength(contact);

              return (
                <tr
                  key={contact.id}
                  className="crm-table-row"
                  style={{
                    borderBottom: "1px solid var(--crm-sidebar-border)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    window.location.href = `/crm/contacts/${contact.id}`;
                  }}
                >
                  <td
                    style={{ padding: "10px 16px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedContactIds.includes(contact.id)}
                      onChange={(e) =>
                        handleSelectContact(contact.id, e.currentTarget.checked)
                      }
                      aria-label={`Select ${contact.firstName} ${contact.lastName}`}
                      size="sm"
                    />
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Group gap="sm">
                      <Avatar size="sm" color="blue" radius="xl">
                        {contact.firstName?.[0]?.toUpperCase()}
                      </Avatar>
                      <Text
                        size="sm"
                        style={{ color: "var(--crm-sidebar-text-active)" }}
                      >
                        {contact.firstName} {contact.lastName}
                      </Text>
                    </Group>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <ConnectionStrengthBadge strength={connectionStrength} />
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Text size="sm" c="dimmed">
                      about 1 month ago
                    </Text>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Text size="sm" c="dimmed">
                      No contact
                    </Text>
                  </td>
                  <td style={{ padding: "10px 16px" }}></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {/* Footer */}
      <Box
        px="md"
        py="sm"
        style={{
          borderTop: "1px solid var(--crm-sidebar-border)",
          background: "var(--crm-sidebar-bg)",
        }}
      >
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {sortedContacts.length.toLocaleString()} count
          </Text>
          <Group gap="xl">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconPlus size={12} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                  fontWeight: 400,
                },
              }}
            >
              Add calculation
            </Button>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconPlus size={12} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                  fontWeight: 400,
                },
              }}
            >
              Add calculation
            </Button>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconPlus size={12} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                  fontWeight: 400,
                },
              }}
            >
              Add calculation
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Floating Selection Bar */}
      {selectedContactIds.length > 0 && (
        <Box
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--crm-sidebar-bg)",
            border: "1px solid var(--crm-sidebar-border)",
            borderRadius: 8,
            padding: "8px 16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 100,
          }}
        >
          <Group gap="md">
            <Group gap="xs">
              <Text
                size="sm"
                fw={500}
                style={{ color: "var(--crm-sidebar-text-active)" }}
              >
                {selectedContactIds.length} selected
              </Text>
              <ActionIcon
                variant="subtle"
                size="xs"
                color="gray"
                onClick={() => setSelectedContactIds([])}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
            <Box
              style={{
                width: 1,
                height: 20,
                background: "var(--crm-sidebar-border)",
              }}
            />
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconListDetails size={14} />}
              onClick={() => setAddToListModalOpened(true)}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                },
              }}
            >
              Add to list
            </Button>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconMail size={14} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                },
              }}
            >
              Send email
            </Button>
            <Button
              component={Link}
              href={`/crm/communicate?contacts=${selectedContactIds.join(",")}`}
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconBrandTelegram size={14} />}
              styles={{
                root: {
                  color: "var(--crm-sidebar-text)",
                },
              }}
            >
              Send Telegram
            </Button>
          </Group>
        </Box>
      )}

      {/* Add to List Modal */}
      <Modal
        opened={addToListModalOpened}
        onClose={() => {
          setAddToListModalOpened(false);
          setCreateListView(false);
          setListSearchQuery("");
          setNewListName("");
        }}
        title={createListView ? "Start from scratch" : "Choose list"}
        size="md"
        centered
      >
        {createListView ? (
          /* Create New List View */
          <Stack gap="md">
            <Select
              label="Object"
              value={newListObjectType}
              onChange={setNewListObjectType}
              data={[
                { value: "people", label: "People" },
                { value: "organizations", label: "Organizations" },
                { value: "deals", label: "Deals" },
              ]}
              leftSection={<IconUser size={14} />}
            />
            <TextInput
              label="List name"
              placeholder="Enter list name..."
              value={newListName}
              onChange={(e) => setNewListName(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setCreateListView(false)}
              >
                Back
              </Button>
              <Button
                disabled={!newListName.trim()}
                onClick={() => {
                  // TODO: Create list in database
                  setCreateListView(false);
                  setNewListName("");
                }}
              >
                Create list
              </Button>
            </Group>
          </Stack>
        ) : (
          /* Choose List View */
          <Stack gap="md">
            <TextInput
              placeholder="Search lists..."
              leftSection={<IconSearch size={14} />}
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.currentTarget.value)}
              rightSection={
                listSearchQuery ? (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => setListSearchQuery("")}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                ) : null
              }
            />

            {/* Empty State */}
            <Box
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "var(--crm-sidebar-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <IconFolder
                  size={24}
                  style={{ color: "var(--crm-sidebar-text)", opacity: 0.5 }}
                />
              </Box>
              <Text size="sm" c="dimmed">
                No lists found
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Create a new list to organize your contacts
              </Text>
            </Box>

            {/* Create New List Button */}
            <Button
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreateListView(true)}
              fullWidth
            >
              Create new list
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
