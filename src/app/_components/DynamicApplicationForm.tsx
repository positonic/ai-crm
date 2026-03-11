"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Loader,
  Paper,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceFloppy,
  IconSend,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import ApplicationProgressIndicator from "./ApplicationProgressIndicator";
import ApplicationCompletionStatus from "./ApplicationCompletionStatus";

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

type ExistingApplication = {
  id: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "ACCEPTED"
    | "REJECTED"
    | "WAITLISTED"
    | "CANCELLED";
  language: string;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
    };
  }>;
};

interface DynamicApplicationFormProps {
  eventId: string;
  existingApplication?: ExistingApplication;
  language: "en" | "es";
  userEmail?: string;
  applicationType?: "RESIDENT" | "MENTOR";
  onSubmitted?: () => void;
  onUpdated?: () => void;
}

export default function DynamicApplicationForm({
  eventId,
  existingApplication,
  language,
  userEmail,
  applicationType = "RESIDENT", // Default to RESIDENT for backward compatibility
  onSubmitted,
  onUpdated,
}: DynamicApplicationFormProps) {
  console.log("🔍 DynamicApplicationForm: Component rendering", {
    eventId,
    existingApplicationId: existingApplication?.id,
    existingStatus: existingApplication?.status,
    responseCount: existingApplication?.responses?.length,
    userEmail,
    language,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(
    existingApplication?.id ?? null,
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const [wasRecentlyReverted, setWasRecentlyReverted] = useState(false);
  const [isSubmittingOrSubmitted, setIsSubmittingOrSubmitted] = useState(
    Boolean(
      existingApplication?.status && existingApplication.status !== "DRAFT",
    ),
  );
  const [hasInitialized, setHasInitialized] = useState(false);
  // Removed timeout refs - no longer needed with onBlur saving
  const prevCompletionPercentage = useRef<number>(-1); // -1 means uninitialized

  console.log("🔍 DynamicApplicationForm: State initialized", {
    applicationId,
    isSaving,
    isSubmittingOrSubmitted,
  });

  // Fetch questions for the event
  const {
    data: questions,
    isLoading: questionsLoading,
    error: questionsError,
  } = api.application.getEventQuestions.useQuery({
    eventId,
  });

  console.log("🔍 DynamicApplicationForm: Questions query", {
    questionsLoading,
    questionsCount: questions?.length,
    questionsError: questionsError?.message,
  });

  // Fetch application completion status
  const {
    data: completionStatus,
    refetch: refetchCompletion,
    error: completionError,
  } = api.application.getApplicationCompletion.useQuery(
    { applicationId: applicationId! },
    { enabled: !!applicationId },
  );

  console.log("🔍 DynamicApplicationForm: Completion query", {
    applicationId,
    completionEnabled: !!applicationId,
    completionStatus: completionStatus?.completionPercentage,
    completionError: completionError?.message,
  });

  // Fetch fresh application data to ensure status is current
  const {
    data: freshApplicationData,
    refetch: refetchApplication,
    error: applicationError,
  } = api.application.getApplication.useQuery(
    { eventId },
    { enabled: !!applicationId },
  );

  console.log("🔍 DynamicApplicationForm: Application query", {
    applicationEnabled: !!applicationId,
    freshApplicationStatus: freshApplicationData?.status,
    applicationError: applicationError?.message,
  });

  // API mutations
  const createApplication = api.application.createApplication.useMutation();
  const updateResponse = api.application.updateResponse.useMutation();
  const submitApplication = api.application.submitApplication.useMutation();

  // Simple state management instead of Mantine form
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  // Removed stableResponses useMemo - using direct prop access during initialization only

  // Create application if it doesn't exist
  const ensureApplication = useCallback(async () => {
    if (applicationId) return applicationId;

    // Prevent multiple simultaneous creation attempts
    if (isCreatingApplication) {
      // Wait for existing creation to complete, then retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      return ensureApplication();
    }

    setIsCreatingApplication(true);
    try {
      const application = await createApplication.mutateAsync({
        eventId,
        language,
        applicationType, // Pass through the applicationType prop
      });
      setApplicationId(application.id);
      return application.id;
    } catch (error) {
      // Backend now handles race conditions gracefully, so we shouldn't get errors
      // Only log for debugging, don't show user error notifications
      console.warn("Application creation handled by backend:", error);

      // If we still get an error, it's likely a real issue
      notifications.show({
        title: "Error",
        message:
          "Unable to initialize application. Please refresh and try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      throw error;
    } finally {
      setIsCreatingApplication(false);
    }
  }, [
    applicationId,
    isCreatingApplication,
    createApplication,
    eventId,
    language,
    applicationType,
  ]);

  // Initialize form values ONCE when questions load (prevent infinite loops)
  useEffect(() => {
    console.log("🔍 DynamicApplicationForm: Main useEffect triggered", {
      hasQuestions: !!questions,
      questionsLength: questions?.length,
      hasInitialized,
      existingApplicationId: existingApplication?.id,
    });

    if (questions && questions.length > 0 && !hasInitialized) {
      console.log(
        "🔍 DynamicApplicationForm: Starting ONE-TIME form initialization",
      );
      setHasInitialized(true);

      const initialValues: Record<string, unknown> = {};

      questions.forEach((question) => {
        // Set initial value from existing response or empty (use prop directly at initialization)
        const existingResponse = existingApplication?.responses.find(
          (r) => r.question.questionKey === question.questionKey,
        );

        let initialValue: unknown = "";
        if (existingResponse) {
          if (question.questionType === "MULTISELECT") {
            try {
              // Try JSON parsing first
              const parsed = JSON.parse(existingResponse.answer) as unknown[];
              if (Array.isArray(parsed)) {
                initialValue = parsed;
              } else {
                throw new Error("Not an array");
              }
            } catch {
              // Fallback: Handle plain text format (e.g., "Developer / Desarrollador")
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

              initialValue = textValues;
            }
          } else if (question.questionType === "CHECKBOX") {
            initialValue = existingResponse.answer === "true";
          } else if (question.questionType === "NUMBER") {
            initialValue = parseFloat(existingResponse.answer) || 0;
          } else {
            initialValue = existingResponse.answer;
          }
        } else {
          // Auto-fill email field with user's email
          if (question.questionKey === "email" && userEmail) {
            initialValue = userEmail;
          } else if (question.questionType === "MULTISELECT") {
            initialValue = [];
          } else if (question.questionType === "CHECKBOX") {
            // Set default values for common agreement/availability questions
            const questionText = (
              language === "es" ? question.questionEs : question.questionEn
            ).toLowerCase();
            if (
              questionText.includes("terms") ||
              questionText.includes("conditions") ||
              questionText.includes("available") ||
              questionText.includes("duration")
            ) {
              initialValue = true; // Default to "yes/agree"
            } else {
              initialValue = false;
            }
          } else if (question.questionType === "NUMBER") {
            initialValue = 0;
          } else {
            initialValue = "";
          }
        }

        initialValues[question.questionKey] = initialValue;
      });

      console.log("🔍 DynamicApplicationForm: Setting form values", {
        initialValuesCount: Object.keys(initialValues).length,
        initialValuesKeys: Object.keys(initialValues).slice(0, 5), // First 5 keys for debugging
      });

      setFormValues(initialValues);
      console.log(
        "✅ DynamicApplicationForm: ONE-TIME form initialization complete",
      );

      // Auto-save read-only fields that are pre-populated (like email)
      const emailQuestion = questions.find((q) => q.questionKey === "email");
      if (emailQuestion && userEmail && initialValues.email === userEmail) {
        console.log("🔍 Auto-saving pre-populated email field:", userEmail);
        // Auto-save email after form initialization (always save, backend will handle duplicates)
        setTimeout(() => {
          void (async () => {
            try {
              const appId = applicationId ?? (await ensureApplication());
              await updateResponse.mutateAsync({
                applicationId: appId,
                questionId: emailQuestion.id,
                answer: userEmail,
              });
              console.log("✅ Email auto-save successful");
              onUpdated?.(); // Trigger parent update
            } catch (error) {
              console.error("❌ Email auto-save failed:", error);
            }
          })();
        }, 500); // Small delay to ensure form is fully initialized
      }
    } else {
      console.log(
        "🔍 DynamicApplicationForm: Skipping initialization - no questions, already initialized, or questions not loaded",
      );
    }
  }, [
    questions,
    hasInitialized,
    userEmail,
    applicationId,
    updateResponse,
    ensureApplication,
    onUpdated,
  ]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: Intentionally excluding existingApplication?.responses to prevent infinite loops

  // Simplified: removed session tracking to reduce complexity

  // Use fresh completionStatus data instead of stale existingApplication prop
  const currentStatus =
    completionStatus?.status ??
    freshApplicationData?.status ??
    existingApplication?.status ??
    "DRAFT";

  // Status validation safeguard
  const validStatuses = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "CANCELLED",
  ];
  const safeCurrentStatus = validStatuses.includes(currentStatus)
    ? currentStatus
    : "DRAFT";

  const canEdit =
    safeCurrentStatus === "DRAFT" ||
    safeCurrentStatus === "SUBMITTED" ||
    safeCurrentStatus === "UNDER_REVIEW";
  const isSubmitted =
    Boolean(safeCurrentStatus !== "DRAFT") || isSubmittingOrSubmitted;

  // Track status changes to detect reversion from SUBMITTED to DRAFT
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      prevStatusRef.current === "SUBMITTED" &&
      safeCurrentStatus === "DRAFT"
    ) {
      setWasRecentlyReverted(true);
      // Reset local submission state to allow completion components to show again
      setIsSubmittingOrSubmitted(false);
      console.log(
        "📝 Status reverted from SUBMITTED to DRAFT - application needs re-submission, UI re-enabled",
      );

      // Clear the reversion flag after a few seconds
      setTimeout(() => {
        setWasRecentlyReverted(false);
      }, 10000);
    }
    prevStatusRef.current = safeCurrentStatus;
  }, [safeCurrentStatus]);

  // Show completion notification only when application actually transitions to 100% complete
  useEffect(() => {
    if (completionStatus && applicationId) {
      const currentPercentage = completionStatus.completionPercentage;
      const previousPercentage = prevCompletionPercentage.current;

      // Only show notification when completion percentage goes from <100% to 100%
      // (not on initial page load with already-complete applications)
      if (
        previousPercentage >= 0 &&
        previousPercentage < 100 &&
        currentPercentage === 100
      ) {
        notifications.show({
          title: "Application Complete! 🎉",
          message: `All ${completionStatus.totalFields} required fields have been filled. Your application is ready to submit!`,
          color: "green",
          icon: <IconCheck />,
          autoClose: 5000,
        });
        console.log(
          `🎉 Application ${applicationId} completed - transition from ${previousPercentage}% to 100%`,
        );
      }

      // Update the previous percentage for next comparison
      if (currentPercentage >= 0) {
        prevCompletionPercentage.current = currentPercentage;
      }
    }
  }, [completionStatus, applicationId]);

  // Removed complex auto-save functionality - now using simple onBlur saving

  // Simple field save function (no debouncing, called onBlur)
  const saveField = useCallback(
    async (questionKey: string, value: unknown) => {
      if (!questions) return;

      const question = questions.find((q) => q.questionKey === questionKey);
      if (!question) return;

      // Don't auto-save if application is in final status (prevent reversion)
      if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(safeCurrentStatus)) {
        console.log(
          `🚫 Skipping auto-save for field ${questionKey} - application status is ${safeCurrentStatus}`,
        );
        return;
      }

      // Ensure application exists before saving
      let appId = applicationId;
      if (!appId) {
        try {
          appId = await ensureApplication();
        } catch (error) {
          console.error("Failed to create application before saving:", error);
          notifications.show({
            title: "Error",
            message: "Unable to save data. Please refresh and try again.",
            color: "red",
            icon: <IconAlertCircle />,
          });
          return;
        }
      }

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
          applicationId: appId,
          questionId: question.id,
          answer: answerValue,
        });

        setLastSaved(new Date());
        onUpdated?.();
      } catch (error: unknown) {
        console.error("Error saving field:", error);

        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Failed to save your response";

        notifications.show({
          title: "Error",
          message: errorMessage,
          color: "red",
          icon: <IconAlertCircle />,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      applicationId,
      questions,
      updateResponse,
      onUpdated,
      ensureApplication,
      safeCurrentStatus,
    ],
  );

  // Save all current form data as draft
  const saveDraft = useCallback(async () => {
    if (!questions) return;

    setIsSaving(true);
    try {
      // Ensure application exists before saving
      await ensureApplication();

      // Save all non-empty form values
      const savePromises = [];
      for (const question of questions) {
        const value = formValues[question.questionKey];
        if (value && (typeof value === "string" ? value.trim() : true)) {
          savePromises.push(saveField(question.questionKey, value));
        }
      }

      await Promise.all(savePromises);

      notifications.show({
        title: "Draft Saved Successfully",
        message:
          "All your progress has been saved. You can safely leave and return later.",
        color: "green",
        icon: <IconCheck />,
      });
    } catch (error: unknown) {
      console.error("Error saving draft:", error);
      notifications.show({
        title: "Error Saving Draft",
        message: "Some changes may not have been saved. Please try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  }, [questions, formValues, ensureApplication, saveField]);

  // Handle form field changes (local state only, no auto-save)
  const handleFieldChange = useCallback(
    (questionKey: string, value: unknown) => {
      setFormValues((prev) => ({ ...prev, [questionKey]: value }));

      // Clear validation error for this field if it now has a value
      if (validationErrors[questionKey]) {
        const hasValue =
          value &&
          ((typeof value === "string" && value.trim()) ||
            (Array.isArray(value) && value.length > 0) ||
            (typeof value === "boolean" && value) ||
            typeof value === "number");

        if (hasValue) {
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[questionKey];
            return newErrors;
          });
        }
      }
    },
    [validationErrors],
  );

  // Removed complex email auto-save - email is read-only and pre-filled

  // Removed timeout cleanup - no longer needed

  // Note: Removed debug logging and consistency check effects to simplify component

  // Shared function to detect conditional fields (used by validation and scroll logic)
  const isConditionalField = useCallback(
    (question: Question) => {
      const questionText =
        language === "es" ? question.questionEs : question.questionEn;
      return (
        questionText.toLowerCase().includes("specify") ||
        questionText.toLowerCase().includes("if you answered") ||
        questionText.toLowerCase().includes("if you did not select") ||
        (questionText.toLowerCase().includes("other") &&
          questionText.toLowerCase().includes("please"))
      );
    },
    [language],
  );

  // Get actually required questions (excluding conditional fields)
  const actuallyRequiredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => q.required && !isConditionalField(q));
  }, [questions, isConditionalField]);

  // Client-side form completion validation (single source of truth during editing)
  const isFormComplete = useMemo(() => {
    return actuallyRequiredQuestions.every((question) => {
      const value = formValues[question.questionKey];

      if (question.questionType === "MULTISELECT") {
        return Array.isArray(value) && value.length > 0;
      } else if (question.questionType === "CHECKBOX") {
        return Boolean(value);
      } else {
        return value && (typeof value === "string" ? value.trim() : true);
      }
    });
  }, [formValues, actuallyRequiredQuestions]);

  // Client-side missing fields calculation (for yellow box display)
  const missingFields = useMemo(() => {
    return actuallyRequiredQuestions
      .filter((question) => {
        const value = formValues[question.questionKey];

        if (question.questionType === "MULTISELECT") {
          return !Array.isArray(value) || value.length === 0;
        } else if (question.questionType === "CHECKBOX") {
          return !Boolean(value);
        } else {
          return !value || (typeof value === "string" && !value.trim());
        }
      })
      .map((q) => q.questionKey);
  }, [actuallyRequiredQuestions, formValues]);

  // Enhanced form validation that's resilient to state changes
  const validateForm = () => {
    if (!questions) return false;

    const errors: Record<string, string> = {};
    // Use the same required questions as completion validation
    const requiredQuestions = actuallyRequiredQuestions;

    for (const question of requiredQuestions) {
      const value = formValues[question.questionKey];
      const questionText =
        language === "es" ? question.questionEs : question.questionEn;

      // Special handling for email field - check if it's the user's email
      if (question.questionKey === "email") {
        if (!value || (typeof value === "string" && !value.trim())) {
          // If email field is empty but we have userEmail, auto-fill it
          if (userEmail) {
            setFormValues((prev) => ({ ...prev, email: userEmail }));
            // Auto-save to database
            void handleFieldChange("email", userEmail);
            continue; // Skip error for this field
          } else {
            errors[question.questionKey] = `${questionText} is required`;
          }
        }
      } else if (question.questionType === "MULTISELECT") {
        if (!Array.isArray(value) || value.length === 0) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      } else if (question.questionType === "CHECKBOX") {
        if (!value) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      } else {
        if (!value || (typeof value === "string" && !value.trim())) {
          errors[question.questionKey] = `${questionText} is required`;
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitAttempted(true);

    // Always ensure application exists first
    let appId: string;
    try {
      appId = await ensureApplication();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to create application",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    // Use client-side validation (no server round trips needed)

    if (!validateForm()) {
      // Find first missing required field for scroll-to-error (use same filtering as validation)
      const firstMissingQuestion = actuallyRequiredQuestions.find(
        (question) => {
          const value = formValues[question.questionKey];
          if (question.questionType === "MULTISELECT") {
            return !Array.isArray(value) || value.length === 0;
          } else if (question.questionType === "CHECKBOX") {
            return !value;
          } else {
            return !value || (typeof value === "string" && !value.trim());
          }
        },
      );

      // Scroll to first missing field
      if (firstMissingQuestion) {
        const element = document.getElementById(
          `field-${firstMissingQuestion.questionKey}`,
        );
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
          // Focus the input after scroll
          setTimeout(() => {
            const input = element.querySelector("input, select, textarea");
            if (input) {
              (input as HTMLElement).focus();
            }
          }, 500);
        }
      }

      notifications.show({
        title: "Please Complete Required Fields",
        message: "All fields marked in red must be completed before submitting",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    try {
      await submitApplication.mutateAsync({
        applicationId: appId,
      });

      // Immediately update local state to hide completion components
      setIsSubmittingOrSubmitted(true);

      // Force refresh of application status data
      await Promise.all([refetchCompletion(), refetchApplication()]);

      notifications.show({
        title: "Success!",
        message: "Your application has been submitted successfully",
        color: "green",
        icon: <IconCheck />,
      });

      onSubmitted?.();
    } catch (error: unknown) {
      console.error("Submit error:", error);

      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to submit application";

      // Check if it's the "already submitted" error and refresh the page
      if (errorMessage.includes("already been submitted")) {
        notifications.show({
          title: "Application Already Submitted",
          message:
            "This application has already been submitted. Refreshing the page...",
          color: "yellow",
          icon: <IconAlertCircle />,
        });

        // Refresh the page to show the correct state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        notifications.show({
          title: "Error",
          message: errorMessage,
          color: "red",
          icon: <IconAlertCircle />,
        });
      }
    }
  };

  // Comprehensive list of countries for nationality dropdown
  const countries = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahrain",
    "Bangladesh",
    "Belarus",
    "Belgium",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Brazil",
    "Bulgaria",
    "Cambodia",
    "Canada",
    "Chile",
    "China",
    "Colombia",
    "Croatia",
    "Czech Republic",
    "Denmark",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "Estonia",
    "Ethiopia",
    "Finland",
    "France",
    "Germany",
    "Ghana",
    "Greece",
    "Guatemala",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "South Korea",
    "Kuwait",
    "Latvia",
    "Lebanon",
    "Lithuania",
    "Luxembourg",
    "Malaysia",
    "Mexico",
    "Morocco",
    "Netherlands",
    "New Zealand",
    "Nigeria",
    "Norway",
    "Pakistan",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Romania",
    "Russia",
    "Saudi Arabia",
    "Serbia",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "South Africa",
    "Spain",
    "Sri Lanka",
    "Sweden",
    "Switzerland",
    "Thailand",
    "Turkey",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Venezuela",
    "Vietnam",
    "Other",
  ];

  // Render individual question
  const renderQuestion = (question: Question) => {
    const questionText =
      language === "es" ? question.questionEs : question.questionEn;
    const currentValue = formValues[question.questionKey] ?? "";
    const hasError = submitAttempted && validationErrors[question.questionKey];
    const errorMessage = validationErrors[question.questionKey];

    // Handle nationality field specially
    if (
      question.questionKey === "nationality" ||
      questionText.toLowerCase().includes("nationality")
    ) {
      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <Select
            data={countries}
            searchable
            clearable={!question.required}
            label={questionText}
            required={question.required}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={async (value) => {
              const newValue = value ?? "";
              handleFieldChange(question.questionKey, newValue);
              // Save immediately for select fields (single choice)
              await ensureApplication();
              void saveField(question.questionKey, newValue);
            }}
            error={hasError ? errorMessage : undefined}
            styles={
              hasError
                ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                : undefined
            }
          />
        </div>
      );
    }

    // Handle "specify other" or conditional fields (make them non-required)
    if (
      questionText.toLowerCase().includes("specify") ||
      questionText.toLowerCase().includes("other") ||
      questionText.toLowerCase().includes("if you answered") ||
      questionText.toLowerCase().includes("if you did not select")
    ) {
      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <TextInput
            label={questionText}
            required={false} // Override to make non-required
            placeholder={
              questionText.toLowerCase().includes("n/a")
                ? "Enter N/A if not applicable"
                : undefined
            }
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) =>
              handleFieldChange(question.questionKey, event.currentTarget.value)
            }
            onBlur={async () => {
              await ensureApplication();
              void saveField(question.questionKey, currentValue);
            }}
            error={hasError ? errorMessage : undefined}
            styles={
              hasError
                ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                : undefined
            }
          />
        </div>
      );
    }

    // Handle social media fields specially (handle input with URL preview)
    if (
      question.questionKey === "twitter" ||
      question.questionKey === "github" ||
      question.questionKey === "linkedin"
    ) {
      let urlFormat = "";
      let placeholder = "";

      switch (question.questionKey) {
        case "twitter":
          urlFormat = "https://x.com/[handle]";
          placeholder = "yourusername";
          break;
        case "github":
          urlFormat = "https://github.com/[handle]";
          placeholder = "yourusername";
          break;
        case "linkedin":
          urlFormat = "https://linkedin.com/in/[handle]";
          placeholder = "yourprofile";
          break;
      }

      // Extract handle from existing URL if present
      let displayValue = "";
      if (typeof currentValue === "string" && currentValue) {
        if (currentValue.startsWith("http")) {
          // Extract handle from URL
          const urlParts = currentValue.split("/");
          displayValue = urlParts[urlParts.length - 1] ?? "";
        } else {
          // Already a handle
          displayValue = currentValue;
        }
      }

      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <TextInput
            label={`${question.questionKey.charAt(0).toUpperCase() + question.questionKey.slice(1)} Handle → ${urlFormat}`}
            required={question.required}
            placeholder={placeholder}
            value={displayValue}
            onChange={(event) => {
              const handle = event.currentTarget.value;
              // Store as full URL for backend compatibility
              const fullUrl = handle
                ? `${urlFormat.replace("[handle]", handle)}`
                : "";
              handleFieldChange(question.questionKey, fullUrl);
            }}
            onBlur={async () => {
              // Get current value from form state (the full URL)
              const currentFormValue = formValues[
                question.questionKey
              ] as string;
              await ensureApplication();
              void saveField(question.questionKey, currentFormValue || "");
            }}
            error={hasError ? errorMessage : undefined}
            styles={
              hasError
                ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                : undefined
            }
          />
        </div>
      );
    }

    // Handle cohort contribution specially (always multiline)
    if (question.questionKey === "cohort_contribution") {
      return (
        <div key={question.id} id={`field-${question.questionKey}`}>
          <Textarea
            label={questionText}
            required={question.required}
            rows={4}
            autosize
            minRows={3}
            maxRows={8}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) =>
              handleFieldChange(question.questionKey, event.currentTarget.value)
            }
            onBlur={() => void saveField(question.questionKey, currentValue)}
            error={hasError ? errorMessage : undefined}
            styles={
              hasError
                ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                : undefined
            }
          />
        </div>
      );
    }

    switch (question.questionType) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "URL":
        const isEmailField =
          question.questionKey === "email" || question.questionType === "EMAIL";
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <TextInput
              label={questionText}
              required={question.required}
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
              readOnly={isEmailField}
              placeholder={
                isEmailField
                  ? "Your account email (cannot be changed)"
                  : undefined
              }
              onChange={
                isEmailField
                  ? undefined
                  : (event) =>
                      handleFieldChange(
                        question.questionKey,
                        event.currentTarget.value,
                      )
              }
              onBlur={
                isEmailField
                  ? undefined
                  : () => void saveField(question.questionKey, currentValue)
              }
              error={hasError ? errorMessage : undefined}
              styles={{
                input: {
                  backgroundColor: isEmailField ? "#f9fafb" : undefined,
                  cursor: isEmailField ? "not-allowed" : undefined,
                  ...(hasError
                    ? { borderColor: "var(--mantine-color-red-6)" }
                    : {}),
                },
              }}
            />
          </div>
        );

      case "TEXTAREA":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <Textarea
              label={questionText}
              required={question.required}
              rows={4}
              autosize
              minRows={3}
              maxRows={10}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(event) =>
                handleFieldChange(
                  question.questionKey,
                  event.currentTarget.value,
                )
              }
              onBlur={() => void saveField(question.questionKey, currentValue)}
              error={hasError ? errorMessage : undefined}
              styles={
                hasError
                  ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                  : undefined
              }
            />
          </div>
        );

      case "SELECT":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <Select
              data={question.options}
              searchable={false}
              clearable={!question.required}
              label={questionText}
              required={question.required}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={async (value) => {
                const newValue = value ?? "";
                handleFieldChange(question.questionKey, newValue);
                // Save immediately for select fields (single choice)
                await ensureApplication();
                void saveField(question.questionKey, newValue);
              }}
              error={hasError ? errorMessage : undefined}
              styles={
                hasError
                  ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                  : undefined
              }
            />
          </div>
        );

      case "MULTISELECT":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <MultiSelect
              data={question.options}
              searchable={false}
              clearable={!question.required}
              label={questionText}
              required={question.required}
              value={Array.isArray(currentValue) ? currentValue : []}
              onChange={async (value) => {
                handleFieldChange(question.questionKey, value);
                // Save immediately for multiselect fields (selection change)
                await ensureApplication();
                void saveField(question.questionKey, value);
              }}
              error={hasError ? errorMessage : undefined}
              styles={
                hasError
                  ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                  : undefined
              }
            />
          </div>
        );

      case "NUMBER":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <NumberInput
              min={0}
              max={10}
              label={questionText}
              required={question.required}
              value={typeof currentValue === "number" ? currentValue : ""}
              onChange={(value) =>
                handleFieldChange(question.questionKey, value || 0)
              }
              onBlur={async () => {
                await ensureApplication();
                void saveField(question.questionKey, currentValue);
              }}
              error={hasError ? errorMessage : undefined}
              styles={
                hasError
                  ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                  : undefined
              }
            />
          </div>
        );

      case "CHECKBOX":
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <Checkbox
              label={questionText}
              checked={Boolean(currentValue)}
              onChange={async (event) => {
                const newValue = event.currentTarget.checked;
                handleFieldChange(question.questionKey, newValue);
                // Save immediately for checkbox (single action)
                await ensureApplication();
                void saveField(question.questionKey, newValue);
              }}
              error={hasError ? errorMessage : undefined}
            />
            {hasError && (
              <Text size="sm" c="red" mt="xs">
                {errorMessage}
              </Text>
            )}
          </div>
        );

      default:
        return (
          <div key={question.id} id={`field-${question.questionKey}`}>
            <TextInput
              label={questionText}
              required={question.required}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(event) =>
                handleFieldChange(
                  question.questionKey,
                  event.currentTarget.value,
                )
              }
              onBlur={async () => {
                await ensureApplication();
                void saveField(question.questionKey, currentValue);
              }}
              error={hasError ? errorMessage : undefined}
              styles={
                hasError
                  ? { input: { borderColor: "var(--mantine-color-red-6)" } }
                  : undefined
              }
            />
          </div>
        );
    }
  };

  if (questionsLoading) {
    console.log("🔍 DynamicApplicationForm: Showing loading state");
    return (
      <Paper p="xl">
        <Stack align="center" gap="md">
          <Loader />
          <Text c="dimmed">Loading application form...</Text>
        </Stack>
      </Paper>
    );
  }

  if (!questions || questions.length === 0) {
    console.log("🔍 DynamicApplicationForm: No questions available");
    return (
      <Alert color="yellow" icon={<IconAlertCircle />}>
        No application questions are available for this event.
      </Alert>
    );
  }

  console.log("🔍 DynamicApplicationForm: About to render main form", {
    questionsCount: questions.length,
    formValuesCount: Object.keys(formValues).length,
    canEdit,
    isSubmitted,
    applicationId,
    completionStatusExists: !!completionStatus,
  });

  return (
    <div>
      <Stack gap="lg">
        {/* Progress Indicator */}
        {canEdit && applicationId && questions && (
          <ApplicationProgressIndicator
            completedFields={
              Object.values(formValues).filter(
                (v) => v && (typeof v === "string" ? v.trim() : true),
              ).length
            }
            totalFields={questions.filter((q) => q.required).length}
            completionPercentage={Math.round(
              (Object.values(formValues).filter(
                (v) => v && (typeof v === "string" ? v.trim() : true),
              ).length /
                questions.filter((q) => q.required).length) *
                100,
            )}
          />
        )}

        {/* Completion Status */}
        {canEdit && applicationId && questions && (
          <ApplicationCompletionStatus
            isComplete={isFormComplete}
            isSubmitted={isSubmitted}
            missingFields={missingFields}
            onSubmit={handleSubmit}
            wasReverted={wasRecentlyReverted}
            shouldShowMissingFields={
              Boolean(submitAttempted) || // Show if they tried to submit
              Boolean(
                existingApplication && Object.keys(formValues).length > 5,
              ) || // Show if has substantial progress
              Boolean(wasRecentlyReverted) // Show if application was reverted from submitted
            }
          />
        )}

        {/* Enhanced auto-save indicator and Save Draft button */}
        {canEdit && applicationId && (
          <Group justify="space-between" align="center">
            <Group gap="xs">
              {isSaving ? (
                <>
                  <Loader size="xs" />
                  <Text size="sm" c="blue">
                    Auto-saving changes...
                  </Text>
                </>
              ) : lastSaved ? (
                <>
                  <IconCheck size={16} color="green" />
                  <Text size="sm" c="green">
                    Auto-saved at {lastSaved.toLocaleTimeString()}
                  </Text>
                </>
              ) : (
                <>
                  <IconDeviceFloppy size={16} color="orange" />
                  <Text size="sm" c="dimmed">
                    Changes save automatically when you leave each field
                  </Text>
                </>
              )}
            </Group>

            <Button
              variant="filled"
              size="sm"
              color="blue"
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={saveDraft}
              loading={isSaving}
              disabled={isSubmitted}
              title="Save all your current progress. Useful before recording video or taking a break."
            >
              Save Draft
            </Button>
          </Group>
        )}

        {/* Application form questions */}
        <Stack gap="md">
          {questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <div key={question.id}>
                {canEdit ? (
                  renderQuestion(question)
                ) : (
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      {language === "es"
                        ? question.questionEs
                        : question.questionEn}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {formValues[question.questionKey]
                        ? String(formValues[question.questionKey])
                        : (existingApplication?.responses.find(
                            (r) =>
                              r.question.questionKey === question.questionKey,
                          )?.answer ?? "No response")}
                    </Text>
                  </Stack>
                )}
                {index < questions.length - 1 && <Divider />}
              </div>
            ))}
        </Stack>

        {/* Form actions */}
        {canEdit && !isSubmitted && completionStatus && (
          <Stack gap="sm" mt="xl">
            {(!completionStatus.isComplete ||
              safeCurrentStatus !== "DRAFT" ||
              isSubmittingOrSubmitted) && (
              <Text size="sm" c="dimmed" ta="right">
                {safeCurrentStatus !== "DRAFT" || isSubmittingOrSubmitted
                  ? "Application has already been submitted"
                  : "Complete all required fields to submit"}
              </Text>
            )}
            <Group justify="flex-end">
              <Button
                onClick={handleSubmit}
                size="lg"
                leftSection={<IconSend size={16} />}
                loading={submitApplication.isPending}
                disabled={
                  safeCurrentStatus !== "DRAFT" || isSubmittingOrSubmitted
                }
              >
                {language === "es" ? "Enviar Aplicación" : "Submit Application"}
              </Button>
            </Group>
          </Stack>
        )}

        {isSubmitted && (
          <Alert color="blue" icon={<IconCheck />}>
            {language === "es"
              ? `Tu aplicación está en estado: ${safeCurrentStatus.replace("_", " ")}`
              : `Your application status: ${safeCurrentStatus.replace("_", " ")}`}
            {safeCurrentStatus === "SUBMITTED" && (
              <Text size="sm" mt="xs">
                {language === "es"
                  ? "Tu aplicación ha sido enviada y está pendiente de revisión."
                  : "Your application has been submitted and is pending review."}
              </Text>
            )}
          </Alert>
        )}
      </Stack>
    </div>
  );
}
