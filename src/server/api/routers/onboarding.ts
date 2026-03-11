import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Enums matching Prisma schema
const DietTypeSchema = z.enum(["OMNIVORE", "VEGETARIAN", "VEGAN", "OTHER"]);
const MentoringOpennessSchema = z.enum(["YES", "NO", "MAYBE"]);

const onboardingDataSchema = z.object({
  applicationId: z.string(),

  // Contact & Logistics
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  arrivalDateTime: z.date().optional(),
  departureDateTime: z.date().optional(),

  // Travel Documents
  eTicketUrl: z.string().url().optional(),
  eTicketFileName: z.string().optional(),
  healthInsuranceUrl: z.string().url().optional(),
  healthInsuranceFileName: z.string().optional(),

  // Food & Dietary Needs
  dietType: DietTypeSchema.optional(),
  dietTypeOther: z.string().optional(),
  allergiesIntolerances: z.string().optional(),
  dietaryRequirements: z.string().optional(), // Legacy field

  // English Proficiency
  englishProficiencyLevel: z.number().min(0).max(100).optional(),

  // Knowledge Sharing, Community & Mentorship
  primaryGoals: z.string().optional(),
  skillsToGain: z.string().optional(),
  openToMentoring: MentoringOpennessSchema.optional(),
  mentorsToLearnFrom: z.string().optional(),
  organizationsToConnect: z.string().optional(),

  // Technical Workshop
  technicalWorkshopTitle: z.string().optional(),
  technicalWorkshopDescription: z.string().optional(),
  technicalWorkshopDuration: z.string().optional(),
  technicalWorkshopMaterials: z.string().optional(),

  // Beyond Work Activities
  beyondWorkInterests: z.string().optional(),
  beyondWorkTitle: z.string().optional(),
  beyondWorkDescription: z.string().optional(),
  beyondWorkDuration: z.string().optional(),
  beyondWorkMaterials: z.string().optional(),

  // Media & Bio
  headshotUrl: z.string().url().optional(),
  headshotFileName: z.string().optional(),
  shortBio: z.string().optional(),

  // Commitments & Confirmations
  participateExperiments: z.boolean(),
  mintHypercert: z.boolean(),
  interestedIncubation: z.boolean(),
  liabilityWaiverConsent: z.boolean(),
  codeOfConductAgreement: z.boolean(),
  communityActivitiesConsent: z.boolean(),

  // Additional Information
  additionalComments: z.string().optional(),
});

export const onboardingRouter = createTRPCRouter({
  // Submit onboarding data
  submitOnboarding: protectedProcedure
    .input(onboardingDataSchema)
    .mutation(async ({ ctx, input }) => {
      const { applicationId, ...onboardingData } = input;

      // Verify that the application belongs to the current user and is accepted
      const application = await ctx.db.application.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only submit onboarding for your own application",
        });
      }

      if (application.status !== "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Onboarding is only available for accepted applications",
        });
      }

      // Validate required fields
      if (
        !onboardingData.participateExperiments ||
        !onboardingData.mintHypercert
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Participation commitments are required",
        });
      }

      if (
        !onboardingData.liabilityWaiverConsent ||
        !onboardingData.codeOfConductAgreement ||
        !onboardingData.communityActivitiesConsent
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All final confirmations are required",
        });
      }

      // Note: e-ticket and health insurance documents are optional

      // Validate essential contact information
      if (!onboardingData.emergencyContactName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Emergency contact is required",
        });
      }

      // Create or update onboarding record
      const onboarding = await ctx.db.applicationOnboarding.upsert({
        where: { applicationId },
        create: {
          applicationId,
          ...onboardingData,
          completed: true,
          submittedAt: new Date(),
        },
        update: {
          ...onboardingData,
          completed: true,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        onboarding,
      };
    }),

  // Get onboarding data for an application
  getOnboarding: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify that the application belongs to the current user
      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          onboarding: true,
          user: true,
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view onboarding for your own application",
        });
      }

      return {
        application: {
          id: application.id,
          status: application.status,
        },
        onboarding: application.onboarding,
      };
    }),

  // Save draft onboarding data (partial save)
  saveDraft: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),

        // Contact & Logistics
        bloodType: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactRelationship: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        arrivalDateTime: z.date().optional(),
        departureDateTime: z.date().optional(),

        // Travel Documents
        eTicketUrl: z.string().url().optional(),
        eTicketFileName: z.string().optional(),
        healthInsuranceUrl: z.string().url().optional(),
        healthInsuranceFileName: z.string().optional(),

        // Food & Dietary Needs
        dietType: DietTypeSchema.optional(),
        dietTypeOther: z.string().optional(),
        allergiesIntolerances: z.string().optional(),
        dietaryRequirements: z.string().optional(),

        // English Proficiency
        englishProficiencyLevel: z.number().min(0).max(100).optional(),

        // Knowledge Sharing, Community & Mentorship
        primaryGoals: z.string().optional(),
        skillsToGain: z.string().optional(),
        openToMentoring: MentoringOpennessSchema.optional(),
        mentorsToLearnFrom: z.string().optional(),
        organizationsToConnect: z.string().optional(),

        // Technical Workshop
        technicalWorkshopTitle: z.string().optional(),
        technicalWorkshopDescription: z.string().optional(),
        technicalWorkshopDuration: z.string().optional(),
        technicalWorkshopMaterials: z.string().optional(),

        // Beyond Work Activities
        beyondWorkInterests: z.string().optional(),
        beyondWorkTitle: z.string().optional(),
        beyondWorkDescription: z.string().optional(),
        beyondWorkDuration: z.string().optional(),
        beyondWorkMaterials: z.string().optional(),

        // Media & Bio
        headshotUrl: z.string().url().optional(),
        headshotFileName: z.string().optional(),
        shortBio: z.string().optional(),

        // Commitments & Confirmations
        participateExperiments: z.boolean().optional(),
        mintHypercert: z.boolean().optional(),
        interestedIncubation: z.boolean().optional(),
        liabilityWaiverConsent: z.boolean().optional(),
        codeOfConductAgreement: z.boolean().optional(),
        communityActivitiesConsent: z.boolean().optional(),

        // Additional Information
        additionalComments: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { applicationId, ...onboardingData } = input;

      // Verify that the application belongs to the current user and is accepted
      const application = await ctx.db.application.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only save onboarding for your own application",
        });
      }

      if (application.status !== "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Onboarding is only available for accepted applications",
        });
      }

      // Create or update onboarding record (as draft)
      const onboarding = await ctx.db.applicationOnboarding.upsert({
        where: { applicationId },
        create: {
          applicationId,
          ...onboardingData,
          completed: false,
        },
        update: {
          ...onboardingData,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        onboarding,
      };
    }),

  // Get onboarding status for admin (helper for checking completion)
  getOnboardingStatus: protectedProcedure
    .input(z.object({ applicationIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      // This endpoint can be used by admins to check onboarding completion status
      // TODO: Add admin role check if needed

      const onboardings = await ctx.db.applicationOnboarding.findMany({
        where: {
          applicationId: { in: input.applicationIds },
        },
        select: {
          applicationId: true,
          completed: true,
          submittedAt: true,
          eTicketUrl: true,
          healthInsuranceUrl: true,
          participateExperiments: true,
          mintHypercert: true,
        },
      });

      return onboardings.reduce(
        (acc, onboarding) => {
          acc[onboarding.applicationId] = {
            completed: onboarding.completed,
            submittedAt: onboarding.submittedAt,
            hasETicket: !!onboarding.eTicketUrl,
            hasInsurance: !!onboarding.healthInsuranceUrl,
            hasCommitments:
              onboarding.participateExperiments && onboarding.mintHypercert,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            completed: boolean;
            submittedAt: Date | null;
            hasETicket: boolean;
            hasInsurance: boolean;
            hasCommitments: boolean;
          }
        >,
      );
    }),
});
