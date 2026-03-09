"use client";

import { useState } from "react";
import {
  Drawer,
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Tabs,
  Card,
  Table,
  Button,
  Loader,
  Avatar,
  Divider,
  Alert,
  TextInput,
  Textarea,
  ActionIcon,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
  IconUser,
  IconMail,
  IconCalendar,
  IconEye,
  IconUsers,
  IconPencil,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { getDisplayName, getInitials } from "~/utils/userDisplay";

interface ApplicationDetailsDrawerProps {
  applicationId: string | null;
  opened: boolean;
  onClose: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "DRAFT":
      return <IconClock size={16} />;
    case "SUBMITTED":
      return <IconUpload size={16} />;
    case "UNDER_REVIEW":
      return <IconClock size={16} />;
    case "ACCEPTED":
      return <IconCheck size={16} />;
    case "REJECTED":
      return <IconX size={16} />;
    case "WAITLISTED":
      return <IconAlertTriangle size={16} />;
    default:
      return null;
  }
}

function EditableField({
  label,
  value,
  fieldKey,
  editingField,
  editValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onChangeEdit,
  isSaving,
  multiline,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  fieldKey: string;
  editingField: string | null;
  editValue: string;
  onStartEdit: (key: string, currentValue: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (key: string) => void;
  onChangeEdit: (value: string) => void;
  isSaving: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  const isEditing = editingField === fieldKey;

  if (isEditing) {
    return (
      <div>
        <Text fw={500} mb={4}>{label}:</Text>
        {hint && <Text size="xs" c="orange" mb={4}>{hint}</Text>}
        <Group gap="xs" align="flex-end">
          <div style={{ flex: 1 }}>
            {multiline ? (
              <Textarea
                value={editValue}
                onChange={(e) => onChangeEdit(e.currentTarget.value)}
                size="sm"
                autosize
                minRows={2}
                maxRows={5}
              />
            ) : (
              <TextInput
                value={editValue}
                onChange={(e) => onChangeEdit(e.currentTarget.value)}
                size="sm"
              />
            )}
          </div>
          <ActionIcon color="green" variant="light" size="sm" onClick={() => onSaveEdit(fieldKey)} loading={isSaving}>
            <IconCheck size={14} />
          </ActionIcon>
          <ActionIcon color="gray" variant="light" size="sm" onClick={onCancelEdit}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </div>
    );
  }

  return (
    <Group justify="space-between">
      <Text fw={500}>{label}:</Text>
      <Group gap={4}>
        <Text size="sm">{value ?? "Not set"}</Text>
        <ActionIcon variant="subtle" size="xs" onClick={() => onStartEdit(fieldKey, value ?? "")}>
          <IconPencil size={14} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

export default function ApplicationDetailsDrawer({
  applicationId,
  opened,
  onClose,
}: ApplicationDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch application details
  const { data: application, isLoading, error, refetch } = api.application.getApplicationById.useQuery(
    { applicationId: applicationId! },
    { enabled: !!applicationId && opened }
  );

  // Status update mutation
  const updateApplicationStatus = api.application.updateApplicationStatus.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Application status updated successfully",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Profile update mutation
  const updateProfile = api.application.updateApplicationUserProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Profile updated successfully",
        color: "green",
      });
      setEditingField(null);
      setEditValue("");
      void refetch();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleStatusUpdate = (status: "ACCEPTED" | "REJECTED") => {
    if (!applicationId) return;
    updateApplicationStatus.mutate({ applicationId, status });
  };

  const handleStartEdit = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveField = (fieldKey: string) => {
    if (!applicationId) return;
    const val = editValue.trim();

    // Email validation
    if (fieldKey === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        notifications.show({
          title: "Invalid email",
          message: "Please enter a valid email address",
          color: "red",
        });
        return;
      }
    }

    // Name validation
    if (fieldKey === "firstName" && !val) {
      notifications.show({
        title: "Invalid name",
        message: "First name cannot be empty",
        color: "red",
      });
      return;
    }

    const input: Record<string, string | null> = { applicationId };

    switch (fieldKey) {
      case "email": input.email = val; break;
      case "firstName": input.firstName = val; break;
      case "surname": input.surname = val || null; break;
      case "bio": input.bio = val || null; break;
      case "jobTitle": input.jobTitle = val || null; break;
      case "company": input.company = val || null; break;
      case "website": input.website = val || null; break;
      case "linkedinUrl": input.linkedinUrl = val || null; break;
      case "twitterUrl": input.twitterUrl = val || null; break;
    }

    updateProfile.mutate(input as Parameters<typeof updateProfile.mutate>[0]);
  };

  const editableFieldProps = {
    editingField,
    editValue,
    onStartEdit: handleStartEdit,
    onCancelEdit: handleCancelEdit,
    onSaveEdit: handleSaveField,
    onChangeEdit: setEditValue,
    isSaving: updateProfile.isPending,
  };

  if (!opened) {
    return null;
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title=""
      size="lg"
      position="right"
      overlayProps={{ opacity: 0.55, blur: 3 }}
    >
      {isLoading && (
        <Group justify="center" mt="xl">
          <Loader size="xl" />
        </Group>
      )}

      {error && (
        <Alert
          icon={<IconAlertTriangle size="1rem" />}
          title="Error"
          color="red"
          mt="md"
        >
          {error.message}
        </Alert>
      )}

      {application && (
        <Stack gap="md">
          {/* Header */}
          <Card withBorder p="md">
            <Group justify="space-between" align="flex-start">
              <Group align="flex-start" gap="md">
                <Avatar size="lg" color="blue">
                  <IconUser size="1.5rem" />
                </Avatar>
                <div>
                  {editingField === "firstName" ? (
                    <div style={{ marginBottom: 8 }}>
                      <Text fw={500} mb={4}>Name:</Text>
                      <Group gap="xs" align="flex-end">
                        <TextInput
                          value={editValue}
                          onChange={(e) => setEditValue(e.currentTarget.value)}
                          size="sm"
                          placeholder="First name"
                          style={{ flex: 1 }}
                        />
                        <ActionIcon color="green" variant="light" size="sm" onClick={() => handleSaveField("firstName")} loading={updateProfile.isPending}>
                          <IconCheck size={14} />
                        </ActionIcon>
                        <ActionIcon color="gray" variant="light" size="sm" onClick={handleCancelEdit}>
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </div>
                  ) : (
                    <Group gap={4} mb="xs">
                      <Title order={3}>
                        {getDisplayName(application.user, "Unknown")}
                      </Title>
                      <ActionIcon variant="subtle" size="xs" onClick={() => handleStartEdit("firstName", application.user?.firstName ?? application.user?.name ?? "")}>
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Group>
                  )}

                  {editingField === "email" ? (
                    <div style={{ marginBottom: 8 }}>
                      <Text fw={500} mb={4}>Email:</Text>
                      <Text size="xs" c="orange" mb={4}>This changes the user&apos;s login email</Text>
                      <Group gap="xs" align="flex-end">
                        <TextInput
                          value={editValue}
                          onChange={(e) => setEditValue(e.currentTarget.value)}
                          size="sm"
                          placeholder="email@example.com"
                          style={{ flex: 1 }}
                        />
                        <ActionIcon color="green" variant="light" size="sm" onClick={() => handleSaveField("email")} loading={updateProfile.isPending}>
                          <IconCheck size={14} />
                        </ActionIcon>
                        <ActionIcon color="gray" variant="light" size="sm" onClick={handleCancelEdit}>
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </div>
                  ) : (
                    <Group gap={4} mb="xs">
                      <IconMail size={16} />
                      <Text size="sm" c="dimmed">
                        {application.email}
                      </Text>
                      <ActionIcon variant="subtle" size="xs" onClick={() => handleStartEdit("email", application.email ?? "")}>
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Group>
                  )}

                  <Badge
                    color={getStatusColor(application.status)}
                    variant="light"
                    size="lg"
                    leftSection={getStatusIcon(application.status)}
                  >
                    {application.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
              </Group>
              <Group gap="xs">
                {application.status !== "ACCEPTED" && (
                  <Button
                    variant="light"
                    color="green"
                    size="sm"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleStatusUpdate("ACCEPTED")}
                    loading={updateApplicationStatus.isPending}
                  >
                    Accept
                  </Button>
                )}
                {application.status !== "REJECTED" && (
                  <Button
                    variant="light"
                    color="red"
                    size="sm"
                    leftSection={<IconX size={16} />}
                    onClick={() => handleStatusUpdate("REJECTED")}
                    loading={updateApplicationStatus.isPending}
                  >
                    Reject
                  </Button>
                )}
              </Group>
            </Group>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "overview")}>
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconEye size="0.8rem" />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="responses" leftSection={<IconMail size="0.8rem" />}>
                Responses
              </Tabs.Tab>
              <Tabs.Tab value="reviewers" leftSection={<IconUsers size="0.8rem" />}>
                Reviewers
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack gap="md">
                <Card withBorder p="md">
                  <Title order={4} mb="md">Application Details</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={500}>Event:</Text>
                      <Text>{application.event?.name}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={500}>Type:</Text>
                      <Badge variant="light" color="blue">
                        {application.applicationType}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={500}>Language:</Text>
                      <Text>{application.language?.toUpperCase()}</Text>
                    </Group>
                    {application.submittedAt && (
                      <Group justify="space-between">
                        <Text fw={500}>Submitted:</Text>
                        <Group gap="xs">
                          <IconCalendar size={16} />
                          <Text>{new Date(application.submittedAt).toLocaleDateString()}</Text>
                        </Group>
                      </Group>
                    )}
                    {application.affiliation && (
                      <Group justify="space-between">
                        <Text fw={500}>Affiliation:</Text>
                        <Text>{application.affiliation}</Text>
                      </Group>
                    )}
                  </Stack>
                </Card>

                <Card withBorder p="md">
                  <Title order={4} mb="md">Profile Information</Title>
                  <Stack gap="sm">
                    <EditableField
                      label="Bio"
                      value={application.user?.profile?.bio}
                      fieldKey="bio"
                      multiline
                      {...editableFieldProps}
                    />
                    <EditableField
                      label="Job Title"
                      value={application.user?.profile?.jobTitle}
                      fieldKey="jobTitle"
                      {...editableFieldProps}
                    />
                    <EditableField
                      label="Company"
                      value={application.user?.profile?.company}
                      fieldKey="company"
                      {...editableFieldProps}
                    />
                    <EditableField
                      label="Website"
                      value={application.user?.profile?.website}
                      fieldKey="website"
                      {...editableFieldProps}
                    />
                    <EditableField
                      label="LinkedIn"
                      value={application.user?.profile?.linkedinUrl}
                      fieldKey="linkedinUrl"
                      {...editableFieldProps}
                    />
                    <EditableField
                      label="Twitter/X"
                      value={application.user?.profile?.twitterUrl}
                      fieldKey="twitterUrl"
                      {...editableFieldProps}
                    />
                    {application.user?.profile?.location && (
                      <Group justify="space-between">
                        <Text fw={500}>Location:</Text>
                        <Text size="sm">{application.user.profile.location}</Text>
                      </Group>
                    )}
                    {application.user?.profile?.skills && application.user.profile.skills.length > 0 && (
                      <div>
                        <Text fw={500} mb="xs">Skills:</Text>
                        <Group gap="xs">
                          {application.user.profile.skills.map((skill, index) => (
                            <Badge key={index} variant="light" size="sm">
                              {skill}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="responses" pt="md">
              <Card withBorder p="md">
                <Title order={4} mb="md">Application Responses</Title>
                {application.applicationType === "MENTOR" && application.user?.profile ? (
                  <Stack gap="md">
                    {/* Mentor Specializations */}
                    {application.user.profile.mentorSpecializations && application.user.profile.mentorSpecializations.length > 0 && (
                      <div>
                        <Text fw={500} mb="xs">
                          Specializations *
                          <Text component="span" c="red" ml="xs">*</Text>
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          What specific topics or skills do you want to mentor on during the residency?
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Group gap="xs">
                            {application.user.profile.mentorSpecializations.map((spec, index) => (
                              <Badge key={index} variant="light" size="sm">
                                {spec}
                              </Badge>
                            ))}
                          </Group>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    )}

                    {/* Mentorship Style & Approach */}
                    {application.user.profile.mentorshipStyle && (
                      <div>
                        <Text fw={500} mb="xs">
                          Mentorship Style & Approach
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          How do you approach mentoring?
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {application.user.profile.mentorshipStyle}
                          </Text>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    )}

                    {/* Previous Mentoring Experience */}
                    {application.user.profile.previousMentoringExp && (
                      <div>
                        <Text fw={500} mb="xs">
                          Previous Mentoring Experience
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          Tell us about your previous mentoring experience
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {application.user.profile.previousMentoringExp}
                          </Text>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    )}

                    {/* Mentor Goals */}
                    {application.user.profile.mentorGoals && (
                      <div>
                        <Text fw={500} mb="xs">
                          Mentoring Goals
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          What are your goals for mentoring during this residency?
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {application.user.profile.mentorGoals}
                          </Text>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    )}

                    {/* Show message if no mentor data */}
                    {(!application.user.profile.mentorSpecializations || application.user.profile.mentorSpecializations.length === 0) &&
                     !application.user.profile.mentorshipStyle &&
                     !application.user.profile.previousMentoringExp &&
                     !application.user.profile.mentorGoals && (
                      <Text c="dimmed" ta="center" py="xl">
                        No mentor responses found
                      </Text>
                    )}
                  </Stack>
                ) : application.responses.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No responses found
                  </Text>
                ) : (
                  <Stack gap="md">
                    {application.responses.map((response) => (
                      <div key={response.id}>
                        <Text fw={500} mb="xs">
                          {response.question.questionEn}
                          {response.question.required && (
                            <Text component="span" c="red" ml="xs">*</Text>
                          )}
                        </Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          {response.question.questionKey}
                        </Text>
                        <Card withBorder p="sm" bg="gray.0">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {response.answer || <Text c="dimmed">No answer provided</Text>}
                          </Text>
                        </Card>
                        <Divider mt="md" />
                      </div>
                    ))}
                  </Stack>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="reviewers" pt="md">
              <Card withBorder p="md">
                <Title order={4} mb="md">Reviewer Assignments</Title>
                {application.reviewerAssignments.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No reviewers assigned
                  </Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Reviewer</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Assigned</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {application.reviewerAssignments.map((assignment) => (
                        <Table.Tr key={assignment.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar src={assignment.reviewer.image} size="sm">
                                {getInitials(assignment.reviewer)}
                              </Avatar>
                              <Text size="sm">{getDisplayName(assignment.reviewer)}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{assignment.reviewer.email}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {new Date(assignment.assignedAt).toLocaleDateString()}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Drawer>
  );
}
