import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import {
  sendEmail,
  generateMissingInfoEmail,
  isEmailSendingSafe,
} from "~/lib/email";

// Input schemas
const CheckMissingInfoSchema = z.object({
  applicationId: z.string(),
});

const CreateMissingInfoEmailSchema = z.object({
  applicationId: z.string(),
});

const SendCommunicationSchema = z.object({
  communicationId: z.string(),
  bypassSafety: z.boolean().optional(),
});

const GetApplicationCommunicationsSchema = z.object({
  applicationId: z.string(),
});

const GetEventCommunicationsSchema = z.object({
  eventId: z.string(),
  status: z.enum(["DRAFT", "QUEUED", "SENT", "FAILED", "CANCELLED"]).optional(),
  channel: z
    .enum(["EMAIL", "TELEGRAM", "SMS", "DISCORD", "WHATSAPP"])
    .optional(),
});

const UpdateCommunicationSchema = z.object({
  communicationId: z.string(),
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

  // Get all required questions for this event
  const allRequiredQuestions = await ctx.db.applicationQuestion.findMany({
    where: {
      eventId: application.eventId,
      required: true,
    },
    orderBy: { order: "asc" },
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

    // Special handling for technical_skills_other
    if (question.questionKey === "technical_skills_other") {
      const techSkillsResponse = application.responses.find(
        (r) => r.question.questionKey === "technical_skills",
      );

      if (techSkillsResponse?.answer) {
        try {
          const selectedSkills = JSON.parse(
            techSkillsResponse.answer,
          ) as unknown;
          const includesOther =
            Array.isArray(selectedSkills) &&
            (selectedSkills as string[]).includes("Other");
          return includesOther;
        } catch {
          // If not JSON, check string contains "Other"
          const includesOtherString =
            techSkillsResponse.answer.includes("Other");
          return includesOtherString;
        }
      }

      return false; // Don't require if no technical_skills response
    }

    return false; // Other conditional fields not required
  });

  // Find missing or inadequately answered required questions
  const responseMap = new Map(
    application.responses.map((r) => [r.questionId, r]),
  );

  const missingQuestions = requiredQuestions.filter((question) => {
    const response = responseMap.get(question.id);

    // No response at all
    if (!response) {
      return true;
    }

    // Empty or whitespace-only answer
    if (!response.answer || response.answer.trim() === "") {
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
          let selectedOptions: string[] = [];

          // Handle JSON array format (e.g., ["Project Manager", "Developer"])
          if (answer.startsWith("[") && answer.endsWith("]")) {
            try {
              const parsed = JSON.parse(answer) as unknown;
              if (Array.isArray(parsed)) {
                selectedOptions = (parsed as string[]).map((opt) =>
                  String(opt).toLowerCase().trim(),
                );
              } else {
                return true; // Invalid JSON array
              }
            } catch {
              return true; // Malformed JSON
            }
          } else {
            // Handle comma-separated format (e.g., "Project Manager, Developer")
            selectedOptions = answer
              .split(",")
              .map((opt) => opt.toLowerCase().trim());
          }

          const hasInvalidOption = selectedOptions.some(
            (opt) => !validOptions.includes(opt),
          );

          if (hasInvalidOption || selectedOptions.length === 0) {
            return true;
          }

          return false;
        } else {
          // For SELECT, check if the answer is one of the valid options
          if (!validOptions.includes(answerLower)) {
            return true;
          }
        }
      }
    }

    return false;
  });

  return {
    application,
    missingQuestions,
    isComplete: missingQuestions.length === 0,
  };
}

export const communicationRouter = createTRPCRouter({
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

      // Generate application URL
      const applicationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/events/${validation.application.eventId}?tab=application`;

      // Generate email content
      const emailContent = generateMissingInfoEmail({
        applicantName: validation.application.user?.name ?? "Applicant",
        eventName: validation.application.event.name,
        eventId: validation.application.eventId,
        missingFields: validation.missingQuestions.map((q) => q.questionKey),
        applicationUrl,
      });

      // Check if a draft communication already exists for this application
      const existingDraft = await ctx.db.communication.findFirst({
        where: {
          applicationId: input.applicationId,
          type: "MISSING_INFO",
          status: "DRAFT",
          channel: "EMAIL",
        },
      });

      if (existingDraft) {
        // Update existing draft
        const updatedCommunication = await ctx.db.communication.update({
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

        return updatedCommunication;
      }

      // Create new draft communication
      const communication = await ctx.db.communication.create({
        data: {
          applicationId: input.applicationId,
          eventId: validation.application.eventId,
          toEmail: validation.application.email,
          channel: "EMAIL",
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

      return communication;
    }),

  // Send a draft communication
  sendCommunication: protectedProcedure
    .input(SendCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the communication
      const communication = await ctx.db.communication.findUnique({
        where: { id: input.communicationId },
        include: {
          application: {
            include: {
              user: true,
            },
          },
          event: true,
        },
      });

      if (!communication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Communication not found",
        });
      }

      if (communication.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Communication is not in draft status",
        });
      }

      // Currently only support email sending
      if (communication.channel !== "EMAIL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Only email communications can be sent through this endpoint",
        });
      }

      if (
        !communication.toEmail ||
        !communication.subject ||
        !communication.textContent
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Email communication missing required fields (toEmail, subject, textContent)",
        });
      }

      // Send the email using Postmark with safety options
      const result = await sendEmail({
        to: communication.toEmail,
        subject: communication.subject,
        htmlContent: communication.htmlContent ?? "",
        textContent: communication.textContent,
        bypassSafety: input.bypassSafety ?? false,
      });

      // Update communication status based on result
      const updatedCommunication = await ctx.db.communication.update({
        where: { id: input.communicationId },
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
        communication: updatedCommunication,
        success: result.success,
        error: result.error,
      };
    }),

  // Get communications for a specific application
  getApplicationCommunications: protectedProcedure
    .input(GetApplicationCommunicationsSchema)
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const communications = await ctx.db.communication.findMany({
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

      return communications;
    }),

  // Get communications for a specific event
  getEventCommunications: protectedProcedure
    .input(GetEventCommunicationsSchema)
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const communications = await ctx.db.communication.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
          ...(input.channel && { channel: input.channel }),
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

      return communications;
    }),

  // Update a draft communication
  updateCommunication: protectedProcedure
    .input(UpdateCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the communication to verify it's a draft
      const communication = await ctx.db.communication.findUnique({
        where: { id: input.communicationId },
      });

      if (!communication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Communication not found",
        });
      }

      if (communication.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft communications can be updated",
        });
      }

      // Update the communication
      const updatedCommunication = await ctx.db.communication.update({
        where: { id: input.communicationId },
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

      return updatedCommunication;
    }),

  // Delete a draft communication
  deleteCommunication: protectedProcedure
    .input(z.object({ communicationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Get the communication to verify it's a draft
      const communication = await ctx.db.communication.findUnique({
        where: { id: input.communicationId },
      });

      if (!communication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Communication not found",
        });
      }

      if (communication.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft communications can be deleted",
        });
      }

      // Delete the communication
      await ctx.db.communication.delete({
        where: { id: input.communicationId },
      });

      return { success: true };
    }),

  // Get communication statistics for an event
  getCommunicationStats: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const stats = await ctx.db.communication.groupBy({
        by: ["status", "channel"],
        where: { eventId: input.eventId },
        _count: {
          id: true,
        },
      });

      const channelStats = stats.reduce(
        (acc, stat) => {
          acc[stat.channel] ??= {};
          if (stat.status) {
            acc[stat.channel]![stat.status] = stat._count.id;
          }
          return acc;
        },
        {} as Record<string, Record<string, number>>,
      );

      return {
        byChannel: channelStats,
        total: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      };
    }),

  // Get communication safety configuration for current environment
  getCommunicationSafety: protectedProcedure.query(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);
    return isEmailSendingSafe();
  }),

  // Get all sent communications (admin only) with multi-channel search
  getAllSentCommunications: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          offset: z.number().min(0).optional().default(0),
          searchEmail: z.string().optional(),
          searchTelegram: z.string().optional(),
          channel: z
            .enum(["EMAIL", "TELEGRAM", "SMS", "DISCORD", "WHATSAPP"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const searchEmail = input?.searchEmail;
      const searchTelegram = input?.searchTelegram;
      const channel = input?.channel;

      // Build where clause with multi-channel search
      const whereClause = {
        status: "SENT" as const,
        ...(channel && { channel }),
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
        ...(searchTelegram && {
          toTelegram: {
            contains: searchTelegram,
            mode: "insensitive" as const,
          },
        }),
      };

      const [communications, total] = await Promise.all([
        ctx.db.communication.findMany({
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
        ctx.db.communication.count({
          where: whereClause,
        }),
      ]);

      return {
        communications,
        total,
        hasMore: offset + limit < total,
      };
    }),
});
