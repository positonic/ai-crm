import type { PrismaClient } from "@prisma/client";
import { getEmailService } from "~/server/email/emailService";
import { getDisplayName } from "~/utils/userDisplay";

export interface ApplicationCompletionResult {
  isComplete: boolean;
  wasJustCompleted: boolean;
  missingFields: string[];
  completedFields: number;
  totalFields: number;
  completionPercentage: number;
}

/**
 * Check if an application has all required fields completed.
 * When eventId is provided, the application and required questions queries run in parallel.
 */
export async function checkApplicationCompleteness(
  db: PrismaClient,
  applicationId: string,
  eventId?: string,
): Promise<ApplicationCompletionResult> {
  // Start fetching the application (always needed for responses and isComplete status)
  const applicationPromise = db.application.findUnique({
    where: { id: applicationId },
    include: {
      responses: {
        include: {
          question: true,
        },
      },
    },
  });

  // If eventId is known, start fetching required questions in parallel
  const requiredQuestionsPromise = eventId
    ? db.applicationQuestion.findMany({
        where: { eventId, required: true },
        orderBy: { order: "asc" },
      })
    : null;

  const application = await applicationPromise;

  if (!application) {
    throw new Error("Application not found");
  }

  // If we started the query in parallel, await it; otherwise query now
  const allRequiredQuestions = requiredQuestionsPromise
    ? await requiredQuestionsPromise
    : await db.applicationQuestion.findMany({
        where: { eventId: application.eventId, required: true },
        orderBy: { order: "asc" },
      });

  // Filter out conditional fields that shouldn't be required based on user responses
  const requiredQuestions = allRequiredQuestions.filter((question) => {
    // Check for conditional fields using the same logic as the application router
    const questionText = question.questionEn.toLowerCase();
    const isConditionalField =
      questionText.includes("specify") ||
      questionText.includes("if you answered") ||
      questionText.includes("if you did not select") ||
      (questionText.includes("other") && questionText.includes("please"));

    // If it's not a conditional field, it's always required
    if (!isConditionalField) {
      return true;
    }

    // Special handling for technical_skills_other field
    if (question.questionKey === "technical_skills_other") {
      // Only require if "Other" is selected in technical_skills
      const technicalSkillsResponse = application.responses.find(
        (r) =>
          r.question.questionKey === "technical_skills" && r.answer?.trim(),
      );

      if (technicalSkillsResponse) {
        try {
          const selectedSkills: unknown = JSON.parse(
            technicalSkillsResponse.answer,
          );
          return (
            Array.isArray(selectedSkills) && selectedSkills.includes("Other")
          );
        } catch {
          // If not valid JSON, treat as single value
          return technicalSkillsResponse.answer.includes("Other");
        }
      }

      return false; // Don't require if technical_skills is not answered
    }

    // For other conditional fields, don't require them (future enhancement could add more logic here)
    return false;
  });

  const answeredQuestionIds = new Set(
    application.responses
      .filter((r) => {
        if (!r.answer) return false;
        const trimmed = r.answer.trim();
        if (!trimmed) return false;

        // For JSON arrays (multiselect fields), check if array has content
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        }

        // For regular text, just check if not empty
        return true;
      })
      .map((r) => r.questionId),
  );

  const isCurrentlyComplete =
    requiredQuestions.length > 0 &&
    requiredQuestions.every((q) => answeredQuestionIds.has(q.id));

  const wasJustCompleted = !application.isComplete && isCurrentlyComplete;

  const missingFields = requiredQuestions
    .filter((q) => !answeredQuestionIds.has(q.id))
    .map((q) => q.questionKey);

  const completedFields = requiredQuestions.length - missingFields.length;
  const totalFields = requiredQuestions.length;
  const completionPercentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    isComplete: isCurrentlyComplete,
    wasJustCompleted,
    missingFields,
    completedFields,
    totalFields,
    completionPercentage,
  };
}

/**
 * Update application completion status in database
 */
export async function updateApplicationCompletionStatus(
  db: PrismaClient,
  applicationId: string,
  completionResult: ApplicationCompletionResult,
  context?: { isUserIntentionalEdit?: boolean },
): Promise<{ statusReverted: boolean }> {
  // First get the current application to check its status
  const currentApplication = await db.application.findUnique({
    where: { id: applicationId },
    select: { status: true, isComplete: true },
  });

  if (!currentApplication) {
    throw new Error("Application not found");
  }

  const updateData: {
    isComplete: boolean;
    completedAt?: Date;
    lastIncompleteAt?: Date;
    status?:
      | "DRAFT"
      | "SUBMITTED"
      | "UNDER_REVIEW"
      | "ACCEPTED"
      | "REJECTED"
      | "WAITLISTED"
      | "CANCELLED";
  } = {
    isComplete: completionResult.isComplete,
  };

  let statusReverted = false;

  // Only revert SUBMITTED applications to DRAFT in specific cases:
  // 1. The application becomes incomplete (missing required fields)
  // 2. This is explicitly marked as an intentional user edit (not just auto-save)
  if (currentApplication.status === "SUBMITTED") {
    const shouldRevert =
      !completionResult.isComplete || context?.isUserIntentionalEdit;

    if (shouldRevert) {
      updateData.status = "DRAFT";
      statusReverted = true;
      const reason = !completionResult.isComplete
        ? "missing required fields"
        : "intentional field changes";
      console.log(
        `🔄 Reverting SUBMITTED application ${applicationId} back to DRAFT due to ${reason}`,
      );
    } else {
      console.log(
        `✅ Keeping SUBMITTED status for application ${applicationId} - no substantial changes detected`,
      );
    }
  }

  if (completionResult.wasJustCompleted) {
    updateData.completedAt = new Date();
  } else if (!completionResult.isComplete) {
    updateData.lastIncompleteAt = new Date();
  }

  await db.application.update({
    where: { id: applicationId },
    data: updateData,
  });

  return { statusReverted };
}

/**
 * Send submission confirmation email (when actually submitted)
 */
export async function sendSubmissionNotification(
  db: PrismaClient,
  applicationId: string,
): Promise<void> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      event: true,
    },
  });

  if (!application?.user) {
    console.warn(
      `Cannot send submission notification: application ${applicationId} has no associated user`,
    );
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const eventSlug = application.event.slug ?? application.eventId;
  const applicationUrl = `${baseUrl}/events/${eventSlug}/apply`;

  const applicantName = getDisplayName(application.user, "there");

  const applicantFirstName =
    application.user.firstName ??
    application.user.name?.split(" ")[0] ??
    undefined;

  const submittedAt = (
    application.submittedAt ?? new Date()
  ).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const emailService = getEmailService(db);

  const result = await emailService.sendEmail({
    to: application.user.email!,
    templateName: "applicationSubmitted",
    templateData: {
      applicantName,
      applicantFirstName,
      eventName: application.event.name,
      applicationUrl,
      submittedAt,
      contactEmail: process.env.ADMIN_EMAIL ?? "beth@fundingthecommons.io",
    },
    applicationId: application.id,
    eventId: application.eventId,
    userId: application.userId ?? undefined,
  });

  if (result.success) {
    console.log(
      `Submission confirmation email sent to ${application.user.email!} for application ${applicationId}`,
    );
  } else {
    console.error(
      `Failed to send submission notification for application ${applicationId}: ${result.error}`,
    );
  }
}

/**
 * Format field name for display
 */
export function formatFieldName(fieldKey: string): string {
  return fieldKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
