"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Select,
  Modal,
  Table,
  ActionIcon,
  Paper,
  Avatar,
  Loader,
  SimpleGrid,
  Tooltip,
  Menu,
  Textarea,
  MultiSelect,
  Switch,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconSearch,
  IconUserPlus,
  IconEye,
  IconX,
  IconEdit,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

const ADMIN_LABEL_OPTIONS = [
  "AI / ML expert",
  "Designer",
  "Developer",
  "Entrepreneur",
  "Lawyer",
  "Non-Technical",
  "Project manager",
  "REFI",
  "Regen",
  "Researcher",
  "Scientist",
  "Woman",
  "Writer",
  "ZK",
] as const;

type AdminLabel = (typeof ADMIN_LABEL_OPTIONS)[number];

interface AssignRoleForm {
  userId: string;
  eventId: string;
  roleId: string;
}

interface EditUserForm {
  userId: string;
  firstName: string;
  surname: string;
  email: string;
  role: string;
  isAIReviewer: boolean;
  adminNotes: string;
  adminLabels: AdminLabel[];
  adminWorkExperience: string;
}

export default function UsersClient() {
  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [filterRoleId, setFilterRoleId] = useState<string>("");

  // Debounce search term to avoid excessive queries
  const [debouncedSearch] = useDebouncedValue(searchTerm, 300);

  // API queries
  const {
    data: users,
    refetch: refetchUsers,
    isLoading: loadingUsers,
    isFetching,
  } = api.role.getAllUsersWithEventRoles.useQuery(
    {
      search: debouncedSearch || undefined,
      eventId: filterEventId || undefined,
      roleId: filterRoleId || undefined,
    },
    {
      // Keep previous data while fetching new results to prevent UI flash
      placeholderData: (previousData) => previousData,
    },
  );

  const { data: userStats } = api.role.getUserStats.useQuery();
  const { data: events } = api.event.getEvents.useQuery();
  const { data: roles } = api.invitation.getAvailableRoles.useQuery();
  const { data: userDetails } = api.role.getUserDetails.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId && userDetailModalOpen },
  );

  // API mutations
  const assignEventRole = api.role.assignEventRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Role assigned successfully",
        color: "green",
      });
      setAssignRoleModalOpen(false);
      assignRoleForm.reset();
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeEventRole = api.role.removeEventRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Role removed successfully",
        color: "blue",
      });
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const updateGlobalRole = api.role.updateUserGlobalRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "User role updated successfully",
        color: "green",
      });
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Forms
  const assignRoleForm = useForm<AssignRoleForm>({
    initialValues: {
      userId: "",
      eventId: "",
      roleId: "",
    },
    validate: {
      userId: (value) => (value ? null : "User is required"),
      eventId: (value) => (value ? null : "Event is required"),
      roleId: (value) => (value ? null : "Role is required"),
    },
  });

  const adminUpdateUser = api.user.adminUpdateUser.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "User updated successfully",
        color: "green",
      });
      setEditUserModalOpen(false);
      editUserForm.reset();
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const editUserForm = useForm<EditUserForm>({
    initialValues: {
      userId: "",
      firstName: "",
      surname: "",
      email: "",
      role: "user",
      isAIReviewer: false,
      adminNotes: "",
      adminLabels: [],
      adminWorkExperience: "",
    },
    validate: {
      email: (value) =>
        /^\S+@\S+\.\S+$/.test(value) ? null : "Invalid email address",
    },
  });

  const handleAssignRole = (values: AssignRoleForm) => {
    assignEventRole.mutate(values);
  };

  const handleRemoveRole = (
    userId: string,
    eventId: string,
    roleId: string,
  ) => {
    removeEventRole.mutate({ userId, eventId, roleId });
  };

  const handleUpdateGlobalRole = (
    userId: string,
    newRole: "user" | "staff" | "admin",
  ) => {
    updateGlobalRole.mutate({ userId, newRole });
  };

  const openUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setUserDetailModalOpen(true);
  };

  const openEditUser = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    if (!user) return;
    editUserForm.setValues({
      userId: user.id,
      firstName: user.firstName ?? "",
      surname: user.surname ?? "",
      email: user.email ?? "",
      role: user.role ?? "user",
      isAIReviewer: user.isAIReviewer ?? false,
      adminNotes: user.adminNotes ?? "",
      adminLabels: (user.adminLabels ?? []) as AdminLabel[],
      adminWorkExperience: user.adminWorkExperience ?? "",
    });
    setEditUserModalOpen(true);
  };

  const handleEditUser = (values: EditUserForm) => {
    adminUpdateUser.mutate({
      userId: values.userId,
      firstName: values.firstName,
      surname: values.surname,
      email: values.email,
      role: values.role as "user" | "staff" | "admin",
      isAIReviewer: values.isAIReviewer,
      adminNotes: values.adminNotes || null,
      adminLabels: values.adminLabels,
      adminWorkExperience: values.adminWorkExperience || null,
    });
  };

  const getGlobalRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "red";
      case "staff":
        return "orange";
      default:
        return "blue";
    }
  };

  // Only show full-page loader on initial load (no data yet)
  if (loadingUsers && !users) {
    return (
      <Group justify="center" py="xl">
        <Loader size="xl" />
      </Group>
    );
  }

  return (
    <>
      {/* Action Buttons */}
      <Group justify="flex-end" mb="xl">
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => setAssignRoleModalOpen(true)}
        >
          Assign Role
        </Button>
      </Group>

      {/* Statistics */}
      {userStats && (
        <SimpleGrid cols={{ base: 2, sm: 5 }} mb="xl">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700}>
                {userStats.total}
              </Text>
              <Text size="sm" c="dimmed">
                Total Users
              </Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="red">
                {userStats.admins}
              </Text>
              <Text size="sm" c="dimmed">
                Admins
              </Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="orange">
                {userStats.staff}
              </Text>
              <Text size="sm" c="dimmed">
                Staff
              </Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="blue">
                {userStats.users}
              </Text>
              <Text size="sm" c="dimmed">
                Regular Users
              </Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="green">
                {userStats.usersWithEventRoles}
              </Text>
              <Text size="sm" c="dimmed">
                With Event Roles
              </Text>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Card withBorder mb="xl">
        <Group>
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            rightSection={isFetching ? <Loader size={14} /> : null}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by event"
            value={filterEventId}
            onChange={(value) => setFilterEventId(value ?? "")}
            data={
              events?.map((event) => ({
                value: event.id,
                label: event.name,
              })) ?? []
            }
            clearable
            style={{ minWidth: 200 }}
          />
          <Select
            placeholder="Filter by role"
            value={filterRoleId}
            onChange={(value) => setFilterRoleId(value ?? "")}
            data={
              roles?.map((role) => ({ value: role.id, label: role.name })) ?? []
            }
            clearable
            style={{ minWidth: 150 }}
          />
        </Group>
      </Card>

      {/* Users Table */}
      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Global Role</Table.Th>
              <Table.Th>Event Roles</Table.Th>
              <Table.Th>Applications</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users?.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Group>
                    <Avatar src={user.image} size="sm" radius="xl">
                      {user.name?.[0] ?? user.email?.[0]}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {getDisplayName(user, "No name")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                      {user.emailVerified && (
                        <Badge size="xs" color="green" variant="dot">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Badge
                        color={getGlobalRoleBadgeColor(user.role ?? "user")}
                        variant="light"
                        style={{ cursor: "pointer" }}
                      >
                        {(user.role ?? "user").toUpperCase()}
                      </Badge>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Change Global Role</Menu.Label>
                      <Menu.Item
                        onClick={() => handleUpdateGlobalRole(user.id, "user")}
                        disabled={user.role === "user"}
                      >
                        User
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => handleUpdateGlobalRole(user.id, "staff")}
                        disabled={user.role === "staff"}
                      >
                        Staff
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => handleUpdateGlobalRole(user.id, "admin")}
                        disabled={user.role === "admin"}
                      >
                        Admin
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {user.userRoles.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        No roles
                      </Text>
                    ) : (
                      user.userRoles.slice(0, 2).map((userRole) => (
                        <Tooltip
                          key={`${userRole.event.id}-${userRole.role.id}`}
                          label={`${userRole.role.name} for ${userRole.event.name}`}
                        >
                          <Badge
                            size="xs"
                            variant="light"
                            color="blue"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              handleRemoveRole(
                                user.id,
                                userRole.event.id,
                                userRole.role.id,
                              )
                            }
                          >
                            {userRole.role.name}
                          </Badge>
                        </Tooltip>
                      ))
                    )}
                    {user.userRoles.length > 2 && (
                      <Badge size="xs" variant="light" color="gray">
                        +{user.userRoles.length - 2}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {user._count.applications} applications
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="sm"
                      onClick={() => openUserDetail(user.id)}
                      title="View details"
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="yellow"
                      size="sm"
                      onClick={() => openEditUser(user.id)}
                      title="Edit user"
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="sm"
                      onClick={() => {
                        assignRoleForm.setValues({
                          ...assignRoleForm.values,
                          userId: user.id,
                        });
                        setAssignRoleModalOpen(true);
                      }}
                      title="Assign role"
                    >
                      <IconUserPlus size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {users?.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No users found matching your criteria.
          </Text>
        )}
      </Card>

      {/* Assign Role Modal */}
      <Modal
        opened={assignRoleModalOpen}
        onClose={() => setAssignRoleModalOpen(false)}
        title="Assign Role"
        size="md"
      >
        <Stack>
          <Select
            label="User"
            placeholder="Select a user"
            data={
              users?.map((user) => ({
                value: user.id,
                label: `${getDisplayName(user)} (${user.email})`,
              })) ?? []
            }
            value={assignRoleForm.values.userId}
            onChange={(value) =>
              assignRoleForm.setFieldValue("userId", value ?? "")
            }
            searchable
          />

          {/* Global Role Section */}
          <Paper withBorder p="md" radius="md">
            <Text fw={500} mb="sm">
              Global Role
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Set the user&apos;s platform-wide permissions
            </Text>
            <Group>
              {(["user", "staff", "admin"] as const).map((role) => {
                const selectedUser = users?.find(
                  (u) => u.id === assignRoleForm.values.userId,
                );
                const isCurrentRole = selectedUser?.role === role;
                return (
                  <Button
                    key={role}
                    variant={isCurrentRole ? "filled" : "light"}
                    color={
                      role === "admin"
                        ? "red"
                        : role === "staff"
                          ? "orange"
                          : "blue"
                    }
                    size="sm"
                    disabled={!assignRoleForm.values.userId || isCurrentRole}
                    loading={updateGlobalRole.isPending}
                    onClick={() => {
                      if (assignRoleForm.values.userId) {
                        handleUpdateGlobalRole(
                          assignRoleForm.values.userId,
                          role,
                        );
                      }
                    }}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                );
              })}
            </Group>
          </Paper>

          {/* Event Role Section */}
          <Paper withBorder p="md" radius="md">
            <Text fw={500} mb="sm">
              Event Role
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Assign a role for a specific event
            </Text>
            <form onSubmit={assignRoleForm.onSubmit(handleAssignRole)}>
              <Stack>
                <Select
                  label="Event"
                  placeholder="Select an event"
                  data={
                    events?.map((event) => ({
                      value: event.id,
                      label: event.name,
                    })) ?? []
                  }
                  {...assignRoleForm.getInputProps("eventId")}
                />

                <Select
                  label="Role"
                  placeholder="Select a role"
                  data={
                    roles?.map((role) => ({
                      value: role.id,
                      label: role.name,
                    })) ?? []
                  }
                  {...assignRoleForm.getInputProps("roleId")}
                />

                <Button
                  type="submit"
                  loading={assignEventRole.isPending}
                  leftSection={<IconUserPlus size={16} />}
                  disabled={
                    !assignRoleForm.values.userId ||
                    !assignRoleForm.values.eventId ||
                    !assignRoleForm.values.roleId
                  }
                >
                  Assign Event Role
                </Button>
              </Stack>
            </form>
          </Paper>

          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setAssignRoleModalOpen(false)}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        opened={userDetailModalOpen}
        onClose={() => setUserDetailModalOpen(false)}
        title="User Details"
        size="lg"
      >
        {userDetails ? (
          <Stack>
            {/* User Info */}
            <Group>
              <Avatar src={userDetails.image} size="lg" radius="xl">
                {userDetails.name?.[0] ?? userDetails.email?.[0]}
              </Avatar>
              <div>
                <Text fw={600} size="lg">
                  {getDisplayName(userDetails, "No name")}
                </Text>
                <Text c="dimmed">{userDetails.email}</Text>
                <Badge
                  color={getGlobalRoleBadgeColor(userDetails.role ?? "user")}
                  variant="light"
                >
                  {(userDetails.role ?? "user").toUpperCase()}
                </Badge>
              </div>
            </Group>

            {/* Stats */}
            <SimpleGrid cols={3}>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>
                  {userDetails._count.userRoles}
                </Text>
                <Text size="xs" c="dimmed">
                  Event Roles
                </Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>
                  {userDetails._count.applications}
                </Text>
                <Text size="xs" c="dimmed">
                  Applications
                </Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>
                  {userDetails._count.posts}
                </Text>
                <Text size="xs" c="dimmed">
                  Posts
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Event Roles */}
            <div>
              <Text fw={600} mb="sm">
                Event Roles
              </Text>
              {userDetails.userRoles.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No event roles assigned
                </Text>
              ) : (
                <Stack gap="xs">
                  {userDetails.userRoles.map((userRole) => (
                    <Group
                      key={`${userRole.event.id}-${userRole.role.id}`}
                      justify="space-between"
                    >
                      <Group>
                        <Badge color="blue" variant="light">
                          {userRole.role.name}
                        </Badge>
                        <Text size="sm">{userRole.event.name}</Text>
                        <Text size="xs" c="dimmed">
                          {new Date(
                            userRole.event.startDate,
                          ).toLocaleDateString()}{" "}
                          -
                          {new Date(
                            userRole.event.endDate,
                          ).toLocaleDateString()}
                        </Text>
                      </Group>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() =>
                          handleRemoveRole(
                            userDetails.id,
                            userRole.event.id,
                            userRole.role.id,
                          )
                        }
                        title="Remove role"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
            </div>

            {/* Applications */}
            <div>
              <Text fw={600} mb="sm">
                Recent Applications
              </Text>
              {userDetails.applications.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No applications submitted
                </Text>
              ) : (
                <Stack gap="xs">
                  {userDetails.applications.slice(0, 5).map((application) => (
                    <Group key={application.id} justify="space-between">
                      <Group>
                        <Text size="sm">{application.event.name}</Text>
                        <Badge
                          color={
                            application.status === "ACCEPTED"
                              ? "green"
                              : application.status === "REJECTED"
                                ? "red"
                                : "blue"
                          }
                          variant="light"
                          size="sm"
                        >
                          {application.status}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
        ) : (
          <Loader />
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        opened={editUserModalOpen}
        onClose={() => setEditUserModalOpen(false)}
        title="Edit User"
        size="lg"
      >
        <form onSubmit={editUserForm.onSubmit(handleEditUser)}>
          <Stack>
            <Paper withBorder p="md" radius="md">
              <Text fw={500} mb="sm">
                Identity
              </Text>
              <Group grow>
                <TextInput
                  label="First Name"
                  {...editUserForm.getInputProps("firstName")}
                />
                <TextInput
                  label="Surname"
                  {...editUserForm.getInputProps("surname")}
                />
              </Group>
              <TextInput
                label="Email"
                mt="sm"
                {...editUserForm.getInputProps("email")}
              />
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Text fw={500} mb="sm">
                Permissions
              </Text>
              <Select
                label="Global Role"
                data={[
                  { value: "user", label: "User" },
                  { value: "staff", label: "Staff" },
                  { value: "admin", label: "Admin" },
                ]}
                {...editUserForm.getInputProps("role")}
              />
              <Switch
                label="AI Reviewer"
                mt="sm"
                checked={editUserForm.values.isAIReviewer}
                onChange={(e) =>
                  editUserForm.setFieldValue(
                    "isAIReviewer",
                    e.currentTarget.checked,
                  )
                }
              />
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Text fw={500} mb="sm">
                Admin Fields
              </Text>
              <MultiSelect
                label="Labels"
                data={ADMIN_LABEL_OPTIONS.map((l) => ({
                  value: l,
                  label: l,
                }))}
                value={editUserForm.values.adminLabels}
                onChange={(val) =>
                  editUserForm.setFieldValue(
                    "adminLabels",
                    val as AdminLabel[],
                  )
                }
              />
              <Textarea
                label="Admin Notes"
                mt="sm"
                autosize
                minRows={3}
                {...editUserForm.getInputProps("adminNotes")}
              />
              <Textarea
                label="Work Experience"
                mt="sm"
                autosize
                minRows={3}
                {...editUserForm.getInputProps("adminWorkExperience")}
              />
            </Paper>

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setEditUserModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={adminUpdateUser.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
