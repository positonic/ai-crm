import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import {
  sendEmail,
  generateMissingInfoEmail,
  isEmailSendingSafe,
} from "~/lib/email";

/**
 * Resolve event identifier (ID or slug) to actual event ID.
 * Tries ID first, then slug for backward compatibility.
 */
async function resolveEventId(
  db: PrismaClient,
  identifier: string,
): Promise<string | null> {
  // Try by ID first
  const eventById = await db.event.findUnique({
    where: { id: identifier },
    select: { id: true },
  });
  if (eventById) return eventById.id;

  // Try by slug
  const eventBySlug = await db.event.findUnique({
    where: { slug: identifier },
    select: { id: true },
  });
  return eventBySlug?.id ?? null;
}

// Input schemas
const CheckMissingInfoSchema = z.object({
  applicationId: z.string(),
});

const CreateMissingInfoEmailSchema = z.object({
  applicationId: z.string(),
});

const SendEmailSchema = z.object({
  emailId: z.string(),
  bypassSafety: z.boolean().optional(),
});

const GetApplicationEmailsSchema = z.object({
  applicationId: z.string(),
});

const GetEventEmailsSchema = z.object({
  eventId: z.string(),
  status: z.enum(["DRAFT", "QUEUED", "SENT", "FAILED", "CANCELLED"]).optional(),
});

const UpdateEmailSchema = z.object({
  emailId: z.string(),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
});

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

// Helper function to validate application and find missing fields
import type { db } from "~/server/db";

interface ValidationContext {
  db: typeof db;
}

async function validateApplicationFields(
  applicationId: string,
  ctx: ValidationContext,
) {
  // Get the application with its responses and questions
  const application = await ctx.db.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      event: true,
      responses: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!application) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Application not found",
    });
  }

  console.log("🔍 DEBUG: validateApplicationFields called for application:", {
    applicationId,
    email: application.email,
    status: application.status,
    totalResponses: application.responses.length,
  });

  // Get all required questions for this event
  const allRequiredQuestions = await ctx.db.applicationQuestion.findMany({
    where: {
      eventId: application.eventId,
      required: true,
    },
    orderBy: { order: "asc" },
  });

  console.log("🔍 DEBUG: allRequiredQuestions:", {
    count: allRequiredQuestions.length,
    questions: allRequiredQuestions.map((q) => ({
      id: q.id,
      questionKey: q.questionKey,
      questionType: q.questionType,
      questionEn: q.questionEn.substring(0, 100) + "...",
      required: q.required,
      options: q.options?.slice(0, 3), // First 3 options only
    })),
  });

  // Filter out conditional fields that shouldn't be required
  const requiredQuestions = allRequiredQuestions.filter((question) => {
    const questionText = question.questionEn.toLowerCase();
    const isConditionalField =
      questionText.includes("specify") ||
      questionText.includes("if you answered") ||
      questionText.includes("if you did not select") ||
      questionText.includes("in the previous question");

    if (!isConditionalField) {
      return true; // Always required
    }

    console.log(
      `🔍 DEBUG: Found conditional field "${question.questionKey}":`,
      {
        questionText: question.questionEn.substring(0, 80),
        isConditionalField,
        questionKey: question.questionKey,
      },
    );

    // Special handling for technical_skills_other
    if (question.questionKey === "technical_skills_other") {
      const techSkillsResponse = application.responses.find(
        (r) => r.question.questionKey === "technical_skills",
      );

      console.log(`🔍 DEBUG: technical_skills_other conditional analysis:`, {
        questionId: question.id,
        hasTechSkillsResponse: !!techSkillsResponse,
        techSkillsResponseId: techSkillsResponse?.id,
        techSkillsQuestionId: techSkillsResponse?.questionId,
        techSkillsAnswer: techSkillsResponse?.answer,
        techSkillsAnswerLength: techSkillsResponse?.answer?.length,
      });

      if (techSkillsResponse?.answer) {
        try {
          const selectedSkills = JSON.parse(
            techSkillsResponse.answer,
          ) as unknown;
          const includesOther =
            Array.isArray(selectedSkills) &&
            (selectedSkills as string[]).includes("Other");
          console.log(`🔍 DEBUG: technical_skills JSON parsing successful:`, {
            originalAnswer: techSkillsResponse.answer,
            parsedSkills: selectedSkills,
            isArray: Array.isArray(selectedSkills),
            includesOther,
            shouldBeRequired: includesOther,
          });
          return includesOther;
        } catch (parseError) {
          // If not JSON, check string contains "Other"
          const includesOtherString =
            techSkillsResponse.answer.includes("Other");
          console.log(
            `🔍 DEBUG: technical_skills JSON parsing failed, checking string:`,
            {
              originalAnswer: techSkillsResponse.answer,
              parseError:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
              includesOtherString,
              shouldBeRequired: includesOtherString,
            },
          );
          return includesOtherString;
        }
      }

      console.log(
        `🔍 DEBUG: technical_skills_other not required - no technical_skills response`,
      );
      return false; // Don't require if no technical_skills response
    }

    return false; // Other conditional fields not required
  });

  console.log("🔍 DEBUG: requiredQuestions after filtering:", {
    totalRequired: requiredQuestions.length,
    filtered: `${allRequiredQuestions.length - requiredQuestions.length} questions filtered out`,
    requiredQuestions: requiredQuestions.map((q) => ({
      id: q.id,
      questionKey: q.questionKey,
      questionType: q.questionType,
      questionText: q.questionEn.substring(0, 60) + "...",
      required: q.required,
      options: q.options?.slice(0, 3),
    })),
    technicalSkillsQuestions: requiredQuestions
      .filter(
        (q) =>
          q.questionKey.includes("technical") ||
          q.questionKey.includes("skill"),
      )
      .map((q) => ({
        id: q.id,
        questionKey: q.questionKey,
        questionText: q.questionEn.substring(0, 60) + "...",
        questionType: q.questionType,
        options: q.options?.slice(0, 3), // Show first 3 options
      })),
  });

  // Find missing or inadequately answered required questions
  const responseMap = new Map(
    application.responses.map((r) => [r.questionId, r]),
  );

  console.log("🔍 DEBUG: Response mapping:", {
    responseMapSize: responseMap.size,
    technicalSkillsSpecific: {
      techSkillsResponse: application.responses.find(
        (r) => r.question.questionKey === "technical_skills",
      ),
      techSkillsOtherResponse: application.responses.find(
        (r) => r.question.questionKey === "technical_skills_other",
      ),
    },
    responseEntries: Array.from(responseMap.entries()).map(
      ([questionId, response]) => ({
        questionId,
        questionKey: response.question.questionKey,
        answer:
          response.answer?.substring(0, 100) +
          (response.answer?.length > 100 ? "..." : ""),
        answerLength: response.answer?.length,
        questionType: response.question.questionType,
        isRequired: response.question.required,
      }),
    ),
  });

  const missingQuestions = requiredQuestions.filter((question) => {
    const response = responseMap.get(question.id);

    console.log(`🔍 DEBUG: Checking question "${question.questionKey}":`, {
      questionId: question.id,
      questionType: question.questionType,
      hasResponse: !!response,
      responseQuestionId: response?.questionId,
      answer: response?.answer,
      answerLength: response?.answer?.length,
      questionText: question.questionEn.substring(0, 50) + "...",
    });

    // No response at all
    if (!response) {
      console.log(`❌ Missing: No response for ${question.questionKey}`);
      return true;
    }

    // Empty or whitespace-only answer
    if (!response.answer || response.answer.trim() === "") {
      console.log(`❌ Missing: Empty answer for ${question.questionKey}`);
      return true;
    }

    // For SELECT/MULTISELECT questions, check if answer is valid
    if (
      question.questionType === "SELECT" ||
      question.questionType === "MULTISELECT"
    ) {
      const answer = response.answer.trim();

      // Common invalid select values
      if (
        answer === "" ||
        answer === "Please select" ||
        answer === "Select an option" ||
        answer === "Choose one" ||
        answer === "null" ||
        answer === "undefined"
      ) {
        return true;
      }

      // If question has options defined, check if answer is one of them
      if (question.options && question.options.length > 0) {
        const validOptions = question.options.map((opt) =>
          opt.toLowerCase().trim(),
        );
        const answerLower = answer.toLowerCase().trim();

        // For MULTISELECT, check each selected option
        if (question.questionType === "MULTISELECT") {
          console.log(
            `🔍 DEBUG: MULTISELECT validation for "${question.questionKey}":`,
            {
              originalAnswer: answer,
              validOptions: validOptions,
              startsWithBracket: answer.startsWith("["),
              endsWithBracket: answer.endsWith("]"),
            },
          );

          let selectedOptions: string[] = [];

          // Handle JSON array format (e.g., ["Project Manager", "Developer"])
          if (answer.startsWith("[") && answer.endsWith("]")) {
            try {
              const parsed = JSON.parse(answer) as unknown;
              if (Array.isArray(parsed)) {
                selectedOptions = (parsed as string[]).map((opt) =>
                  String(opt).toLowerCase().trim(),
                );
                console.log(`✅ JSON parsing successful:`, {
                  parsed,
                  selectedOptions,
                });
              } else {
                console.log(`❌ JSON parsing failed: not an array`, { parsed });
                return true; // Invalid JSON array
              }
            } catch (error) {
              console.log(`❌ JSON parsing failed with error:`, error);
              return true; // Malformed JSON
            }
          } else {
            // Handle comma-separated format (e.g., "Project Manager, Developer")
            selectedOptions = answer
              .split(",")
              .map((opt) => opt.toLowerCase().trim());
            console.log(`✅ Comma-split parsing:`, { selectedOptions });
          }

          const hasInvalidOption = selectedOptions.some(
            (opt) => !validOptions.includes(opt),
          );
          console.log(`🔍 Validation result for "${question.questionKey}":`, {
            selectedOptions,
            validOptions,
            hasInvalidOption,
            isEmpty: selectedOptions.length === 0,
            isMissing: hasInvalidOption || selectedOptions.length === 0,
          });

          if (hasInvalidOption || selectedOptions.length === 0) {
            console.log(
              `❌ Missing: Invalid or empty MULTISELECT for ${question.questionKey}`,
            );
            return true;
          }

          console.log(`✅ Valid: MULTISELECT for ${question.questionKey}`);
          return false;
        } else {
          // For SELECT, check if the answer is one of the valid options
          if (!validOptions.includes(answerLower)) {
            return true;
          }
        }
      }
    }

    console.log(`✅ Valid: Question ${question.questionKey} passed all checks`);
    return false;
  });

  console.log("🔍 DEBUG: Final missing questions result:", {
    totalMissingQuestions: missingQuestions.length,
    missingQuestionKeys: missingQuestions.map((q) => q.questionKey),
    missingQuestions: missingQuestions.map((q) => ({
      id: q.id,
      questionKey: q.questionKey,
      questionText: q.questionEn.substring(0, 50) + "...",
      questionType: q.questionType,
    })),
  });

  return {
    application,
    missingQuestions,
    isComplete: missingQuestions.length === 0,
  };
}

export const emailRouter = createTRPCRouter({
  // Check for missing information in application (pure validation)
  checkMissingInfo: protectedProcedure
    .input(CheckMissingInfoSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const validation = await validateApplicationFields(
        input.applicationId,
        ctx,
      );

      return {
        applicationId: input.applicationId,
        isComplete: validation.isComplete,
        missingFields: validation.missingQuestions.map((q) => ({
          questionKey: q.questionKey,
          questionText: q.questionEn,
          questionType: q.questionType,
        })),
        message: validation.isComplete
          ? "Application is complete - no missing fields found"
          : `${validation.missingQuestions.length} required field(s) missing`,
      };
    }),

  // Create a draft email for missing application information
  createMissingInfoEmail: protectedProcedure
    .input(CreateMissingInfoEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const validation = await validateApplicationFields(
        input.applicationId,
        ctx,
      );

      if (validation.isComplete) {
        return {
          message: "Application is complete - no missing fields found",
          missingFields: [],
          isComplete: true,
        };
      }

      // Generate application URL (you'll need to adjust this based on your routing)
      const applicationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/events/${validation.application.eventId}?tab=application`;

      // Generate email content
      const emailContent = generateMissingInfoEmail({
        applicantName: validation.application.user?.name ?? "Applicant",
        eventName: validation.application.event.name,
        eventId: validation.application.eventId,
        missingFields: validation.missingQuestions.map((q) => q.questionKey),
        applicationUrl,
      });

      // Check if a draft email already exists for this application
      const existingDraft = await ctx.db.email.findFirst({
        where: {
          applicationId: input.applicationId,
          type: "MISSING_INFO",
          status: "DRAFT",
        },
      });

      if (existingDraft) {
        // Update existing draft
        const updatedEmail = await ctx.db.email.update({
          where: { id: existingDraft.id },
          data: {
            subject: emailContent.subject,
            htmlContent: emailContent.htmlContent,
            textContent: emailContent.textContent,
            missingFields: validation.missingQuestions.map(
              (q) => q.questionKey,
            ),
            updatedAt: new Date(),
          },
        });

        return updatedEmail;
      }

      // Create new draft email
      const email = await ctx.db.email.create({
        data: {
          applicationId: input.applicationId,
          eventId: validation.application.eventId,
          toEmail: validation.application.email,
          subject: emailContent.subject,
          htmlContent: emailContent.htmlContent,
          textContent: emailContent.textContent,
          type: "MISSING_INFO",
          status: "DRAFT",
          missingFields: validation.missingQuestions.map((q) => q.questionKey),
          createdBy: ctx.session.user.id,
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return email;
    }),

  // Send a draft email
  sendEmail: protectedProcedure
    .input(SendEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is not in draft status",
        });
      }

      // Send the email using Postmark with safety options
      const result = await sendEmail({
        to: email.toEmail,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent ?? undefined,
        bypassSafety: input.bypassSafety ?? false,
      });

      // Update email status based on result
      const updatedEmail = await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          status: result.success ? "SENT" : "FAILED",
          sentAt: result.success ? new Date() : null,
          postmarkId: result.messageId,
          failureReason: result.error,
          updatedAt: new Date(),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return {
        email: updatedEmail,
        success: result.success,
        error: result.error,
      };
    }),

  // Get emails for a specific application
  getApplicationEmails: protectedProcedure
    .input(GetApplicationEmailsSchema)
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const emails = await ctx.db.email.findMany({
        where: { applicationId: input.applicationId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return emails;
    }),

  // Get emails for a specific event
  getEventEmails: protectedProcedure
    .input(GetEventEmailsSchema) // eventId can be ID or slug
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Resolve eventId (supports both ID and slug)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const emails = await ctx.db.email.findMany({
        where: {
          eventId: resolvedEventId,
          ...(input.status && { status: input.status }),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return emails;
    }),

  // Update a draft email
  updateEmail: protectedProcedure
    .input(UpdateEmailSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email to verify it's a draft
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft emails can be updated",
        });
      }

      // Update the email
      const updatedEmail = await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          ...(input.subject && { subject: input.subject }),
          ...(input.htmlContent && { htmlContent: input.htmlContent }),
          ...(input.textContent && { textContent: input.textContent }),
          updatedAt: new Date(),
        },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      return updatedEmail;
    }),

  // Delete a draft email
  deleteEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the email to verify it's a draft
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
      });

      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      if (email.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft emails can be deleted",
        });
      }

      // Delete the email
      await ctx.db.email.delete({
        where: { id: input.emailId },
      });

      return { success: true };
    }),

  // Get email statistics for an event
  getEmailStats: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const stats = await ctx.db.email.groupBy({
        by: ["status"],
        where: { eventId: input.eventId },
        _count: {
          id: true,
        },
      });

      const statsMap = stats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        draft: statsMap.DRAFT ?? 0,
        queued: statsMap.QUEUED ?? 0,
        sent: statsMap.SENT ?? 0,
        failed: statsMap.FAILED ?? 0,
        cancelled: statsMap.CANCELLED ?? 0,
        total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      };
    }),

  // Get email safety configuration for current environment
  getEmailSafety: protectedProcedure.query(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);
    return isEmailSendingSafe();
  }),

  // Get all sent emails (admin only)
  getAllSentEmails: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          offset: z.number().min(0).optional().default(0),
          searchEmail: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const searchEmail = input?.searchEmail;

      // Build where clause with email search
      const whereClause = {
        status: "SENT" as const,
        ...(searchEmail && {
          OR: [
            {
              toEmail: {
                contains: searchEmail,
                mode: "insensitive" as const,
              },
            },
            {
              application: {
                user: {
                  email: {
                    contains: searchEmail,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }),
      };

      const [emails, total] = await Promise.all([
        ctx.db.email.findMany({
          where: whereClause,
          include: {
            application: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { sentAt: "desc" },
          take: limit,
          skip: offset,
        }),
        ctx.db.email.count({
          where: whereClause,
        }),
      ]);

      return {
        emails,
        total,
        hasMore: offset + limit < total,
      };
    }),
});
