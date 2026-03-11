import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type Prisma, type PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  checkApplicationCompleteness,
  updateApplicationCompletionStatus,
  sendSubmissionNotification,
} from "~/server/api/utils/applicationCompletion";
import { captureApiError, captureEmailError } from "~/utils/errorCapture";
import {
  assertAdminOrEventFloorOwner,
  isAdminOrStaff,
  getUserOwnedVenueIds,
} from "~/server/api/utils/scheduleAuth";

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
const CreateApplicationInputSchema = z.object({
  eventId: z.string(),
  language: z.string().default("en"),
  applicationType: z
    .enum(["RESIDENT", "MENTOR", "SPEAKER"])
    .default("RESIDENT"),
  invitationToken: z.string().optional(),
});

const UpdateApplicationResponseSchema = z.object({
  applicationId: z.string(),
  questionId: z.string(),
  answer: z.string(),
});

const SubmitApplicationSchema = z.object({
  applicationId: z.string(),
  venueIds: z.array(z.string()).optional(), // Floor/venue selections for speaker applications
  speakerInvitedByUserId: z.string().optional(), // VenueOwner userId who invited the speaker
  speakerInvitedByOther: z.string().max(200).optional(), // Free-text name if "Other" selected
  speakerPreferredDates: z.string().max(500).optional(), // Comma-separated preferred dates
  speakerPreferredTimes: z.string().max(500).optional(), // Comma-separated preferred time slots
});

const UpdateApplicationStatusSchema = z.object({
  applicationId: z.string(),
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "CANCELLED",
  ]),
});

const BulkUpdateApplicationStatusSchema = z.object({
  applicationIds: z.array(z.string()),
  status: z.enum([
    "DRAFT",
    "UNDER_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "WAITLISTED",
    "CANCELLED",
  ]),
});

const BulkDeleteApplicationsSchema = z.object({
  applicationIds: z.array(z.string()).min(1),
});

const BulkUpdateApplicationResponsesSchema = z.object({
  applicationId: z.string(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
    }),
  ),
});

const UpdateWaitlistOrderSchema = z.object({
  applicationId: z.string(),
  position: z.number().int().positive().optional(), // null to clear manual override
});

const CreateQuestionSchema = z.object({
  eventId: z.string(),
  questionKey: z.string(),
  questionEn: z.string(),
  questionEs: z.string(),
  questionType: z.enum([
    "TEXT",
    "TEXTAREA",
    "EMAIL",
    "PHONE",
    "URL",
    "SELECT",
    "MULTISELECT",
    "CHECKBOX",
    "NUMBER",
  ]),
  required: z.boolean().default(true),
  options: z.array(z.string()).default([]),
  order: z.number(),
});

const ImportLegacyApplicationSchema = z.object({
  email: z.string().email(),
  eventId: z.string(),
  responses: z.record(z.string()), // questionKey -> answer
  source: z.enum(["google_form", "notion_form"]),
  sourceId: z.string().optional(),
});

const CreateSponsoredApplicationSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

const CreateSpeakerOnBehalfSchema = z.object({
  eventId: z.string(),
  // Speaker identity
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  // Talk details
  talkTitle: z.string().min(1).max(200),
  talkAbstract: z.string().min(50).max(2000),
  talkFormat: z.string().min(1),
  talkDuration: z.string().min(1),
  talkTopic: z.string().min(1),
  venueIds: z.array(z.string()).optional(),
  // Speaker profile
  bio: z.string().min(20).max(1000),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  previousSpeakingExperience: z.string().max(2000).optional(),
  // Links
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  pastTalkUrl: z.string().url().optional().or(z.literal("")),
  // Entity name
  speakerEntityName: z.string().max(200).optional(),
  speakerOtherFloorsTopicTheme: z.string().max(2000).optional(),
  speakerDisplayPreference: z.string().max(500).optional(),
  // Headshot
  headshotUrl: z.string().optional(),
  headshotFileName: z.string().optional(),
  // Scheduling preferences
  speakerPreferredDates: z.string().max(500).optional(),
  speakerPreferredTimes: z.string().max(500).optional(),
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

export const applicationRouter = createTRPCRouter({
  // Get all applications for the current user
  getUserApplications: protectedProcedure.query(async ({ ctx }) => {
    const applications = await ctx.db.application.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        event: true,
        responses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return applications;
  }),

  // Get user's application for a specific event
  getApplication: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        applicationType: z.enum(["RESIDENT", "MENTOR", "SPEAKER"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const application = await ctx.db.application.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          ...(input.applicationType && {
            applicationType: input.applicationType,
          }),
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
            orderBy: {
              question: {
                order: "asc",
              },
            },
          },
          venues: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      return application;
    }),

  // Create or get existing application for an event
  createApplication: protectedProcedure
    .input(CreateApplicationInputSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("🔍 [Backend] createApplication called with:", {
        userId: ctx.session.user.id,
        eventId: input.eventId,
        applicationType: input.applicationType,
        language: input.language,
        invitationToken: input.invitationToken,
      });

      // Check if user has latePass access or is admin/mentor
      const isAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";

      // Check if user is a mentor for this event
      const mentorRole = await ctx.db.userRole.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          role: {
            name: "mentor",
          },
        },
      });
      const isMentor = !!mentorRole;

      // Get event details to check if applications are open (support both ID and slug)
      let event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

      event ??= await ctx.db.event.findUnique({
        where: { slug: input.eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Validate invitation token if provided
      let hasValidInvitation = false;
      let validInvitationId: string | null = null;
      if (input.invitationToken) {
        const invitation = await ctx.db.invitation.findUnique({
          where: { token: input.invitationToken },
          select: {
            id: true,
            email: true,
            eventId: true,
            status: true,
            expiresAt: true,
          },
        });

        const now = new Date();
        // Token is sufficient proof of invitation - don't require email match
        // (user may sign in with different email than invitation was sent to)
        // Allow both PENDING and ACCEPTED status (invitation may have been
        // accepted during account creation but application not yet submitted)
        // Match eventId flexibly: invitation may store CUID while input may be slug or vice versa
        const eventIdMatches =
          invitation?.eventId === input.eventId ||
          invitation?.eventId === event.id;
        if (
          invitation &&
          (invitation.status === "PENDING" ||
            invitation.status === "ACCEPTED") &&
          invitation.expiresAt > now &&
          eventIdMatches
        ) {
          hasValidInvitation = true;
          validInvitationId = invitation.id;
          console.log("✅ Valid invitation token found for user");
        } else if (invitation) {
          console.log("❌ Invalid invitation:", {
            status: invitation.status,
            expired: invitation.expiresAt <= now,
            wrongEvent:
              invitation.eventId !== input.eventId &&
              invitation.eventId !== event.id,
          });
        } else {
          console.log(
            "❌ Invitation not found with token:",
            input.invitationToken,
          );
        }
      }

      // Check if applications are currently open (within deadline)
      const now = new Date();
      const applicationsOpen = now <= event.startDate; // Applications close when event starts

      console.log("🕐 Application timing check:", {
        now: now.toISOString(),
        eventStart: event.startDate.toISOString(),
        applicationsOpen,
        isAdmin,
        isMentor,
        hasValidInvitation,
      });

      // Speaker applications bypass the deadline (speakers are recruited on a different timeline)
      const isSpeakerApplication = input.applicationType === "SPEAKER";

      // If applications are closed and user is not admin/mentor/invited/speaker, they cannot apply
      if (
        !applicationsOpen &&
        !isAdmin &&
        !isMentor &&
        !hasValidInvitation &&
        !isSpeakerApplication
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Applications for this event are closed. A late pass is required to apply.",
        });
      }

      // Check if application already exists (matches the unique constraint: userId + eventId)
      const existing = await ctx.db.application.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: event.id,
        },
      });

      if (existing) {
        console.log("📋 Found existing application:", {
          id: existing.id,
          currentType: existing.applicationType,
          requestedType: input.applicationType,
        });

        // If existing application has different type or needs invitation linkage, update it
        const needsTypeUpdate =
          existing.applicationType !== input.applicationType;
        const needsInvitationLink = validInvitationId && !existing.invitationId;

        if (needsTypeUpdate || needsInvitationLink) {
          console.log("🔄 Updating application:", {
            typeChange: needsTypeUpdate
              ? `${existing.applicationType} → ${input.applicationType}`
              : "none",
            invitationLink: needsInvitationLink ? validInvitationId : "none",
          });
          const updated = await ctx.db.application.update({
            where: { id: existing.id },
            data: {
              ...(needsTypeUpdate && {
                applicationType: input.applicationType,
              }),
              ...(needsInvitationLink && { invitationId: validInvitationId }),
            },
            include: {
              event: true,
              responses: {
                include: {
                  question: true,
                },
              },
            },
          });
          console.log("✅ Application updated successfully");
          return updated;
        }

        console.log(
          "ℹ️ Application type already matches, returning existing application",
        );
        return existing;
      }

      // Create new application with race condition handling
      console.log("🆕 Creating new application");
      try {
        const application = await ctx.db.application.create({
          data: {
            userId: ctx.session.user.id,
            eventId: event.id,
            email: ctx.session.user.email!,
            language: input.language,
            applicationType: input.applicationType,
            status: "DRAFT",
            ...(validInvitationId && { invitationId: validInvitationId }),
          },
          include: {
            event: true,
            responses: {
              include: {
                question: true,
              },
            },
          },
        });

        console.log(
          "✅ New application created successfully with type:",
          application.applicationType,
        );
        return application;
      } catch (error: unknown) {
        console.log(
          "⚠️ Error creating application, checking for race condition:",
          error,
        );

        // Handle race condition where application was created between our check and create attempt
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        ) {
          // Unique constraint error
          console.log(
            "🏃 Race condition detected, fetching existing application",
          );
          const existingAfterRace = await ctx.db.application.findFirst({
            where: {
              userId: ctx.session.user.id,
              eventId: input.eventId,
            },
            include: {
              event: true,
              responses: {
                include: {
                  question: true,
                },
              },
            },
          });

          if (existingAfterRace) {
            console.log("📋 Found application after race condition:", {
              id: existingAfterRace.id,
              currentType: existingAfterRace.applicationType,
              requestedType: input.applicationType,
            });

            // Update the application type if different
            if (existingAfterRace.applicationType !== input.applicationType) {
              console.log(
                "🔄 Updating application type after race condition from",
                existingAfterRace.applicationType,
                "to",
                input.applicationType,
              );
              const updated = await ctx.db.application.update({
                where: { id: existingAfterRace.id },
                data: { applicationType: input.applicationType },
                include: {
                  event: true,
                  responses: {
                    include: {
                      question: true,
                    },
                  },
                },
              });
              console.log(
                "✅ Application type updated successfully after race condition",
              );
              return updated;
            }
            return existingAfterRace;
          }
        }

        // Re-throw if it's not a race condition we can handle
        console.log("❌ Unhandled error in createApplication:", error);
        throw error;
      }
    }),

  // Get application completion status
  getApplicationCompletion: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application || application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Application not found or access denied",
        });
      }

      const completionResult = await checkApplicationCompleteness(
        ctx.db,
        input.applicationId,
        application.eventId,
      );

      return {
        ...completionResult,
        isComplete: application.isComplete,
        completedAt: application.completedAt,
        status: application.status,
      };
    }),

  // Update a response to a question
  updateResponse: protectedProcedure
    .input(UpdateApplicationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application exists and user has access (owner or admin/staff)
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Allow access if user owns the application OR user is admin/staff
      const isOwner = application.userId === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied - you can only edit your own applications",
        });
      }

      // Update or create the response with retry logic for race conditions
      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          response = await ctx.db.applicationResponse.upsert({
            where: {
              applicationId_questionId: {
                applicationId: input.applicationId,
                questionId: input.questionId,
              },
            },
            update: {
              answer: input.answer,
            },
            create: {
              applicationId: input.applicationId,
              questionId: input.questionId,
              answer: input.answer,
            },
            include: {
              question: true,
            },
          });
          break; // Success, exit the retry loop
        } catch (error: unknown) {
          retryCount++;

          // Check if it's a unique constraint error
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            console.log(
              `Unique constraint error on attempt ${retryCount}, retrying...`,
            );

            if (retryCount >= maxRetries) {
              // Final attempt: just try to update existing record
              const existingResponse =
                await ctx.db.applicationResponse.findUnique({
                  where: {
                    applicationId_questionId: {
                      applicationId: input.applicationId,
                      questionId: input.questionId,
                    },
                  },
                  include: {
                    question: true,
                  },
                });

              if (existingResponse) {
                response = await ctx.db.applicationResponse.update({
                  where: { id: existingResponse.id },
                  data: { answer: input.answer },
                  include: {
                    question: true,
                  },
                });
                break;
              }
            }

            // Wait a bit before retrying to avoid immediate conflict
            await new Promise((resolve) =>
              setTimeout(resolve, 50 * retryCount),
            );
          } else {
            // Non-constraint error, don't retry
            throw error;
          }
        }
      }

      if (!response) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save response after multiple attempts",
        });
      }

      // Check if application completion status has changed
      try {
        const completionResult = await checkApplicationCompleteness(
          ctx.db,
          input.applicationId,
          application.eventId,
        );

        // Update completion status in database (may also revert SUBMITTED to DRAFT)
        // For auto-save updates, don't treat as intentional edits to prevent aggressive reversion
        const updateResult = await updateApplicationCompletionStatus(
          ctx.db,
          input.applicationId,
          completionResult,
          {
            isUserIntentionalEdit: false, // This is an auto-save update, not an intentional edit
          },
        );

        // Log status reversion for debugging
        if (updateResult.statusReverted) {
          console.log(
            `✏️ Application ${input.applicationId} status reverted from SUBMITTED to DRAFT due to field edit`,
          );
        }

        // Note: We don't send emails just for field completion anymore
        // Users should only get emails for actual submission, not just filling fields
        if (completionResult.wasJustCompleted) {
          console.log(
            `✅ Application ${input.applicationId} became complete - in-browser notification will show, no email sent`,
          );
        }
      } catch (error) {
        // Log error but don't fail the response update
        console.error("Error checking application completeness:", error);
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "application.updateResponse",
          method: "POST",
          input: {
            applicationId: input.applicationId,
            questionId: input.questionId,
          },
        });
      }

      return response;
    }),

  // Submit application (change status from DRAFT to SUBMITTED)
  submitApplication: protectedProcedure
    .input(SubmitApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!application || application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Application not found or access denied",
        });
      }

      if (application.status !== "DRAFT") {
        // Allow SPEAKER applications created on behalf to be updated
        // without changing their status (SUBMITTED/ACCEPTED/WAITLISTED)
        const isOnBehalfSpeakerUpdate =
          application.applicationType === "SPEAKER" &&
          (application.status === "SUBMITTED" ||
            application.status === "ACCEPTED" ||
            application.status === "WAITLISTED");

        if (!isOnBehalfSpeakerUpdate) {
          console.log(
            `Submit attempt on non-DRAFT application: ${input.applicationId}, current status: ${application.status}, user: ${ctx.session.user.id}`,
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Application has already been submitted (current status: ${application.status})`,
          });
        }

        // Update venue associations if provided
        console.log(
          `Speaker updating on-behalf application: ${input.applicationId}, preserving status: ${application.status}`,
        );
        if (input.venueIds && input.venueIds.length > 0) {
          await ctx.db.applicationVenue.deleteMany({
            where: { applicationId: input.applicationId },
          });
          await ctx.db.applicationVenue.createMany({
            data: input.venueIds.map((venueId) => ({
              applicationId: input.applicationId,
              venueId,
            })),
          });
        }

        // Update speaker-specific fields, preserve existing status
        const updated = await ctx.db.application.update({
          where: { id: input.applicationId },
          data: {
            speakerInvitedByUserId:
              input.speakerInvitedByUserId ??
              application.speakerInvitedByUserId,
            speakerInvitedByOther:
              input.speakerInvitedByOther ?? application.speakerInvitedByOther,
            speakerPreferredDates:
              input.speakerPreferredDates ?? application.speakerPreferredDates,
            speakerPreferredTimes:
              input.speakerPreferredTimes ?? application.speakerPreferredTimes,
          },
          include: {
            event: true,
            responses: {
              include: {
                question: true,
              },
            },
          },
        });

        return updated;
      }

      // Check required questions are answered (excluding conditional fields)
      // Speaker applications store data in the profile, not as question responses
      if (application.applicationType !== "SPEAKER") {
        const allRequiredQuestions = await ctx.db.applicationQuestion.findMany({
          where: {
            eventId: application.eventId,
            required: true,
          },
        });

        // Filter out conditional fields that shouldn't be required
        const requiredQuestions = allRequiredQuestions.filter((question) => {
          const questionText = question.questionEn.toLowerCase();
          const isConditionalField =
            questionText.includes("specify") ||
            questionText.includes("if you answered") ||
            questionText.includes("if you did not select") ||
            (questionText.includes("other") && questionText.includes("please"));
          return !isConditionalField;
        });

        const answeredQuestionIds = new Set(
          application.responses.map((r) => r.questionId),
        );

        const missingRequired = requiredQuestions.filter(
          (q) => !answeredQuestionIds.has(q.id),
        );

        if (missingRequired.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Please answer all required questions: ${missingRequired.map((q) => q.questionKey).join(", ")}`,
          });
        }
      }

      // Save venue/floor selections if provided (for speaker applications)
      if (input.venueIds && input.venueIds.length > 0) {
        // Remove existing venue associations and replace with new ones
        await ctx.db.applicationVenue.deleteMany({
          where: { applicationId: input.applicationId },
        });
        await ctx.db.applicationVenue.createMany({
          data: input.venueIds.map((venueId) => ({
            applicationId: input.applicationId,
            venueId,
          })),
        });
      }

      // Submit the application
      const submitted = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          speakerInvitedByUserId: input.speakerInvitedByUserId ?? null,
          speakerInvitedByOther: input.speakerInvitedByOther ?? null,
          speakerPreferredDates: input.speakerPreferredDates ?? null,
          speakerPreferredTimes: input.speakerPreferredTimes ?? null,
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      // Send submission confirmation email now that application is actually submitted
      try {
        await sendSubmissionNotification(ctx.db, input.applicationId);
        console.log(
          `📧 Submission confirmation email sent for application ${input.applicationId}`,
        );
      } catch (error) {
        // Log error but don't fail the submission
        console.error("Failed to send submission notification email:", error);
        captureEmailError(error, {
          userId: ctx.session.user.id,
          emailType: "application_submission",
          templateName: "applicationSubmitted",
        });
      }

      return submitted;
    }),

  // Get questions for an event
  getEventQuestions: publicProcedure
    .input(z.object({ eventId: z.string() })) // Can be ID or slug
    .query(async ({ ctx, input }) => {
      // Resolve eventId (supports both ID and slug)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const questions = await ctx.db.applicationQuestion.findMany({
        where: { eventId: resolvedEventId },
        orderBy: { order: "asc" },
      });
      return questions;
    }),

  // Admin/Floor Lead: Get all applications for an event
  getEventApplications: protectedProcedure
    .input(
      z.object({
        eventId: z.string(), // Can be ID or slug
        status: z
          .enum([
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
            "CANCELLED",
          ])
          .optional(),
        applicationType: z.enum(["RESIDENT", "MENTOR", "SPEAKER"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Resolve eventId (supports both ID and slug)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      // Allow admin/staff OR floor leads for the event
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        resolvedEventId,
      );

      // For floor leads, scope to applications with matching venue associations
      // OR applications shared across all floors
      let venueFilter: Prisma.ApplicationWhereInput | undefined;
      if (!isAdminOrStaff(ctx.session.user.role)) {
        const ownedVenueIds = await getUserOwnedVenueIds(
          ctx.db,
          ctx.session.user.id,
          resolvedEventId,
        );
        venueFilter = {
          OR: [
            {
              venues: {
                some: {
                  venueId: { in: ownedVenueIds },
                },
              },
            },
            {
              sharedAcrossFloors: true,
            },
          ],
        };
      }

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          ...(input.status && { status: input.status }),
          ...(input.applicationType && {
            applicationType: input.applicationType,
          }),
          ...venueFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
          invitation: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
          venues: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          sharedByUser: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
            },
          },
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return applications;
    }),

  // Admin: Get consensus applications (applications with evaluations and scores)
  getConsensusApplications: protectedProcedure
    .input(
      z.object({
        eventId: z.string(), // Can be ID or slug
      }),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Resolve eventId (supports both ID and slug)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          evaluations: {
            some: {
              overallScore: {
                not: null,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
          },
          venues: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          sharedByUser: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
            },
          },
          evaluations: {
            where: {
              overallScore: {
                not: null,
              },
            },
            select: {
              id: true,
              overallScore: true,
              overallComments: true,
              completedAt: true,
              recommendation: true,
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              completedAt: "desc",
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate average scores and sort by average (highest first)
      const applicationsWithScores = applications.map((app) => {
        const validEvaluations = app.evaluations.filter(
          (evaluation) => evaluation.overallScore !== null,
        );
        const averageScore =
          validEvaluations.length > 0
            ? validEvaluations.reduce(
                (sum, evaluation) => sum + evaluation.overallScore!,
                0,
              ) / validEvaluations.length
            : 0;

        return {
          ...app,
          averageScore,
          evaluationCount: validEvaluations.length,
        };
      });

      // Sort by average score (highest first)
      applicationsWithScores.sort((a, b) => b.averageScore - a.averageScore);

      return applicationsWithScores;
    }),

  // Admin/Floor Lead: Update application status
  updateApplicationStatus: protectedProcedure
    .input(UpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch eventId for floor lead auth check
      const appForAuth = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        select: { eventId: true },
      });
      if (!appForAuth) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        appForAuth.eventId,
      );

      const application = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: { status: input.status },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          event: true,
        },
      });

      // Send notification email when status changes to accepted, rejected, or waitlisted
      if (["ACCEPTED", "REJECTED", "WAITLISTED"].includes(input.status)) {
        try {
          const { getEmailService } = await import(
            "~/server/email/emailService"
          );
          const emailService = getEmailService(ctx.db);

          const result = await emailService.sendApplicationStatusEmail(
            application,
            input.status as "ACCEPTED" | "REJECTED" | "WAITLISTED",
          );

          if (result.success) {
            console.log(
              `Status change email sent for application ${input.applicationId} (${input.status})`,
            );
          } else {
            console.error(
              `Failed to send status change email: ${result.error}`,
            );
          }
        } catch (error) {
          console.error("Error sending status change email:", error);
          captureEmailError(error, {
            userId: application.userId ?? undefined,
            emailType: "status_change",
            templateName: `application${input.status.toLowerCase().charAt(0).toUpperCase() + input.status.toLowerCase().slice(1)}`,
          });
          // Don't fail the status update if email fails
        }
      }

      // Auto-sync profile data when application is accepted
      if (input.status === "ACCEPTED" && application.userId) {
        try {
          // Check if this application has already been synced
          const existingSync = await ctx.db.profileSync.findUnique({
            where: {
              userId_applicationId: {
                userId: application.userId,
                applicationId: input.applicationId,
              },
            },
          });

          if (!existingSync) {
            // Get application with responses for sync
            const appWithResponses = await ctx.db.application.findUnique({
              where: { id: input.applicationId },
              include: {
                responses: {
                  include: {
                    question: {
                      select: {
                        questionKey: true,
                      },
                    },
                  },
                },
              },
            });

            if (appWithResponses) {
              // Get or create profile
              let profile = await ctx.db.userProfile.findUnique({
                where: { userId: application.userId },
              });

              profile ??= await ctx.db.userProfile.create({
                data: { userId: application.userId },
              });
              // Map responses
              const responseMap = new Map(
                appWithResponses.responses.map((r) => [
                  r.question.questionKey,
                  r.answer,
                ]),
              );

              const updateData: Partial<{
                bio: string;
                location: string;
                company: string;
                linkedinUrl: string;
                githubUrl: string;
                skills: string[];
              }> = {};

              const syncedFields: string[] = [];

              // Sync skills (merge with existing)
              if (responseMap.has("technical_skills")) {
                try {
                  const appSkills = JSON.parse(
                    responseMap.get("technical_skills")!,
                  ) as string[];
                  const existingSkills = profile.skills ?? [];
                  const mergedSkills = Array.from(
                    new Set([...existingSkills, ...appSkills]),
                  );
                  updateData.skills = mergedSkills;
                  syncedFields.push("skills");
                } catch {
                  // Skip if parsing fails
                }
              }

              // Sync other fields (only if profile field is empty)
              if (responseMap.has("bio") && !profile.bio) {
                const appBio = responseMap.get("bio")!;
                if (appBio.trim()) {
                  updateData.bio = appBio.trim();
                  syncedFields.push("bio");
                }
              }

              if (responseMap.has("location") && !profile.location) {
                const appLocation = responseMap.get("location")!;
                if (appLocation.trim()) {
                  updateData.location = appLocation.trim();
                  syncedFields.push("location");
                }
              }

              if (responseMap.has("company") && !profile.company) {
                const appCompany = responseMap.get("company")!;
                if (appCompany.trim()) {
                  updateData.company = appCompany.trim();
                  syncedFields.push("company");
                }
              }

              if (responseMap.has("linkedin_url") && !profile.linkedinUrl) {
                const appLinkedIn = responseMap.get("linkedin_url")!;
                if (appLinkedIn.trim()) {
                  updateData.linkedinUrl = appLinkedIn.trim();
                  syncedFields.push("linkedinUrl");
                }
              }

              if (responseMap.has("github_url") && !profile.githubUrl) {
                const appGitHub = responseMap.get("github_url")!;
                if (appGitHub.trim()) {
                  updateData.githubUrl = appGitHub.trim();
                  syncedFields.push("githubUrl");
                }
              }

              // Update profile if there are changes
              if (Object.keys(updateData).length > 0) {
                await ctx.db.userProfile.update({
                  where: { id: profile.id },
                  data: updateData,
                });
              }

              // Record the sync
              await ctx.db.profileSync.create({
                data: {
                  userId: application.userId,
                  applicationId: input.applicationId,
                  syncedFields,
                },
              });

              console.log(
                `Auto-synced ${syncedFields.length} fields to profile for application ${input.applicationId}`,
              );
            }
          }
        } catch (error) {
          console.error("Error auto-syncing profile:", error);
          captureApiError(error, {
            userId: application.userId,
            route: "application.updateStatus.profileSync",
            method: "POST",
            input: { applicationId: input.applicationId, status: input.status },
          });
          // Don't fail the status update if profile sync fails
        }
      }

      return application;
    }),

  // Admin/Floor Lead: Bulk update application status
  bulkUpdateApplicationStatus: protectedProcedure
    .input(BulkUpdateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch eventId from first application for floor lead auth check
      const firstApp = await ctx.db.application.findFirst({
        where: { id: { in: input.applicationIds } },
        select: { eventId: true },
      });
      if (!firstApp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No applications found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        firstApp.eventId,
      );

      const applications = await ctx.db.application.updateMany({
        where: {
          id: {
            in: input.applicationIds,
          },
        },
        data: {
          status: input.status,
        },
      });

      // Send notification emails for status changes
      if (["ACCEPTED", "REJECTED", "WAITLISTED"].includes(input.status)) {
        try {
          const { getEmailService } = await import(
            "~/server/email/emailService"
          );
          const emailService = getEmailService(ctx.db);

          // Fetch full application data for emails
          const fullApplications = await ctx.db.application.findMany({
            where: {
              id: {
                in: input.applicationIds,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  adminNotes: true,
                  adminWorkExperience: true,
                  adminLabels: true,
                  adminUpdatedAt: true,
                  profile: true,
                },
              },
              event: true,
            },
          });

          // Send emails in parallel
          const emailPromises = fullApplications.map((app) =>
            emailService
              .sendApplicationStatusEmail(
                app,
                input.status as "ACCEPTED" | "REJECTED" | "WAITLISTED",
              )
              .catch((error) => {
                console.error(
                  `Failed to send email for application ${app.id}:`,
                  error,
                );
                return {
                  success: false,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                };
              }),
          );

          const results = await Promise.allSettled(emailPromises);
          const successCount = results.filter(
            (r) => r.status === "fulfilled" && r.value.success,
          ).length;

          console.log(
            `Bulk status emails: ${successCount}/${fullApplications.length} sent successfully`,
          );
        } catch (error) {
          console.error("Error sending bulk status change emails:", error);
          captureEmailError(error, {
            emailType: "bulk_status_change",
            templateName: `application${input.status.toLowerCase().charAt(0).toUpperCase() + input.status.toLowerCase().slice(1)}`,
            recipient: `${input.applicationIds.length} applications`,
          });
          // Don't fail the status update if emails fail
        }
      }

      return applications;
    }),

  // Admin/Floor Lead: Bulk delete applications
  bulkDeleteApplications: protectedProcedure
    .input(BulkDeleteApplicationsSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch eventId from first application for floor lead auth check
      const firstApp = await ctx.db.application.findFirst({
        where: { id: { in: input.applicationIds } },
        select: { eventId: true },
      });
      if (!firstApp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No applications found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        firstApp.eventId,
      );

      // Hard delete - all child records (responses, venues, evaluations, etc.)
      // are cascade-deleted via Prisma schema onDelete: Cascade
      const result = await ctx.db.application.deleteMany({
        where: {
          id: {
            in: input.applicationIds,
          },
        },
      });

      return { count: result.count };
    }),

  // Floor Lead/Admin: Toggle cross-floor sharing for a single application
  toggleShareAcrossFloors: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        shared: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        select: { eventId: true, venues: { select: { venueId: true } } },
      });
      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Authorize: admin/staff OR floor lead who owns a venue the application is linked to
      if (!isAdminOrStaff(ctx.session.user.role)) {
        const ownedVenueIds = await getUserOwnedVenueIds(
          ctx.db,
          ctx.session.user.id,
          application.eventId,
        );
        const hasAccess = application.venues.some((v) =>
          ownedVenueIds.includes(v.venueId),
        );
        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only share applications linked to your floor(s)",
          });
        }
      }

      return ctx.db.application.update({
        where: { id: input.applicationId },
        data: {
          sharedAcrossFloors: input.shared,
          sharedByUserId: input.shared ? ctx.session.user.id : null,
          sharedAt: input.shared ? new Date() : null,
        },
      });
    }),

  // Floor Lead/Admin: Bulk toggle cross-floor sharing
  bulkShareAcrossFloors: protectedProcedure
    .input(
      z.object({
        applicationIds: z.array(z.string()),
        shared: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const firstApp = await ctx.db.application.findFirst({
        where: { id: { in: input.applicationIds } },
        select: { eventId: true },
      });
      if (!firstApp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No applications found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        firstApp.eventId,
      );

      const result = await ctx.db.application.updateMany({
        where: { id: { in: input.applicationIds } },
        data: {
          sharedAcrossFloors: input.shared,
          sharedByUserId: input.shared ? ctx.session.user.id : null,
          sharedAt: input.shared ? new Date() : null,
        },
      });
      return { count: result.count };
    }),

  // Admin: Create questions for an event
  createEventQuestion: protectedProcedure
    .input(CreateQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const question = await ctx.db.applicationQuestion.create({
        data: input,
      });

      return question;
    }),

  // Admin: Import legacy application
  importLegacyApplication: protectedProcedure
    .input(ImportLegacyApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Check if application already exists for this email/event
      const existing = await ctx.db.application.findFirst({
        where: {
          email: input.email,
          eventId: input.eventId,
        },
      });

      if (existing) {
        return { skipped: true, application: existing };
      }

      // Create application without userId (legacy data)
      const application = await ctx.db.application.create({
        data: {
          eventId: input.eventId,
          email: input.email,
          status: "SUBMITTED",
          submittedAt: new Date(),
          ...(input.source === "google_form" &&
            input.sourceId && {
              googleFormId: input.sourceId,
            }),
          ...(input.source === "notion_form" &&
            input.sourceId && {
              notionPageId: input.sourceId,
            }),
        },
      });

      // Get questions for the event
      const questions = await ctx.db.applicationQuestion.findMany({
        where: { eventId: input.eventId },
      });

      // Create responses for matching questions
      const questionMap = new Map(questions.map((q) => [q.questionKey, q]));
      const responses = [];

      for (const [questionKey, answer] of Object.entries(input.responses)) {
        const question = questionMap.get(questionKey);
        if (question && answer) {
          responses.push({
            applicationId: application.id,
            questionId: question.id,
            answer,
          });
        }
      }

      if (responses.length > 0) {
        await ctx.db.applicationResponse.createMany({
          data: responses,
        });
      }

      return {
        skipped: false,
        application: await ctx.db.application.findUnique({
          where: { id: application.id },
          include: {
            responses: {
              include: {
                question: true,
              },
            },
          },
        }),
      };
    }),

  // Check if user can apply to event (has no existing application)
  canApplyToEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.application.findUnique({
        where: {
          userId_eventId: {
            userId: ctx.session.user.id,
            eventId: input.eventId,
          },
        },
      });

      return {
        canApply: !existing,
        hasApplication: !!existing,
        application: existing,
      };
    }),

  // Admin: Delete application responses (for testing missing fields)
  deleteApplicationResponse: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        questionKeys: z.array(z.string()), // Array of question keys to delete responses for
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Find the questions by their keys for this application's event
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { event: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      const questions = await ctx.db.applicationQuestion.findMany({
        where: {
          eventId: application.eventId,
          questionKey: {
            in: input.questionKeys,
          },
        },
      });

      // Delete the responses for these questions
      const deletedResponses = await ctx.db.applicationResponse.deleteMany({
        where: {
          applicationId: input.applicationId,
          questionId: {
            in: questions.map((q) => q.id),
          },
        },
      });

      return {
        deletedCount: deletedResponses.count,
        deletedQuestions: questions.map((q) => q.questionKey),
      };
    }),

  // Admin/Floor Lead: Update user name for an application
  updateApplicationUserName: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the application to find the user and eventId for auth
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        application.eventId,
      );

      if (application.user) {
        // Update the user's name
        await ctx.db.user.update({
          where: { id: application.user.id },
          data: { name: input.name },
        });
      }

      // Return updated application
      return await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      });
    }),

  // Admin/Floor Lead: Update application affiliation
  updateApplicationAffiliation: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        affiliation: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch eventId for auth check
      const appForAuth = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        select: { eventId: true },
      });
      if (!appForAuth) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        appForAuth.eventId,
      );

      // Update the application's affiliation field directly
      const application = await ctx.db.application.update({
        where: { id: input.applicationId },
        data: { affiliation: input.affiliation },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      return application;
    }),

  // Admin/Floor Lead: Update user profile fields for an application
  updateApplicationUserProfile: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        email: z.string().email().optional(),
        firstName: z.string().min(1).optional(),
        surname: z.string().optional().nullable(),
        bio: z.string().max(1000).optional().nullable(),
        jobTitle: z.string().max(100).optional().nullable(),
        company: z.string().max(100).optional().nullable(),
        website: z.string().url().optional().nullable().or(z.literal("")),
        linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
        twitterUrl: z.string().url().optional().nullable().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        application.eventId,
      );

      if (!application.user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Application has no linked user",
        });
      }

      // Email uniqueness check
      if (
        input.email &&
        input.email.toLowerCase() !== application.user.email?.toLowerCase()
      ) {
        const existingUser = await ctx.db.user.findFirst({
          where: {
            email: { equals: input.email.toLowerCase(), mode: "insensitive" },
            id: { not: application.user.id },
          },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists",
          });
        }
      }

      // Build User update data
      const userUpdateData: Record<string, string> = {};
      if (input.email !== undefined) {
        userUpdateData.email = input.email.toLowerCase();
      }
      if (input.firstName !== undefined) {
        userUpdateData.firstName = input.firstName;
        const sn =
          input.surname !== undefined
            ? input.surname
            : (application.user.surname ?? "");
        userUpdateData.name = sn ? `${input.firstName} ${sn}` : input.firstName;
      }
      if (input.surname !== undefined) {
        userUpdateData.surname = input.surname ?? "";
        const fn = input.firstName ?? application.user.firstName ?? "";
        userUpdateData.name = input.surname ? `${fn} ${input.surname}` : fn;
      }

      // Build UserProfile update data
      const profileFields: Record<string, string | null> = {};
      if (input.bio !== undefined) profileFields.bio = input.bio ?? null;
      if (input.jobTitle !== undefined)
        profileFields.jobTitle = input.jobTitle ?? null;
      if (input.company !== undefined)
        profileFields.company = input.company ?? null;
      if (input.website !== undefined)
        profileFields.website = input.website ?? null;
      if (input.linkedinUrl !== undefined)
        profileFields.linkedinUrl = input.linkedinUrl ?? null;
      if (input.twitterUrl !== undefined)
        profileFields.twitterUrl = input.twitterUrl ?? null;

      // Execute updates in a transaction
      await ctx.db.$transaction(async (tx) => {
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: application.user!.id },
            data: userUpdateData,
          });
        }

        // Keep Application.email in sync
        if (input.email !== undefined) {
          await tx.application.update({
            where: { id: input.applicationId },
            data: { email: input.email.toLowerCase() },
          });
        }

        // Upsert UserProfile
        if (Object.keys(profileFields).length > 0) {
          await tx.userProfile.upsert({
            where: { userId: application.user!.id },
            update: profileFields,
            create: { userId: application.user!.id, ...profileFields },
          });
        }
      });

      return await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      });
    }),

  // Bulk update application responses
  bulkUpdateApplicationResponses: protectedProcedure
    .input(BulkUpdateApplicationResponsesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the application exists and user has access (owner or admin/staff)
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Allow access if user owns the application OR user is admin/staff
      const isOwner = application.userId === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied - you can only edit your own applications",
        });
      }

      // Use transaction to update all responses atomically
      const updatedResponses = await ctx.db.$transaction(
        input.responses.map((response) =>
          ctx.db.applicationResponse.upsert({
            where: {
              applicationId_questionId: {
                applicationId: input.applicationId,
                questionId: response.questionId,
              },
            },
            update: {
              answer: response.answer,
            },
            create: {
              applicationId: input.applicationId,
              questionId: response.questionId,
              answer: response.answer,
            },
          }),
        ),
      );

      // Auto-check and update completion status (pass eventId to parallelize queries)
      const completionResult = await checkApplicationCompleteness(
        ctx.db,
        input.applicationId,
        application.eventId,
      );
      await updateApplicationCompletionStatus(
        ctx.db,
        input.applicationId,
        completionResult,
        {
          isUserIntentionalEdit: true, // This is a bulk save, treat as intentional edit
        },
      );

      return {
        success: true,
        updatedCount: updatedResponses.length,
      };
    }),

  // Admin: Get application statistics for demographics
  getApplicationStats: protectedProcedure
    .input(
      z.object({
        eventId: z.string(), // Can be ID or slug
        status: z
          .enum([
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
            "CANCELLED",
          ])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Resolve eventId (supports both ID and slug)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      // Import demographics utilities
      const { isLatamCountry, normalizeGender, calculatePercentage } =
        await import("~/utils/demographics");

      // Get applications with their responses, filtering by status if provided
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          ...(input.status && { status: input.status }),
        },
        include: {
          responses: {
            include: {
              question: {
                select: {
                  id: true,
                  questionKey: true,
                },
              },
            },
          },
        },
      });

      // Process demographic data
      let maleCount = 0;
      let femaleCount = 0;
      let otherGenderCount = 0;
      let preferNotToSayCount = 0;
      let unspecifiedGenderCount = 0;

      let latamCount = 0;
      let nonLatamCount = 0;
      let unspecifiedRegionCount = 0;

      for (const application of applications) {
        const responseMap = new Map(
          application.responses.map((r) => [r.question.questionKey, r.answer]),
        );

        // Process gender data
        const genderResponse =
          responseMap.get("gender") ?? responseMap.get("sex") ?? "";
        const normalizedGender = normalizeGender(genderResponse);

        switch (normalizedGender) {
          case "male":
            maleCount++;
            break;
          case "female":
            femaleCount++;
            break;
          case "other":
            otherGenderCount++;
            break;
          case "prefer_not_to_say":
            preferNotToSayCount++;
            break;
          case "unspecified":
            unspecifiedGenderCount++;
            break;
        }

        // Process nationality/region data
        const nationalityResponse =
          responseMap.get("nationality") ?? responseMap.get("country") ?? "";

        if (!nationalityResponse) {
          unspecifiedRegionCount++;
        } else if (isLatamCountry(nationalityResponse)) {
          latamCount++;
        } else {
          nonLatamCount++;
        }
      }

      const total = applications.length;

      return {
        total,
        gender: {
          male: maleCount,
          female: femaleCount,
          other: otherGenderCount,
          prefer_not_to_say: preferNotToSayCount,
          unspecified: unspecifiedGenderCount,
          percentages: {
            male: calculatePercentage(maleCount, total),
            female: calculatePercentage(femaleCount, total),
            other: calculatePercentage(otherGenderCount, total),
            prefer_not_to_say: calculatePercentage(preferNotToSayCount, total),
            unspecified: calculatePercentage(unspecifiedGenderCount, total),
          },
        },
        region: {
          latam: latamCount,
          non_latam: nonLatamCount,
          unspecified: unspecifiedRegionCount,
          percentages: {
            latam: calculatePercentage(latamCount, total),
            non_latam: calculatePercentage(nonLatamCount, total),
            unspecified: calculatePercentage(unspecifiedRegionCount, total),
          },
        },
      };
    }),

  // Create sponsored application (admin-only)
  createSponsoredApplication: protectedProcedure
    .input(CreateSponsoredApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check admin access
      checkAdminAccess(ctx.session.user.role);

      // Check if application already exists for this email and event
      const existingApplication = await ctx.db.application.findFirst({
        where: {
          email: input.email,
          eventId: input.eventId,
        },
      });

      if (existingApplication) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "An application already exists for this email address and event",
        });
      }

      // Create sponsored application with ACCEPTED status
      const application = await ctx.db.application.create({
        data: {
          eventId: input.eventId,
          email: input.email,
          status: "ACCEPTED",
          language: "en",
          affiliation: input.organization ?? null,
          isComplete: true,
          completedAt: new Date(),
          submittedAt: new Date(),
          // Note: userId is null for sponsored applications
        },
        include: {
          event: true,
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      // Create basic response entries for name, organization, and notes if provided
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        include: {
          applicationQuestions: {
            where: {
              questionKey: {
                in: [
                  "name",
                  "full_name",
                  "organization",
                  "notes",
                  "internal_notes",
                ],
              },
            },
          },
        },
      });

      if (event?.applicationQuestions) {
        const responsesToCreate = [];

        // Find and populate name field
        const nameQuestion = event.applicationQuestions.find(
          (q) => q.questionKey === "name" || q.questionKey === "full_name",
        );
        if (nameQuestion) {
          responsesToCreate.push({
            applicationId: application.id,
            questionId: nameQuestion.id,
            answer: input.name,
          });
        }

        // Find and populate organization field
        if (input.organization) {
          const orgQuestion = event.applicationQuestions.find(
            (q) => q.questionKey === "organization",
          );
          if (orgQuestion) {
            responsesToCreate.push({
              applicationId: application.id,
              questionId: orgQuestion.id,
              answer: input.organization,
            });
          }
        }

        // Find and populate notes field
        if (input.notes) {
          const notesQuestion = event.applicationQuestions.find(
            (q) =>
              q.questionKey === "notes" || q.questionKey === "internal_notes",
          );
          if (notesQuestion) {
            responsesToCreate.push({
              applicationId: application.id,
              questionId: notesQuestion.id,
              answer: input.notes,
            });
          }
        }

        // Create all responses
        if (responsesToCreate.length > 0) {
          await ctx.db.applicationResponse.createMany({
            data: responsesToCreate,
          });
        }
      }

      return application;
    }),

  // Admin: Update waitlist order for manual ranking
  updateWaitlistOrder: protectedProcedure
    .input(UpdateWaitlistOrderSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // If position is provided, adjust other applications first
      if (input.position !== undefined && input.position !== null) {
        // Get the application's event to scope the reordering
        const application = await ctx.db.application.findUnique({
          where: { id: input.applicationId },
          select: { eventId: true, waitlistOrder: true },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        // Shift other applications down if they have the same or higher position
        await ctx.db.application.updateMany({
          where: {
            eventId: application.eventId,
            waitlistOrder: { gte: input.position },
            id: { not: input.applicationId }, // Don't update the current application
          },
          data: {
            waitlistOrder: { increment: 1 },
          },
        });

        // Update the current application
        const updatedApplication = await ctx.db.application.update({
          where: { id: input.applicationId },
          data: { waitlistOrder: input.position },
        });

        return updatedApplication;
      } else {
        // Clear manual override - set waitlistOrder to null
        const updatedApplication = await ctx.db.application.update({
          where: { id: input.applicationId },
          data: { waitlistOrder: null },
        });

        return updatedApplication;
      }
    }),

  // Get accepted residents for an event
  getAcceptedResidents: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        minProfileCompletion: z.number().min(0).max(100).optional().default(70),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return {
          residents: [],
          totalAccepted: 0,
          visibleResidents: 0,
          hiddenCount: 0,
        };
      }

      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              kudos: true,
              profile: {
                select: {
                  id: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  website: true,
                  avatarUrl: true,
                  projects: {
                    where: { featured: true },
                    take: 3,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      });

      // Filter residents by profile completion percentage
      const residentsWithCompletion = acceptedApplications
        .map((app) => {
          const user = app.user;
          const profile = user?.profile;

          // Calculate profile completion
          const fields = {
            name: !!user?.name,
            image: !!user?.image,
            bio: !!profile?.bio,
            jobTitle: !!profile?.jobTitle,
            company: !!profile?.company,
            location: !!profile?.location,
            skills: !!profile?.skills && profile.skills.length > 0,
            githubUrl: !!profile?.githubUrl,
            linkedinUrl: !!profile?.linkedinUrl,
            website: !!profile?.website,
          };

          const completedFields = Object.values(fields).filter(Boolean).length;
          const totalFields = Object.keys(fields).length;
          const percentage = Math.round((completedFields / totalFields) * 100);

          return {
            user,
            completionPercentage: percentage,
            meetsThreshold: percentage >= input.minProfileCompletion,
          };
        })
        .filter((resident) => resident.meetsThreshold);

      return {
        residents: residentsWithCompletion,
        totalAccepted: acceptedApplications.length,
        visibleResidents: residentsWithCompletion.length,
        hiddenCount:
          acceptedApplications.length - residentsWithCompletion.length,
      };
    }),

  // Get featured projects from accepted residents
  getResidentProjects: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  id: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  website: true,
                  avatarUrl: true,
                  projects: {
                    orderBy: [
                      { featured: "desc" },
                      { order: "asc" },
                      { updatedAt: "desc" },
                    ],
                    include: {
                      updates: {
                        include: {
                          likes: true,
                        },
                      },
                      likes: {
                        select: {
                          userId: true,
                        },
                      },
                      metrics: {
                        where: {
                          isTracking: true,
                        },
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const projects = acceptedApplications.flatMap((app) => {
        const userProfile = app.user?.profile;
        if (!userProfile) return [];

        return userProfile.projects.map((project) => ({
          ...project,
          profile: {
            ...userProfile,
            user: app.user,
          },
        }));
      });

      return projects;
    }),

  // Public: Get accepted participants for an event
  getEventParticipants: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const participants = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT", // Only show residents, not mentors for privacy
        },
        select: {
          id: true,
          submittedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  interests: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  twitterUrl: true,
                  website: true,
                  priorExperience: true,
                  availableForHiring: true,
                  availableForMentoring: true,
                  availableForOfficeHours: true,
                },
              },
              userSkills: {
                select: {
                  id: true,
                  experienceLevel: true,
                  skill: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
                orderBy: {
                  experienceLevel: "desc",
                },
                take: 10,
              },
            },
          },
        },
        orderBy: {
          submittedAt: "asc", // Show earlier applicants first
        },
      });

      return participants;
    }),

  // Search event participants with filters
  searchEventParticipants: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        search: z.string().optional(),
        skillCategories: z.array(z.string()).optional(),
        availableForHiring: z.boolean().optional(),
        availableForMentoring: z.boolean().optional(),
        availableForOfficeHours: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        eventId,
        search,
        skillCategories,
        availableForHiring,
        availableForMentoring,
        availableForOfficeHours,
      } = input;

      // Build dynamic where conditions
      const andConditions: Prisma.ApplicationWhereInput[] = [
        { eventId },
        { status: "ACCEPTED" },
        { applicationType: "RESIDENT" },
      ];

      // Text search across name, skills, profile fields, and prior experience
      if (search) {
        andConditions.push({
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            {
              user: {
                profile: {
                  OR: [
                    { bio: { contains: search, mode: "insensitive" } },
                    { jobTitle: { contains: search, mode: "insensitive" } },
                    { company: { contains: search, mode: "insensitive" } },
                    {
                      priorExperience: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              },
            },
            {
              user: {
                userSkills: {
                  some: {
                    skill: { name: { contains: search, mode: "insensitive" } },
                  },
                },
              },
            },
          ],
        });
      }

      // Skill category filter
      if (skillCategories && skillCategories.length > 0) {
        andConditions.push({
          user: {
            userSkills: {
              some: {
                skill: {
                  category: { in: skillCategories },
                },
              },
            },
          },
        });
      }

      // Availability filters
      if (availableForHiring !== undefined) {
        andConditions.push({
          user: { profile: { availableForHiring } },
        });
      }
      if (availableForMentoring !== undefined) {
        andConditions.push({
          user: { profile: { availableForMentoring } },
        });
      }
      if (availableForOfficeHours !== undefined) {
        andConditions.push({
          user: { profile: { availableForOfficeHours } },
        });
      }

      const participants = await ctx.db.application.findMany({
        where: {
          AND: andConditions,
        },
        select: {
          id: true,
          submittedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  bio: true,
                  jobTitle: true,
                  company: true,
                  location: true,
                  skills: true,
                  interests: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  twitterUrl: true,
                  website: true,
                  priorExperience: true,
                  availableForHiring: true,
                  availableForMentoring: true,
                  availableForOfficeHours: true,
                },
              },
              userSkills: {
                select: {
                  id: true,
                  experienceLevel: true,
                  skill: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
                orderBy: {
                  experienceLevel: "desc",
                },
                take: 10,
              },
            },
          },
        },
        orderBy: {
          submittedAt: "asc",
        },
      });

      return {
        participants,
        totalCount: participants.length,
      };
    }),

  // Admin/Floor Lead: Get single application by ID with full details
  getApplicationById: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch eventId for floor lead auth check
      const appForAuth = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        select: { eventId: true },
      });
      if (!appForAuth) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        appForAuth.eventId,
      );

      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
              adminNotes: true,
              adminWorkExperience: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              startDate: true,
              endDate: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
            orderBy: {
              question: {
                order: "asc",
              },
            },
          },
          reviewerAssignments: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
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

      return application;
    }),

  // Get accepted residents for hyperboard visualization
  getResidentsForHyperboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return acceptedApplications
        .filter((app) => app.user)
        .map((app) => {
          const user = app.user!;
          const displayName =
            user.firstName && user.surname
              ? `${user.firstName} ${user.surname}`
              : (user.name ?? "Unknown Resident");

          return {
            type: "resident",
            id: user.id,
            avatar: user.profile?.avatarUrl ?? user.image,
            displayName,
            value: 1, // Equal value = same tile size
            isBlueprint: false, // All accepted residents are qualified
          };
        });
    }),

  // Get accepted residents for kudosboard visualization (sized by kudos)
  getResidentsForKudosboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              kudos: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return acceptedApplications
        .filter((app) => app.user)
        .map((app) => {
          const user = app.user!;
          const displayName =
            user.firstName && user.surname
              ? `${user.firstName} ${user.surname}`
              : (user.name ?? "Unknown Resident");

          return {
            type: "resident",
            id: user.id,
            avatar: user.profile?.avatarUrl ?? user.image,
            displayName,
            value: user.kudos ?? 100, // Tile size based on kudos amount
            isBlueprint: false, // All accepted residents are qualified
          };
        });
    }),

  // Get projects for hyperboard visualization
  getProjectsForHyperboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      imageUrl: true,
                      bannerUrl: true,
                      featured: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const projects = acceptedApplications
        .flatMap((app) => app.user?.profile?.projects ?? [])
        .filter((project) => project.id);

      return projects.map((project) => ({
        type: "project",
        id: project.id,
        avatar: project.imageUrl ?? project.bannerUrl,
        displayName: project.title,
        value: 1, // Equal value = same tile size
        isBlueprint: false,
      }));
    }),

  // Get combined hyperboard (sponsors + residents)
  getCombinedHyperboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId) {
        return [];
      }

      // Fetch sponsors
      const eventSponsors = await ctx.db.eventSponsor.findMany({
        where: {
          eventId: resolvedEventId,
        },
        include: {
          sponsor: {
            include: {
              geckoCoin: true,
            },
          },
        },
      });

      // Sponsor funding amounts (in thousands)
      const sponsorFunding: Record<string, number> = {
        "Protocol Labs": 35,
        NEAR: 20,
        Stellar: 17,
        Octant: 17,
        "Human Tech": 10,
        Logos: 7,
        Drips: 5,
      };

      // Fetch accepted residents
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: resolvedEventId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              kudos: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Transform sponsors
      const sponsorEntries = eventSponsors.map((es) => {
        const fundingAmount = sponsorFunding[es.sponsor.name] ?? 1;

        return {
          type: "sponsor",
          id: es.sponsor.id,
          avatar: es.sponsor.logoUrl,
          displayName: es.sponsor.name,
          value: fundingAmount,
          isBlueprint: !es.qualified,
        };
      });

      // Transform residents
      const residentEntries = acceptedApplications
        .filter((app) => app.user)
        .map((app) => {
          const user = app.user!;
          const displayName =
            user.firstName && user.surname
              ? `${user.firstName} ${user.surname}`
              : (user.name ?? "Unknown Resident");

          return {
            type: "resident",
            id: user.id,
            avatar: user.profile?.avatarUrl ?? user.image,
            displayName,
            value: user.kudos ?? 100,
            isBlueprint: false,
          };
        });

      // Calculate scaling to achieve 64% sponsors, 36% residents
      const totalSponsorValue = sponsorEntries.reduce(
        (sum, s) => sum + s.value,
        0,
      );
      const totalResidentKudos = residentEntries.reduce(
        (sum, r) => sum + r.value,
        0,
      );

      // Scale resident values so they occupy 36% of total board space
      // Target: sponsors = 64%, residents = 36%
      // Formula: (totalSponsor * 0.36) / (totalResident * 0.64) = multiplier
      const residentMultiplier =
        totalResidentKudos > 0
          ? (totalSponsorValue * 0.36) / (totalResidentKudos * 0.64)
          : 1;

      // Scale resident values
      const scaledResidentEntries = residentEntries.map((r) => ({
        ...r,
        value: r.value * residentMultiplier,
      }));

      // Combine both datasets
      return [...sponsorEntries, ...scaledResidentEntries];
    }),

  // Get venue pre-selections for an invitation token (inviter's owned venues)
  getInviterVenues: protectedProcedure
    .input(
      z.object({
        invitationToken: z.string(),
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.invitationToken },
        select: {
          invitedBy: true,
          eventId: true,
        },
      });

      if (!invitation?.invitedBy) {
        return [];
      }

      // Resolve eventId for comparison
      const resolvedEventId = await resolveEventId(ctx.db, input.eventId);
      if (!resolvedEventId || invitation.eventId !== resolvedEventId) {
        return [];
      }

      // Look up the inviter's owned venues
      const ownedVenues = await ctx.db.venueOwner.findMany({
        where: {
          userId: invitation.invitedBy,
          eventId: resolvedEventId,
        },
        include: {
          venue: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ownedVenues.map((vo) => vo.venue);
    }),

  // Create speaker application on behalf of a speaker (floor lead or admin)
  createSpeakerOnBehalf: protectedProcedure
    .input(CreateSpeakerOnBehalfSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Authorization: must be admin/staff or floor lead for this event
      await assertAdminOrEventFloorOwner(
        ctx.db,
        userId,
        userRole,
        input.eventId,
      );

      // If floor lead (not admin), verify selected venues belong to them
      if (!isAdminOrStaff(userRole) && input.venueIds?.length) {
        const ownedVenueIds = await getUserOwnedVenueIds(
          ctx.db,
          userId,
          input.eventId,
        );
        const unauthorized = input.venueIds.filter(
          (id) => !ownedVenueIds.includes(id),
        );
        if (unauthorized.length > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only add speakers to venues you manage",
          });
        }
      }

      // Check if application already exists for this email and event
      const existingApplication = await ctx.db.application.findFirst({
        where: {
          email: input.email.toLowerCase(),
          eventId: input.eventId,
        },
      });

      if (existingApplication) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "An application already exists for this email address and event",
        });
      }

      // Find or create user by email
      let speakerUser = await ctx.db.user.findFirst({
        where: {
          email: { equals: input.email.toLowerCase(), mode: "insensitive" },
        },
      });

      if (!speakerUser) {
        const fullName = input.lastName
          ? `${input.firstName} ${input.lastName}`
          : input.firstName;

        speakerUser = await ctx.db.user.create({
          data: {
            email: input.email.toLowerCase(),
            firstName: input.firstName,
            surname: input.lastName ?? null,
            name: fullName,
            role: "user",
          },
        });
      }

      // Upsert UserProfile with speaker fields
      await ctx.db.userProfile.upsert({
        where: { userId: speakerUser.id },
        update: {
          speakerTalkTitle: input.talkTitle,
          speakerTalkAbstract: input.talkAbstract,
          speakerTalkFormat: input.talkFormat,
          speakerTalkDuration: input.talkDuration,
          speakerTalkTopic: input.talkTopic,
          speakerPreviousExperience: input.previousSpeakingExperience ?? null,
          speakerPastTalkUrl: input.pastTalkUrl ?? null,
          speakerEntityName: input.speakerEntityName ?? null,
          speakerOtherFloorsTopicTheme:
            input.speakerOtherFloorsTopicTheme ?? null,
          speakerDisplayPreference: input.speakerDisplayPreference ?? null,
          bio: input.bio,
          jobTitle: input.jobTitle ?? null,
          company: input.company ?? null,
          website: input.website ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          twitterUrl: input.twitterUrl ?? null,
        },
        create: {
          userId: speakerUser.id,
          speakerTalkTitle: input.talkTitle,
          speakerTalkAbstract: input.talkAbstract,
          speakerTalkFormat: input.talkFormat,
          speakerTalkDuration: input.talkDuration,
          speakerTalkTopic: input.talkTopic,
          speakerPreviousExperience: input.previousSpeakingExperience ?? null,
          speakerPastTalkUrl: input.pastTalkUrl ?? null,
          speakerEntityName: input.speakerEntityName ?? null,
          speakerOtherFloorsTopicTheme:
            input.speakerOtherFloorsTopicTheme ?? null,
          speakerDisplayPreference: input.speakerDisplayPreference ?? null,
          bio: input.bio,
          jobTitle: input.jobTitle ?? null,
          company: input.company ?? null,
          website: input.website ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          twitterUrl: input.twitterUrl ?? null,
        },
      });

      // Create application
      const application = await ctx.db.application.create({
        data: {
          eventId: input.eventId,
          userId: speakerUser.id,
          email: input.email.toLowerCase(),
          applicationType: "SPEAKER",
          status: "SUBMITTED",
          language: "en",
          affiliation: input.company ?? null,
          isComplete: true,
          completedAt: new Date(),
          submittedAt: new Date(),
          speakerPreferredDates: input.speakerPreferredDates ?? null,
          speakerPreferredTimes: input.speakerPreferredTimes ?? null,
        },
      });

      // Create ApplicationOnboarding with headshot if provided
      if (input.headshotUrl) {
        await ctx.db.applicationOnboarding.create({
          data: {
            applicationId: application.id,
            headshotUrl: input.headshotUrl,
            headshotFileName: input.headshotFileName ?? null,
            shortBio: input.bio,
          },
        });
      }

      // Create ApplicationVenue records
      if (input.venueIds?.length) {
        await ctx.db.applicationVenue.createMany({
          data: input.venueIds.map((venueId) => ({
            applicationId: application.id,
            venueId,
          })),
          skipDuplicates: true,
        });
      }

      // Assign speaker role
      const speakerRole = await ctx.db.role.findFirst({
        where: { name: { contains: "speaker", mode: "insensitive" } },
      });

      if (speakerRole) {
        await ctx.db.userRole.createMany({
          data: [
            {
              userId: speakerUser.id,
              eventId: input.eventId,
              roleId: speakerRole.id,
            },
          ],
          skipDuplicates: true,
        });
      }

      return {
        application,
        user: {
          id: speakerUser.id,
          email: speakerUser.email,
          name: speakerUser.name,
        },
      };
    }),
});
