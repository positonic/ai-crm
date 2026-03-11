"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Text,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  NumberInput,
  Checkbox,
  Button,
  Group,
  Alert,
  Paper,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceFloppy,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import AdminFieldsEditor from "./AdminFieldsEditor";
import ProjectManagementSection from "./ProjectManagementSection";
import { getDisplayName } from "~/utils/userDisplay";

type Question = {
  id: string;
  questionKey: string;
  questionEn: string;
  questionEs: string;
  questionType:
    | "TEXT"
    | "TEXTAREA"
    | "EMAIL"
    | "PHONE"
    | "URL"
    | "SELECT"
    | "MULTISELECT"
    | "CHECKBOX"
    | "NUMBER";
  required: boolean;
  options: string[];
  order: number;
};

type ApplicationWithUser = {
  id: string;
  email: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "ACCEPTED"
    | "REJECTED"
    | "WAITLISTED"
    | "CANCELLED";
  submittedAt: Date | null;
  createdAt: Date;
  affiliation: string | null;
  user: {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    name: string | null;
    email: string | null;
    adminNotes: string | null;
    adminWorkExperience: string | null;
    adminLabels: string[];
    adminUpdatedAt: Date | null;
  } | null;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
      questionEn: string;
      questionEs: string;
    };
  }>;
};

interface EditableApplicationFormProps {
  application: ApplicationWithUser;
  eventId: string;
  onSaved: () => void;
}

export default function EditableApplicationForm({
  application,
  eventId,
  onSaved,
}: EditableApplicationFormProps) {
  console.log("🔍 EditableApplicationForm: Component rendered", {
    applicationId: application.id,
    eventId,
    userEmail: application.email,
    responseCount: application.responses.length,
  });

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, unknown>>(
    {},
  );
  const [userName, setUserName] = useState(
    getDisplayName(application.user, ""),
  );
  const [affiliation, setAffiliation] = useState(application.affiliation ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch questions for the event
  const {
    data: questions,
    isLoading: questionsLoading,
    error: questionsError,
  } = api.application.getEventQuestions.useQuery({
    eventId,
  });

  console.log("🔍 EditableApplicationForm: Questions query state", {
    questionsLoading,
    questionsCount: questions?.length,
    questionsError: questionsError?.message,
    eventId,
  });

  // API mutations
  const updateResponse = api.application.updateResponse.useMutation();
  const updateUserName =
    api.application.updateApplicationUserName.useMutation();
  const updateAffiliation =
    api.application.updateApplicationAffiliation.useMutation();
  const bulkUpdateResponses =
    api.application.bulkUpdateApplicationResponses.useMutation();

  // Create stable dependency to prevent infinite loops
  const responsesHash = useMemo(() => {
    return JSON.stringify(
      application.responses.map((r) => ({
        questionKey: r.question.questionKey,
        answer: r.answer,
      })),
    );
  }, [application.responses]);

  // Initialize form values with existing responses
  useEffect(() => {
    console.log("🔍 EditableApplicationForm: useEffect triggered", {
      hasQuestions: !!questions,
      questionsLength: questions?.length,
      applicationResponsesLength: application.responses.length,
    });

    if (questions && questions.length > 0) {
      console.log("🔍 EditableApplicationForm: Initializing form values");
      const initialValues: Record<string, unknown> = {};

      questions.forEach((question) => {
        const existingResponse = application.responses.find(
          (r) => r.question.questionKey === question.questionKey,
        );

        console.log(`🔍 Processing question ${question.questionKey}:`, {
          questionType: question.questionType,
          hasExistingResponse: !!existingResponse,
          existingAnswer: existingResponse?.answer?.substring(0, 100),
        });

        if (existingResponse) {
          if (question.questionType === "MULTISELECT") {
            try {
              // Try JSON parsing first
              const parsed = JSON.parse(existingResponse.answer) as unknown[];
              if (Array.isArray(parsed)) {
                initialValues[question.questionKey] = parsed;
                console.log(
                  `✅ MULTISELECT ${question.questionKey} JSON parsed:`,
                  parsed,
                );
              } else {
                throw new Error("Not an array");
              }
            } catch {
              // Fallback: Handle plain text format (e.g., "Developer / Desarrollador")
              console.log(
                `🔄 MULTISELECT ${question.questionKey} JSON failed, parsing as text:`,
                existingResponse.answer,
              );

              // Extract the English part before " / " if bilingual format
              let cleanAnswer = existingResponse.answer;
              if (cleanAnswer.includes(" / ")) {
                cleanAnswer =
                  cleanAnswer.split(" / ")[0]?.trim() ?? cleanAnswer;
              }

              // Handle comma-separated values or single value
              const textValues = cleanAnswer.includes(",")
                ? cleanAnswer
                    .split(",")
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0)
                : [cleanAnswer.trim()].filter((v) => v.length > 0);

              initialValues[question.questionKey] = textValues;
              console.log(
                `✅ MULTISELECT ${question.questionKey} text parsed:`,
                textValues,
              );
            }
          } else if (question.questionType === "CHECKBOX") {
            initialValues[question.questionKey] =
              existingResponse.answer === "true";
          } else if (question.questionType === "NUMBER") {
            initialValues[question.questionKey] =
              parseFloat(existingResponse.answer) || 0;
          } else {
            initialValues[question.questionKey] = existingResponse.answer;
          }
        } else {
          // Default values for missing responses
          if (question.questionType === "MULTISELECT") {
            initialValues[question.questionKey] = [];
          } else if (question.questionType === "CHECKBOX") {
            initialValues[question.questionKey] = false;
          } else if (question.questionType === "NUMBER") {
            initialValues[question.questionKey] = 0;
          } else {
            initialValues[question.questionKey] = "";
          }
        }
      });

      console.log("🔍 EditableApplicationForm: Setting form values", {
        initialValuesKeys: Object.keys(initialValues),
        initialValuesCount: Object.keys(initialValues).length,
      });
      setFormValues(initialValues);
      setOriginalValues({ ...initialValues }); // Store original values for change tracking
      console.log("✅ EditableApplicationForm: Form values set successfully");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, responsesHash]); // responsesHash prevents infinite loops by hashing application.responses

  // Handle form field changes
  const handleFieldChange = (questionKey: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [questionKey]: value }));
  };

  // Save user name
  const saveUserName = async () => {
    if (!userName.trim()) return;

    setIsSaving(true);
    try {
      await updateUserName.mutateAsync({
        applicationId: application.id,
        name: userName.trim(),
      });

      // Remove individual field notification - only show notification on bulk save
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save name",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save affiliation
  const saveAffiliation = async () => {
    setIsSaving(true);
    try {
      await updateAffiliation.mutateAsync({
        applicationId: application.id,
        affiliation: affiliation.trim() || null,
      });

      // Remove individual field notification - only show notification on bulk save
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save affiliation",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save a specific field
  const saveField = async (questionKey: string, value: unknown) => {
    if (!questions) return;

    const question = questions.find((q) => q.questionKey === questionKey);
    if (!question) return;

    setIsSaving(true);

    try {
      let answerValue: string;
      if (question.questionType === "MULTISELECT") {
        answerValue = JSON.stringify(value);
      } else if (question.questionType === "CHECKBOX") {
        answerValue = String(value);
      } else {
        answerValue = String(value);
      }

      await updateResponse.mutateAsync({
        applicationId: application.id,
        questionId: question.id,
        answer: answerValue,
      });

      // Remove individual field notifications - only show notification on bulk save
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save changes",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to check if two values are different
  const valuesAreDifferent = (original: unknown, current: unknown): boolean => {
    if (Array.isArray(original) && Array.isArray(current)) {
      return JSON.stringify(original.sort()) !== JSON.stringify(current.sort());
    }
    return original !== current;
  };

  // Save all changes using bulk update
  const saveAllChanges = async () => {
    if (!questions) return;

    setIsSaving(true);

    // Show immediate feedback that saving is in progress
    const savingNotificationId = notifications.show({
      title: "Saving...",
      message: "Please wait while your changes are being saved",
      color: "blue",
      icon: <IconCheck />,
      autoClose: false, // Don't auto-close while saving
      loading: true,
    });

    try {
      // Find only changed fields
      const changedResponses = questions
        .filter((question) => {
          const currentValue = formValues[question.questionKey];
          const originalValue = originalValues[question.questionKey];
          return (
            currentValue !== undefined &&
            valuesAreDifferent(originalValue, currentValue)
          );
        })
        .map((question) => {
          const value = formValues[question.questionKey];
          let answerValue: string;

          if (question.questionType === "MULTISELECT") {
            answerValue = JSON.stringify(value);
          } else if (question.questionType === "CHECKBOX") {
            answerValue = String(value);
          } else {
            answerValue = String(value);
          }

          return {
            questionId: question.id,
            answer: answerValue,
          };
        });

      if (changedResponses.length === 0) {
        notifications.hide(savingNotificationId);
        notifications.show({
          title: "No Changes",
          message: "No fields have been modified",
          color: "blue",
          icon: <IconCheck />,
        });
        return;
      }

      // Use bulk update mutation with timeout handling
      await bulkUpdateResponses.mutateAsync({
        applicationId: application.id,
        responses: changedResponses,
      });

      // Update original values to match current values after successful save
      setOriginalValues({ ...formValues });

      // Hide saving notification and show success
      notifications.hide(savingNotificationId);
      notifications.show({
        title: "Saved",
        message: `Updated ${changedResponses.length} field${changedResponses.length === 1 ? "" : "s"} successfully`,
        color: "green",
        icon: <IconCheck />,
        autoClose: 4000,
      });

      onSaved();
    } catch (error) {
      // Hide saving notification and show error
      notifications.hide(savingNotificationId);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to save changes";

      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
        icon: <IconAlertCircle />,
        autoClose: 6000, // Show error longer
      });

      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Render individual question
  const renderQuestion = (question: Question) => {
    console.log(`🔍 Rendering question ${question.questionKey}:`, {
      questionType: question.questionType,
      currentValue: formValues[question.questionKey],
      hasOptions: !!question.options,
      optionsLength: question.options?.length,
    });

    const questionText = question.questionEn; // Use English for admin interface
    const currentValue = formValues[question.questionKey] ?? "";

    const commonProps = {
      label: questionText,
      required: question.required,
      size: "md" as const,
      styles: {
        label: {
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "8px",
          lineHeight: 1.4,
        },
        input: { fontSize: "14px", lineHeight: 1.5 },
      },
    };

    switch (question.questionType) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "URL":
        return (
          <TextInput
            key={question.id}
            {...commonProps}
            type={
              question.questionType === "EMAIL"
                ? "email"
                : question.questionType === "URL"
                  ? "url"
                  : question.questionType === "PHONE"
                    ? "tel"
                    : "text"
            }
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) =>
              handleFieldChange(question.questionKey, event.currentTarget.value)
            }
            onBlur={() => void saveField(question.questionKey, currentValue)}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            key={question.id}
            {...commonProps}
            autosize
            minRows={4}
            maxRows={12}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) =>
              handleFieldChange(question.questionKey, event.currentTarget.value)
            }
            onBlur={() => void saveField(question.questionKey, currentValue)}
          />
        );

      case "SELECT":
        return (
          <Select
            key={question.id}
            data={question.options}
            searchable
            clearable={!question.required}
            {...commonProps}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(value) => {
              const newValue = value ?? "";
              handleFieldChange(question.questionKey, newValue);
              void saveField(question.questionKey, newValue);
            }}
          />
        );

      case "MULTISELECT":
        return (
          <MultiSelect
            key={question.id}
            data={question.options}
            searchable
            clearable={!question.required}
            {...commonProps}
            value={Array.isArray(currentValue) ? currentValue : []}
            onChange={(value) => {
              handleFieldChange(question.questionKey, value);
              void saveField(question.questionKey, value);
            }}
          />
        );

      case "NUMBER":
        return (
          <NumberInput
            key={question.id}
            min={0}
            max={10}
            {...commonProps}
            value={typeof currentValue === "number" ? currentValue : ""}
            onChange={(value) => {
              const newValue = value ?? 0;
              handleFieldChange(question.questionKey, newValue);
              void saveField(question.questionKey, newValue);
            }}
          />
        );

      case "CHECKBOX":
        return (
          <Checkbox
            key={question.id}
            label={questionText}
            checked={Boolean(currentValue)}
            onChange={(event) => {
              const newValue = event.currentTarget.checked;
              handleFieldChange(question.questionKey, newValue);
              void saveField(question.questionKey, newValue);
            }}
          />
        );

      default:
        return (
          <TextInput
            key={question.id}
            {...commonProps}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) =>
              handleFieldChange(question.questionKey, event.currentTarget.value)
            }
            onBlur={() => void saveField(question.questionKey, currentValue)}
          />
        );
    }
  };

  if (questionsLoading) {
    console.log("🔍 EditableApplicationForm: Showing loading state");
    return (
      <Stack align="center" gap="md" p="xl">
        <Text c="dimmed">Loading application form...</Text>
      </Stack>
    );
  }

  if (!questions || questions.length === 0) {
    console.log("🔍 EditableApplicationForm: No questions found");
    return (
      <Alert color="yellow" icon={<IconAlertCircle />}>
        No questions found for this event.
      </Alert>
    );
  }

  console.log("🔍 EditableApplicationForm: About to render main form", {
    questionsCount: questions.length,
    formValuesCount: Object.keys(formValues).length,
    isSaving,
  });

  return (
    <Stack gap="xl">
      <Alert color="blue" icon={<IconDeviceFloppy />} radius="md" p="lg">
        <Text fw={500} mb="xs">
          Auto-save enabled
        </Text>
        <Text size="sm">
          Changes are saved automatically when you move to the next field or
          change selections.
        </Text>
      </Alert>

      {/* User Name Editor */}
      <Paper p="xl" withBorder radius="md">
        <Stack gap="lg">
          <Text fw={600} size="lg">
            Applicant Information
          </Text>
          <TextInput
            label="Applicant Name"
            placeholder="Enter applicant's full name"
            value={userName}
            onChange={(event) => setUserName(event.currentTarget.value)}
            onBlur={saveUserName}
            size="md"
            rightSection={
              userName !== getDisplayName(application.user, "") ? (
                <IconDeviceFloppy size={18} color="orange" />
              ) : (
                <IconCheck size={18} color="green" />
              )
            }
            styles={{
              label: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" },
              input: { fontSize: "14px" },
            }}
          />
          <TextInput
            label="Affiliation"
            placeholder="Enter affiliation (company, organization, etc.)"
            value={affiliation}
            onChange={(event) => setAffiliation(event.currentTarget.value)}
            onBlur={saveAffiliation}
            size="md"
            rightSection={
              affiliation !== (application.affiliation ?? "") ? (
                <IconDeviceFloppy size={18} color="orange" />
              ) : (
                <IconCheck size={18} color="green" />
              )
            }
            styles={{
              label: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" },
              input: { fontSize: "14px" },
            }}
          />
          <Paper p="md" bg="gray.0" radius="sm">
            <Text size="sm" fw={500} c="dimmed">
              Email: {application.email}
            </Text>
          </Paper>
        </Stack>
      </Paper>

      {/* Admin Section - Always visible to admin users */}
      {application.user && (
        <AdminFieldsEditor
          user={{
            id: application.user.id,
            adminNotes: application.user.adminNotes,
            adminWorkExperience: application.user.adminWorkExperience,
            adminLabels: application.user.adminLabels ?? [],
            adminUpdatedAt: application.user.adminUpdatedAt,
          }}
          eventId={eventId}
          disabled={isSaving}
        />
      )}

      {/* Editable form questions */}
      <Stack gap="xl">
        <Text fw={600} size="lg">
          Application Responses
        </Text>
        {questions
          .sort((a, b) => a.order - b.order)
          .map((question) => (
            <Paper key={question.id} p="xl" withBorder radius="md">
              <Stack gap="lg">
                {renderQuestion(question)}
                {question.questionKey === "project_description" && (
                  <ProjectManagementSection userId={application.user?.id} />
                )}
              </Stack>
            </Paper>
          ))}
      </Stack>

      {/* Action buttons */}
      <Paper p="lg" withBorder radius="md" mt="xl">
        <Group justify="flex-end">
          <Button
            onClick={saveAllChanges}
            leftSection={isSaving ? undefined : <IconDeviceFloppy size={16} />}
            loading={isSaving}
            disabled={isSaving}
            color="green"
            size="md"
          >
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
