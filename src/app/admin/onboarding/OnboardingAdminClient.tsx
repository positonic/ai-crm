"use client";

import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Table,
  Paper,
  Badge,
  Group,
  Stack,
  Modal,
  Anchor,
  Divider,
  Card,
  Grid,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconEye,
  IconDownload,
  IconCheck,
  IconX,
  IconClock,
  IconUser,
  IconPlane,
  IconLanguage,
  IconBrain,
  IconPresentation,
  IconPalette,
  IconPhoto,
  IconClipboardCheck,
  IconStar,
  IconPhone,
  IconCalendar,
  IconHeart,
} from "@tabler/icons-react";
import Link from "next/link";

interface OnboardingSubmission {
  id: string;
  completed: boolean;
  submittedAt: Date | null;

  // Contact & Logistics
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  arrivalDateTime: Date | null;
  departureDateTime: Date | null;

  // Travel Documents
  eTicketUrl: string | null;
  eTicketFileName: string | null;
  healthInsuranceUrl: string | null;
  healthInsuranceFileName: string | null;

  // Food & Dietary Needs
  dietType: "OMNIVORE" | "VEGETARIAN" | "VEGAN" | "OTHER" | null;
  dietTypeOther: string | null;
  allergiesIntolerances: string | null;

  // English Proficiency
  englishProficiencyLevel: number | null;

  // Knowledge Sharing, Community & Mentorship
  primaryGoals: string | null;
  skillsToGain: string | null;
  openToMentoring: "YES" | "NO" | "MAYBE" | null;
  mentorsToLearnFrom: string | null;
  organizationsToConnect: string | null;

  // Technical Workshop
  technicalWorkshopTitle: string | null;
  technicalWorkshopDescription: string | null;
  technicalWorkshopDuration: string | null;
  technicalWorkshopMaterials: string | null;

  // Beyond Work Activities
  beyondWorkInterests: string | null;
  beyondWorkTitle: string | null;
  beyondWorkDescription: string | null;
  beyondWorkDuration: string | null;
  beyondWorkMaterials: string | null;

  // Media & Bio
  headshotUrl: string | null;
  headshotFileName: string | null;
  shortBio: string | null;

  // Commitments & Confirmations
  participateExperiments: boolean | null;
  mintHypercert: boolean | null;
  interestedIncubation: boolean | null;
  interestedEIR: boolean | null;
  liabilityWaiverConsent: boolean | null;
  codeOfConductAgreement: boolean | null;
  communityActivitiesConsent: boolean | null;

  // Additional Information
  additionalComments: string | null;

  createdAt: Date;
  updatedAt: Date;
  application: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
    event: {
      id: string;
      name: string;
    };
  };
}

interface OnboardingAdminClientProps {
  onboardingData: OnboardingSubmission[];
}

function getStatusBadge(submission: OnboardingSubmission) {
  if (submission.completed && submission.submittedAt) {
    return (
      <Badge color="green" leftSection={<IconCheck size={12} />}>
        Completed
      </Badge>
    );
  }

  // Check if they have provided any substantial information
  const hasBasicInfo = submission.emergencyContactName;
  const hasDocuments = submission.eTicketUrl ?? submission.healthInsuranceUrl;
  const hasCommitments =
    submission.participateExperiments ?? submission.mintHypercert;

  if (
    !submission.completed &&
    (hasBasicInfo || hasDocuments || hasCommitments)
  ) {
    return (
      <Badge color="yellow" leftSection={<IconClock size={12} />}>
        In Progress
      </Badge>
    );
  }

  return (
    <Badge color="gray" leftSection={<IconX size={12} />}>
      Not Started
    </Badge>
  );
}

function OnboardingDetailModal({
  submission,
  opened,
  onClose,
}: {
  submission: OnboardingSubmission | null;
  opened: boolean;
  onClose: () => void;
}) {
  if (!submission) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return "Not provided";
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Onboarding Details - ${submission.application.user?.name ?? "Unknown"}`}
      size="xl"
    >
      <Stack gap="lg">
        {/* Overview */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconUser size={20} color="blue" />
            <Title order={4}>Participant Overview</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Name
              </Text>
              <Text size="sm" c="dimmed">
                {submission.application.user?.name ?? "N/A"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Email
              </Text>
              <Text size="sm" c="dimmed">
                {submission.application.user?.email ?? "N/A"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Event
              </Text>
              <Text size="sm" c="dimmed">
                {submission.application.event.name}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Status
              </Text>
              {getStatusBadge(submission)}
            </Grid.Col>
          </Grid>
        </Card>

        {/* Contact & Logistics */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconPhone size={20} color="green" />
            <Title order={4}>Contact & Logistics</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Blood Type
              </Text>
              <Text size="sm" c="dimmed">
                {submission.bloodType ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Divider my="xs" />
              <Text size="sm" fw={600} mb="xs">
                Emergency Contact
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Name
              </Text>
              <Text size="sm" c="dimmed">
                {submission.emergencyContactName ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Relationship
              </Text>
              <Text size="sm" c="dimmed">
                {submission.emergencyContactRelationship ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Phone
              </Text>
              <Text size="sm" c="dimmed">
                {submission.emergencyContactPhone ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Arrival Date & Time
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(submission.arrivalDateTime)}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Departure Date & Time
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(submission.departureDateTime)}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Travel Documents */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconPlane size={20} color="blue" />
            <Title order={4}>Travel Documents</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                E-Ticket
              </Text>
              {submission.eTicketUrl ? (
                <div>
                  <Anchor
                    href={submission.eTicketUrl}
                    target="_blank"
                    size="sm"
                  >
                    {submission.eTicketFileName ?? "View E-Ticket"}{" "}
                    <IconDownload size={12} />
                  </Anchor>
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  Not provided
                </Text>
              )}
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Health Insurance
              </Text>
              {submission.healthInsuranceUrl ? (
                <div>
                  <Anchor
                    href={submission.healthInsuranceUrl}
                    target="_blank"
                    size="sm"
                  >
                    {submission.healthInsuranceFileName ?? "View Insurance"}{" "}
                    <IconDownload size={12} />
                  </Anchor>
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  Not provided
                </Text>
              )}
            </Grid.Col>
          </Grid>
        </Card>

        {/* Food & Dietary */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconHeart size={20} color="orange" />
            <Title order={4}>Food & Dietary Needs</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Diet Type
              </Text>
              <Badge color={submission.dietType ? "green" : "gray"} size="sm">
                {submission.dietType ?? "Not specified"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Other Diet Details
              </Text>
              <Text size="sm" c="dimmed">
                {submission.dietTypeOther ?? "N/A"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Allergies & Intolerances
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.allergiesIntolerances ?? "None specified"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* English Proficiency */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconLanguage size={20} color="teal" />
            <Title order={4}>English Proficiency</Title>
          </Group>
          <Grid>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Proficiency Level
              </Text>
              <Group gap="sm" align="center">
                <Badge size="lg" color="blue">
                  {submission.englishProficiencyLevel ?? 0}%
                </Badge>
                <Text size="sm" c="dimmed">
                  {(submission.englishProficiencyLevel ?? 0) < 30
                    ? "Beginner"
                    : (submission.englishProficiencyLevel ?? 0) < 70
                      ? "Intermediate"
                      : "Fluent"}
                </Text>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Knowledge Sharing & Community */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconBrain size={20} color="purple" />
            <Title order={4}>Knowledge Sharing & Community</Title>
          </Group>
          <Grid>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Primary Goals
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.primaryGoals ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Skills to Gain
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.skillsToGain ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Open to Mentoring
              </Text>
              <Badge
                color={
                  submission.openToMentoring === "YES"
                    ? "green"
                    : submission.openToMentoring === "MAYBE"
                      ? "yellow"
                      : submission.openToMentoring === "NO"
                        ? "red"
                        : "gray"
                }
                size="sm"
              >
                {submission.openToMentoring ?? "Not specified"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Mentors to Learn From
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.mentorsToLearnFrom ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Organizations to Connect With
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.organizationsToConnect ?? "Not provided"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Technical Workshop */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconPresentation size={20} color="indigo" />
            <Title order={4}>Technical Workshop Proposal</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Workshop Title
              </Text>
              <Text size="sm" c="dimmed">
                {submission.technicalWorkshopTitle ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Duration
              </Text>
              <Text size="sm" c="dimmed">
                {submission.technicalWorkshopDuration ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Description
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.technicalWorkshopDescription ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Materials Needed
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.technicalWorkshopMaterials ?? "Not provided"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Beyond Work Activities */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconPalette size={20} color="pink" />
            <Title order={4}>Beyond Work Activities</Title>
          </Group>
          <Grid>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Interests
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.beyondWorkInterests ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Activity Title
              </Text>
              <Text size="sm" c="dimmed">
                {submission.beyondWorkTitle ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Duration
              </Text>
              <Text size="sm" c="dimmed">
                {submission.beyondWorkDuration ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Activity Description
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.beyondWorkDescription ?? "Not provided"}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Materials Needed
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.beyondWorkMaterials ?? "Not provided"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Media & Bio */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconPhoto size={20} color="cyan" />
            <Title order={4}>Media & Bio</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Headshot
              </Text>
              {submission.headshotUrl ? (
                <div>
                  <Anchor
                    href={submission.headshotUrl}
                    target="_blank"
                    size="sm"
                  >
                    {submission.headshotFileName ?? "View Headshot"}{" "}
                    <IconDownload size={12} />
                  </Anchor>
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  Not provided
                </Text>
              )}
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Short Bio
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.shortBio ?? "Not provided"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Final Confirmations */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconClipboardCheck size={20} color="red" />
            <Title order={4}>Final Confirmations</Title>
          </Group>
          <Grid>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Participate in Experiments
              </Text>
              <Badge
                color={submission.participateExperiments ? "green" : "red"}
                size="sm"
                leftSection={
                  submission.participateExperiments ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.participateExperiments ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Mint Hypercert
              </Text>
              <Badge
                color={submission.mintHypercert ? "green" : "red"}
                size="sm"
                leftSection={
                  submission.mintHypercert ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.mintHypercert ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Interested in Incubation
              </Text>
              <Badge
                color={submission.interestedIncubation ? "blue" : "gray"}
                size="sm"
                leftSection={
                  submission.interestedIncubation ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.interestedIncubation ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="sm" fw={500}>
                Interested in EIR Program
              </Text>
              <Badge
                color={submission.interestedEIR ? "purple" : "gray"}
                size="sm"
                leftSection={
                  submission.interestedEIR ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.interestedEIR ? "Yes" : "No"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Liability Waiver
              </Text>
              <Badge
                color={submission.liabilityWaiverConsent ? "green" : "red"}
                size="sm"
                leftSection={
                  submission.liabilityWaiverConsent ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.liabilityWaiverConsent ? "Agreed" : "Not agreed"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Code of Conduct
              </Text>
              <Badge
                color={submission.codeOfConductAgreement ? "green" : "red"}
                size="sm"
                leftSection={
                  submission.codeOfConductAgreement ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.codeOfConductAgreement ? "Agreed" : "Not agreed"}
              </Badge>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Community Activities
              </Text>
              <Badge
                color={submission.communityActivitiesConsent ? "green" : "red"}
                size="sm"
                leftSection={
                  submission.communityActivitiesConsent ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconX size={12} />
                  )
                }
              >
                {submission.communityActivitiesConsent
                  ? "Agreed"
                  : "Not agreed"}
              </Badge>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Additional Information */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconStar size={20} color="yellow" />
            <Title order={4}>Additional Information</Title>
          </Group>
          <Grid>
            <Grid.Col span={12}>
              <Text size="sm" fw={500}>
                Additional Comments
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {submission.additionalComments ?? "No additional comments"}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Timestamps */}
        <Card withBorder p="md">
          <Group gap="sm" mb="md">
            <IconCalendar size={20} color="gray" />
            <Title order={4}>Timestamps</Title>
          </Group>
          <Grid>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Created
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(submission.createdAt)}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Last Updated
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(submission.updatedAt)}
              </Text>
            </Grid.Col>
            <Grid.Col span={4}>
              <Text size="sm" fw={500}>
                Submitted
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(submission.submittedAt)}
              </Text>
            </Grid.Col>
          </Grid>
        </Card>
      </Stack>
    </Modal>
  );
}

export default function OnboardingAdminClient({
  onboardingData,
}: OnboardingAdminClientProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<OnboardingSubmission | null>(null);

  const handleViewDetails = (submission: OnboardingSubmission) => {
    setSelectedSubmission(submission);
    open();
  };

  const completedCount = onboardingData.filter((s) => s.completed).length;
  const inProgressCount = onboardingData.filter(
    (s) => !s.completed && (s.eTicketUrl ?? s.healthInsuranceUrl),
  ).length;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="sm">
            Onboarding Management
          </Title>
          <Text c="dimmed">
            Manage and review participant onboarding submissions for events
          </Text>
        </div>

        {/* Stats Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="blue">
                {onboardingData.length}
              </Text>
              <Text size="sm" c="dimmed">
                Total Submissions
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="green">
                {completedCount}
              </Text>
              <Text size="sm" c="dimmed">
                Completed
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="yellow">
                {inProgressCount}
              </Text>
              <Text size="sm" c="dimmed">
                In Progress
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Onboarding Table */}
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Participant</Table.Th>
                <Table.Th>Event</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Contact Info</Table.Th>
                <Table.Th>Travel</Table.Th>
                <Table.Th>Contributions</Table.Th>
                <Table.Th>Submitted</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {onboardingData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8} ta="center" py="xl">
                    <Text c="dimmed">No onboarding submissions found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                onboardingData.map((submission) => (
                  <Table.Tr key={submission.id}>
                    <Table.Td>
                      <div>
                        <Text fw={500}>
                          {submission.application.user?.name ?? "Unknown"}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {submission.application.user?.email ?? "N/A"}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{submission.application.event.name}</Text>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(submission)}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        {submission.emergencyContactName && (
                          <Text size="xs" c="dimmed">
                            Emergency: {submission.emergencyContactName}
                          </Text>
                        )}
                        {submission.dietType && (
                          <Badge size="xs" color="orange">
                            {submission.dietType}
                          </Badge>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {submission.eTicketUrl && (
                          <Tooltip label="E-Ticket provided">
                            <Badge size="xs" color="blue">
                              ✈️
                            </Badge>
                          </Tooltip>
                        )}
                        {submission.healthInsuranceUrl && (
                          <Tooltip label="Health insurance provided">
                            <Badge size="xs" color="green">
                              🏥
                            </Badge>
                          </Tooltip>
                        )}
                        {submission.arrivalDateTime && (
                          <Tooltip
                            label={`Arrives: ${submission.arrivalDateTime.toLocaleDateString()}`}
                          >
                            <Badge size="xs" color="teal">
                              📅
                            </Badge>
                          </Tooltip>
                        )}
                        {!submission.eTicketUrl &&
                          !submission.healthInsuranceUrl &&
                          !submission.arrivalDateTime && (
                            <Text size="sm" c="dimmed">
                              None
                            </Text>
                          )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        {submission.technicalWorkshopTitle && (
                          <Tooltip label={submission.technicalWorkshopTitle}>
                            <Badge
                              size="xs"
                              color="purple"
                              style={{
                                maxWidth: 100,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              🎓 Workshop
                            </Badge>
                          </Tooltip>
                        )}
                        {submission.beyondWorkTitle && (
                          <Tooltip label={submission.beyondWorkTitle}>
                            <Badge
                              size="xs"
                              color="pink"
                              style={{
                                maxWidth: 100,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              🎨 Activity
                            </Badge>
                          </Tooltip>
                        )}
                        {submission.openToMentoring === "YES" && (
                          <Badge size="xs" color="green">
                            Mentor
                          </Badge>
                        )}
                        {!submission.technicalWorkshopTitle &&
                          !submission.beyondWorkTitle && (
                            <Text size="sm" c="dimmed">
                              None
                            </Text>
                          )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" c="dimmed">
                          {submission.submittedAt
                            ? submission.submittedAt.toLocaleDateString()
                            : "Not submitted"}
                        </Text>
                        {submission.submittedAt && (
                          <Text size="xs" c="dimmed">
                            {submission.submittedAt.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => handleViewDetails(submission)}
                          title="View details"
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          component={Link}
                          href={`/admin/events/${submission.application.event.id}/applications`}
                          title="View application"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <OnboardingDetailModal
        submission={selectedSubmission}
        opened={opened}
        onClose={close}
      />
    </Container>
  );
}
