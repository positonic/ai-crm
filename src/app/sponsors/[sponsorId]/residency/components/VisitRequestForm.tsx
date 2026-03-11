"use client";

import React, { useState } from "react";
import {
  Card,
  Stack,
  Title,
  Text,
  Checkbox,
  Button,
  Select,
  NumberInput,
  Textarea,
  Group,
  Alert,
  Badge,
  Timeline,
  Collapse,
  Paper,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface VisitRequestFormProps {
  eventSponsorId: string;
  eventDates: {
    start: string | Date;
    end: string | Date;
  };
  existingRequests: Array<{
    id: string;
    visitType: string;
    status: string;
    preferredDates: Date[];
    scheduledDate?: Date | null;
    purpose: string;
    numAttendees: number;
    createdAt: Date;
  }>;
}

const visitTypeOptions = [
  { value: "KICKOFF", label: "Opening Week Kickoff (1-2 days)" },
  { value: "MENTORSHIP", label: "Mid-program Mentorship Visit" },
  { value: "DEMO_DAY", label: "Final Showcase/Demo Day (1 day)" },
  { value: "CUSTOM", label: "Custom dates" },
];

const purposeOptions = [
  {
    value: "Technical workshop delivery",
    label: "Technical workshop delivery",
  },
  { value: "Mentorship sessions", label: "Mentorship sessions" },
  { value: "Office hours", label: "Office hours" },
  { value: "Demo day judging", label: "Demo day judging" },
  {
    value: "Networking/relationship building",
    label: "Networking/relationship building",
  },
];

export default function VisitRequestForm({
  eventSponsorId,
  eventDates,
  existingRequests,
}: VisitRequestFormProps) {
  const [wantsToVisit, setWantsToVisit] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const utils = api.useUtils();

  const form = useForm({
    initialValues: {
      visitType: "",
      preferredDates: [] as Date[],
      numAttendees: 1,
      purpose: "",
      requirements: "",
    },
    validate: {
      visitType: (value) => (value ? null : "Please select a visit type"),
      preferredDates: (value) =>
        value.length > 0 ? null : "Please select at least one preferred date",
      purpose: (value) =>
        value ? null : "Please describe the purpose of your visit",
    },
  });

  const createVisitRequest = api.sponsor.createVisitRequest.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Visit request submitted",
        message:
          "Your visit request has been submitted successfully. We will be in touch soon.",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      form.reset();
      setShowForm(false);
      setWantsToVisit(false);
      void utils.sponsor.getSponsorResidencyData.invalidate({ eventSponsorId });
    },
    onError: (error) => {
      notifications.show({
        title: "Error submitting request",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    createVisitRequest.mutate({
      eventSponsorId,
      visitType: values.visitType as
        | "KICKOFF"
        | "MENTORSHIP"
        | "DEMO_DAY"
        | "CUSTOM",
      preferredDates: values.preferredDates,
      numAttendees: values.numAttendees,
      purpose: values.purpose,
      requirements: values.requirements || undefined,
    });
  };

  const startDate = new Date(eventDates.start);
  const endDate = new Date(eventDates.end);

  return (
    <Card withBorder radius="md" p="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={3}>Onsite Visit Planning</Title>
          {existingRequests.length > 0 && (
            <Badge color="blue" variant="light">
              {existingRequests.length} Request
              {existingRequests.length > 1 ? "s" : ""} Submitted
            </Badge>
          )}
        </Group>

        <Text>
          While most mentorship can be provided remotely, onsite presence adds
          significant value to the residency experience. You can request to
          visit during key moments of the program.
        </Text>

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Text fw={500} size="sm">
                Your Visit Requests
              </Text>
              <Timeline bulletSize={20} lineWidth={2}>
                {existingRequests.map((request) => (
                  <Timeline.Item
                    key={request.id}
                    bullet={getStatusIcon(request.status)}
                    title={
                      visitTypeOptions.find(
                        (opt) => opt.value === request.visitType,
                      )?.label
                    }
                  >
                    <Text size="sm" c="dimmed">
                      {request.purpose} • {request.numAttendees} attendee
                      {request.numAttendees > 1 ? "s" : ""}
                    </Text>
                    <Badge
                      size="xs"
                      color={getStatusColor(request.status)}
                      variant="light"
                      mt="xs"
                    >
                      {request.status
                        .replace("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                    {request.scheduledDate && (
                      <Text size="xs" c="dimmed" mt="xs">
                        Scheduled:{" "}
                        {new Date(request.scheduledDate).toLocaleDateString()}
                      </Text>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Stack>
          </Paper>
        )}

        {/* Main Checkbox */}
        <Checkbox
          label="I want to visit the residency onsite"
          description="Check here to request onsite visit scheduling"
          checked={wantsToVisit}
          onChange={(event) => {
            setWantsToVisit(event.currentTarget.checked);
            setShowForm(event.currentTarget.checked);
          }}
          size="md"
        />

        {/* Form */}
        <Collapse in={showForm}>
          <Paper p="lg" withBorder>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <Title order={4}>Visit Request Details</Title>

                <Select
                  label="Visit Type"
                  placeholder="Select when you'd like to visit"
                  data={visitTypeOptions}
                  {...form.getInputProps("visitType")}
                  required
                />

                <DatePickerInput
                  type="multiple"
                  label="Preferred Dates"
                  placeholder="Select your preferred dates"
                  description="Choose multiple dates to give us flexibility in scheduling"
                  minDate={startDate}
                  maxDate={endDate}
                  {...form.getInputProps("preferredDates")}
                  required
                />

                <NumberInput
                  label="Number of Team Members"
                  placeholder="How many people will visit?"
                  description="Typically 1-3 people expected"
                  min={1}
                  max={10}
                  {...form.getInputProps("numAttendees")}
                  required
                />

                <Select
                  label="Primary Purpose"
                  placeholder="What's the main purpose of your visit?"
                  data={purposeOptions}
                  searchable
                  {...form.getInputProps("purpose")}
                  required
                />

                <Textarea
                  label="Special Requirements"
                  placeholder="Any logistics needs, equipment requirements, or other considerations?"
                  description="Optional: Let us know about any special arrangements needed"
                  minRows={3}
                  {...form.getInputProps("requirements")}
                />

                <Group justify="end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setWantsToVisit(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={createVisitRequest.isPending}
                    leftSection={<IconCalendar size={16} />}
                  >
                    Submit Visit Request
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Collapse>

        {/* Helper Info */}
        <Alert
          icon={<IconMapPin size={16} />}
          title="Visit Guidelines"
          color="blue"
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm">
              • <strong>Opening Week:</strong> Great for kickoff presentations
              and initial workshops
            </Text>
            <Text size="sm">
              • <strong>Mid-Program:</strong> Ideal for hands-on mentorship and
              technical guidance
            </Text>
            <Text size="sm">
              • <strong>Demo Day:</strong> Perfect for final presentations,
              judging, and networking
            </Text>
            <Text size="sm">
              • We recommend at least one mentor onsite for 4-7 days total
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Card>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <IconCheck size={14} />;
    case "SCHEDULED":
    case "APPROVED":
      return <IconCalendar size={14} />;
    default:
      return <IconClock size={14} />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "SCHEDULED":
    case "APPROVED":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "yellow";
  }
}
