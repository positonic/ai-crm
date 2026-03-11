"use client";

import { useState } from "react";
import {
  Modal,
  Stepper,
  Button,
  Group,
  TextInput,
  Textarea,
  Switch,
  Select,
  Stack,
  Text,
  Paper,
  Badge,
  ActionIcon,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { QuestionType } from "@prisma/client";

interface CreateEventModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ApplicationQuestion {
  questionKey: string;
  questionEn: string;
  questionEs: string;
  questionType: QuestionType;
  required: boolean;
  order: number;
  options?: string[];
}

interface EventFormValues {
  name: string;
  slug: string; // Optional custom URL slug
  type: string;
  startDate: Date | null;
  endDate: Date | null;
  isOnline: boolean;
  location: string;
  description: string;
  questions: ApplicationQuestion[];
}

const DEFAULT_QUESTIONS: ApplicationQuestion[] = [
  {
    questionKey: "full_name",
    questionEn: "What is your full name?",
    questionEs: "¿Cuál es tu nombre completo?",
    questionType: "TEXT",
    required: true,
    order: 1,
  },
  {
    questionKey: "email",
    questionEn: "What is your email address?",
    questionEs: "¿Cuál es tu dirección de correo electrónico?",
    questionType: "EMAIL",
    required: true,
    order: 2,
  },
  {
    questionKey: "why_interested",
    questionEn: "Why are you interested in this event?",
    questionEs: "¿Por qué estás interesado en este evento?",
    questionType: "TEXTAREA",
    required: true,
    order: 3,
  },
];

const EVENT_TYPES = [
  { value: "RESIDENCY", label: "Residency" },
  { value: "HACKATHON", label: "Hackathon" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "DINNER", label: "Dinner" },
  { value: "COLIVING", label: "Co-living" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER", label: "Other" },
];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "TEXT", label: "Short Text" },
  { value: "TEXTAREA", label: "Long Text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "URL", label: "URL" },
  { value: "SELECT", label: "Single Select" },
  { value: "MULTISELECT", label: "Multi Select" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "NUMBER", label: "Number" },
];

export function CreateEventModal({
  opened,
  onClose,
  onSuccess,
}: CreateEventModalProps) {
  const [active, setActive] = useState(0);
  const utils = api.useUtils();

  const form = useForm<EventFormValues>({
    initialValues: {
      name: "",
      slug: "",
      type: "RESIDENCY",
      startDate: null,
      endDate: null,
      isOnline: true,
      location: "",
      description: "",
      questions: DEFAULT_QUESTIONS,
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      // Step 1 validation
      if (active === 0) {
        if (!values.name.trim()) {
          errors.name = "Event name is required";
        }
        if (!values.type) {
          errors.type = "Event type is required";
        }
        if (!values.startDate) {
          errors.startDate = "Start date is required";
        }
        if (!values.endDate) {
          errors.endDate = "End date is required";
        }
        if (
          values.startDate &&
          values.endDate &&
          values.endDate <= values.startDate
        ) {
          errors.endDate = "End date must be after start date";
        }
        if (!values.isOnline && !values.location.trim()) {
          errors.location = "Location is required for in-person events";
        }
      }

      // Step 2 validation
      if (active === 1) {
        if (values.questions.length === 0) {
          errors.questions = "At least one question is required";
        }
        values.questions.forEach((q, idx) => {
          if (!q.questionEn.trim()) {
            errors[`questions.${idx}.questionEn`] = "Question text is required";
          }
          if (!q.questionKey.trim()) {
            errors[`questions.${idx}.questionKey`] = "Question key is required";
          }
        });
      }

      return errors;
    },
  });

  const createEvent = api.event.createEvent.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Event created successfully!",
        color: "green",
      });
      await utils.event.getEvents.invalidate();
      onSuccess?.();
      handleClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to create event",
        color: "red",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setActive(0);
    onClose();
  };

  const nextStep = () => {
    const validation = form.validate();
    if (Object.keys(validation.errors).length === 0) {
      setActive((current) => (current < 2 ? current + 1 : current));
    }
  };

  const prevStep = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  const handleSubmit = () => {
    const validation = form.validate();
    if (Object.keys(validation.errors).length > 0) {
      return;
    }

    const values = form.values;
    if (!values.startDate || !values.endDate) {
      notifications.show({
        title: "Error",
        message: "Start and end dates are required",
        color: "red",
      });
      return;
    }

    // Ensure dates are Date objects (DateTimePicker can return strings)
    const startDate =
      values.startDate instanceof Date
        ? values.startDate
        : new Date(values.startDate);
    const endDate =
      values.endDate instanceof Date
        ? values.endDate
        : new Date(values.endDate);

    createEvent.mutate({
      name: values.name,
      slug: values.slug.trim() || undefined, // Use custom slug if provided
      type: values.type,
      startDate,
      endDate,
      isOnline: values.isOnline,
      location: values.location || undefined,
      description: values.description || undefined,
      questions: values.questions.length > 0 ? values.questions : undefined,
    });
  };

  const addQuestion = () => {
    const newOrder = form.values.questions.length + 1;
    form.insertListItem("questions", {
      questionKey: `question_${newOrder}`,
      questionEn: "",
      questionEs: "",
      questionType: "TEXT",
      required: true,
      order: newOrder,
    });
  };

  const removeQuestion = (index: number) => {
    form.removeListItem("questions", index);
    // Re-order remaining questions
    form.values.questions.forEach((_, idx) => {
      form.setFieldValue(`questions.${idx}.order`, idx + 1);
    });
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.values.questions.length) return;

    const items = [...form.values.questions];
    const [item] = items.splice(index, 1);
    if (!item) return;
    items.splice(newIndex, 0, item);

    // Update order values
    const reordered = items.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    form.setFieldValue("questions", reordered);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Event"
      size="xl"
      padding="xl"
    >
      <Stepper
        active={active}
        onStepClick={setActive}
        allowNextStepsSelect={false}
      >
        <Stepper.Step label="Basic Info" description="Event details">
          <Stack gap="md" mt="xl">
            <TextInput
              label="Event Name"
              placeholder="e.g., FtC Residency 2025"
              required
              {...form.getInputProps("name")}
            />

            <TextInput
              label="URL Slug (optional)"
              placeholder="e.g., ftc-residency-2025"
              description="Leave empty to auto-generate from event name. Used in URLs like /events/ftc-residency-2025"
              {...form.getInputProps("slug")}
            />

            <Select
              label="Event Type"
              placeholder="Select event type"
              data={EVENT_TYPES}
              required
              {...form.getInputProps("type")}
            />

            <Group grow>
              <DateTimePicker
                label="Start Date"
                placeholder="Select start date"
                required
                {...form.getInputProps("startDate")}
              />

              <DateTimePicker
                label="End Date"
                placeholder="Select end date"
                required
                minDate={form.values.startDate ?? undefined}
                {...form.getInputProps("endDate")}
              />
            </Group>

            <Switch
              label="Online Event"
              description="Toggle off if this is an in-person event"
              {...form.getInputProps("isOnline", { type: "checkbox" })}
            />

            {!form.values.isOnline && (
              <TextInput
                label="Location"
                placeholder="e.g., San Francisco, CA"
                required={!form.values.isOnline}
                {...form.getInputProps("location")}
              />
            )}

            <Textarea
              label="Description"
              placeholder="Describe the event, goals, and target audience..."
              minRows={4}
              {...form.getInputProps("description")}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step
          label="Application Questions"
          description="Customize form"
        >
          <Stack gap="md" mt="xl">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Configure application questions for this event
              </Text>
              <Button
                size="xs"
                leftSection={<IconPlus size={16} />}
                onClick={addQuestion}
              >
                Add Question
              </Button>
            </Group>

            <Stack gap="md">
              {form.values.questions.map((question, index) => (
                <Paper key={index} p="md" withBorder>
                  <Group wrap="nowrap" align="flex-start">
                    <Stack gap="xs" pt={8}>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => moveQuestion(index, "up")}
                        disabled={index === 0}
                      >
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === form.values.questions.length - 1}
                      >
                        <IconArrowDown size={16} />
                      </ActionIcon>
                    </Stack>

                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Badge size="sm">{question.order}</Badge>
                        <Badge size="sm" color="blue">
                          {question.questionType}
                        </Badge>
                        {question.required && (
                          <Badge size="sm" color="red">
                            Required
                          </Badge>
                        )}
                      </Group>

                      <TextInput
                        label="Question Key"
                        placeholder="unique_key"
                        size="xs"
                        {...form.getInputProps(
                          `questions.${index}.questionKey`,
                        )}
                      />

                      <TextInput
                        label="Question (English)"
                        placeholder="Enter question in English"
                        {...form.getInputProps(`questions.${index}.questionEn`)}
                      />

                      <TextInput
                        label="Question (Spanish)"
                        placeholder="Enter question in Spanish (optional)"
                        {...form.getInputProps(`questions.${index}.questionEs`)}
                      />

                      <Group grow>
                        <Select
                          label="Type"
                          data={QUESTION_TYPES}
                          {...form.getInputProps(
                            `questions.${index}.questionType`,
                          )}
                        />

                        <Switch
                          label="Required"
                          {...form.getInputProps(
                            `questions.${index}.required`,
                            {
                              type: "checkbox",
                            },
                          )}
                        />
                      </Group>

                      {(question.questionType === "SELECT" ||
                        question.questionType === "MULTISELECT") && (
                        <TextInput
                          label="Options (comma-separated)"
                          placeholder="Option 1, Option 2, Option 3"
                          value={question.options?.join(", ") ?? ""}
                          onChange={(e) => {
                            const options = e.currentTarget.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter((o) => o.length > 0);
                            form.setFieldValue(
                              `questions.${index}.options`,
                              options,
                            );
                          }}
                        />
                      )}
                    </Stack>

                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeQuestion(index)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Review" description="Confirm details">
          <Stack gap="md" mt="xl">
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text fw={600} size="lg">
                  {form.values.name}
                </Text>
                <Group gap="xs">
                  <Badge>{form.values.type}</Badge>
                  <Badge color={form.values.isOnline ? "blue" : "green"}>
                    {form.values.isOnline ? "Online" : "In-person"}
                  </Badge>
                </Group>
                {form.values.description && (
                  <Text size="sm" c="dimmed">
                    {form.values.description}
                  </Text>
                )}
                <Group gap="md" mt="xs">
                  <Text size="sm">
                    <strong>Start:</strong>{" "}
                    {form.values.startDate
                      ? new Date(form.values.startDate).toLocaleDateString()
                      : "Not set"}
                  </Text>
                  <Text size="sm">
                    <strong>End:</strong>{" "}
                    {form.values.endDate
                      ? new Date(form.values.endDate).toLocaleDateString()
                      : "Not set"}
                  </Text>
                </Group>
                {!form.values.isOnline && form.values.location && (
                  <Text size="sm">
                    <strong>Location:</strong> {form.values.location}
                  </Text>
                )}
              </Stack>
            </Paper>

            <Paper p="md" withBorder>
              <Text fw={600} mb="sm">
                Application Questions ({form.values.questions.length})
              </Text>
              <Stack gap="xs">
                {form.values.questions.map((q, idx) => (
                  <Group key={idx} gap="xs">
                    <Badge size="sm">{idx + 1}</Badge>
                    <Text size="sm">{q.questionEn}</Text>
                    <Badge size="xs" color="gray">
                      {q.questionType}
                    </Badge>
                    {q.required && (
                      <Badge size="xs" color="red">
                        Required
                      </Badge>
                    )}
                  </Group>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Text ta="center" mt="xl">
            Event created successfully!
          </Text>
        </Stepper.Completed>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={prevStep} disabled={active === 0}>
          Back
        </Button>

        {active < 2 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} loading={createEvent.isPending}>
            Create Event
          </Button>
        )}
      </Group>
    </Modal>
  );
}
