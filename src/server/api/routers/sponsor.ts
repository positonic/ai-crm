import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const sponsorRouter = createTRPCRouter({
  createSponsor: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Sponsor name is required"),
        websiteUrl: z
          .string()
          .url("Must be a valid URL")
          .optional()
          .or(z.literal("")),
        logoUrl: z
          .string()
          .url("Must be a valid URL")
          .optional()
          .or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.create({
        data: {
          name: input.name,
          websiteUrl: input.websiteUrl === "" ? null : input.websiteUrl,
          logoUrl: input.logoUrl === "" ? null : input.logoUrl,
        },
      });
      return sponsor;
    }),

  getSponsors: publicProcedure.query(async ({ ctx }) => {
    const sponsors = await ctx.db.sponsor.findMany({
      include: {
        contacts: true,
        events: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
    return sponsors;
  }),

  getSponsor: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.findUnique({
        where: { id: input.id },
        include: {
          contacts: true,
          events: {
            include: {
              event: true,
            },
          },
        },
      });
      return sponsor;
    }),

  getSponsorCommunications: publicProcedure
    .input(
      z.object({
        sponsorId: z.string(),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all contacts for this sponsor
      const contacts = await ctx.db.contact.findMany({
        where: { sponsorId: input.sponsorId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telegram: true,
        },
      });

      if (contacts.length === 0) {
        return [];
      }

      // Build OR conditions for all contact emails and telegram usernames
      const whereConditions = [];
      for (const contact of contacts) {
        if (contact.email) {
          whereConditions.push({ toEmail: contact.email });
        }
        if (contact.telegram) {
          whereConditions.push({ toTelegram: contact.telegram });
        }
      }

      if (whereConditions.length === 0) {
        return [];
      }

      // Query all communications to any of these contacts
      const communications = await ctx.db.communication.findMany({
        where: {
          OR: whereConditions,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          channel: true,
          type: true,
          status: true,
          subject: true,
          textContent: true,
          sentAt: true,
          createdAt: true,
          createdBy: true,
          toEmail: true,
          toTelegram: true,
          fromEmail: true,
          fromTelegram: true,
        },
      });

      // Enrich communications with contact info
      return communications.map((comm) => {
        const contact = contacts.find(
          (c) => c.email === comm.toEmail || c.telegram === comm.toTelegram,
        );
        return {
          ...comm,
          contact: contact
            ? {
                id: contact.id,
                firstName: contact.firstName,
                lastName: contact.lastName,
              }
            : null,
        };
      });
    }),

  // Get sponsor residency data including visit requests and deliverables
  getSponsorResidencyData: publicProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.findUnique({
        where: { id: input.eventSponsorId },
        include: {
          sponsor: true,
          event: true,
          visitRequests: {
            orderBy: { createdAt: "desc" },
          },
          deliverables: {
            orderBy: [{ category: "asc" }, { createdAt: "asc" }],
          },
        },
      });
      return eventSponsor;
    }),

  // Create a visit request
  createVisitRequest: publicProcedure
    .input(
      z.object({
        eventSponsorId: z.string(),
        visitType: z.enum(["KICKOFF", "MENTORSHIP", "DEMO_DAY", "CUSTOM"]),
        preferredDates: z.array(z.date()),
        numAttendees: z.number().min(1).max(10),
        purpose: z.string().min(1),
        requirements: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const visitRequest = await ctx.db.sponsorVisitRequest.create({
        data: {
          eventSponsorId: input.eventSponsorId,
          visitType: input.visitType,
          preferredDates: input.preferredDates,
          numAttendees: input.numAttendees,
          purpose: input.purpose,
          requirements: input.requirements,
        },
        include: {
          eventSponsor: {
            include: {
              sponsor: true,
              event: true,
            },
          },
        },
      });
      return visitRequest;
    }),

  // Update visit request status
  updateVisitRequestStatus: publicProcedure
    .input(
      z.object({
        visitRequestId: z.string(),
        status: z.enum([
          "PENDING",
          "APPROVED",
          "SCHEDULED",
          "COMPLETED",
          "CANCELLED",
        ]),
        scheduledDate: z.date().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedRequest = await ctx.db.sponsorVisitRequest.update({
        where: { id: input.visitRequestId },
        data: {
          status: input.status,
          scheduledDate: input.scheduledDate,
          notes: input.notes,
        },
      });
      return updatedRequest;
    }),

  // Create deliverable
  createDeliverable: publicProcedure
    .input(
      z.object({
        eventSponsorId: z.string(),
        category: z.enum(["TECHNICAL", "SUPPORT", "PATHWAYS", "VISIBILITY"]),
        title: z.string().min(1),
        description: z.string().min(1),
        dueDate: z.date().optional(),
        estimatedHours: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.db.sponsorDeliverable.create({
        data: {
          eventSponsorId: input.eventSponsorId,
          category: input.category,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
        },
      });
      return deliverable;
    }),

  // Update deliverable status
  updateDeliverableStatus: publicProcedure
    .input(
      z.object({
        deliverableId: z.string(),
        status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
        actualHours: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
        actualHours?: number;
        notes?: string;
        completedAt?: Date;
      } = {
        status: input.status,
        actualHours: input.actualHours,
        notes: input.notes,
      };

      if (input.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }

      const updatedDeliverable = await ctx.db.sponsorDeliverable.update({
        where: { id: input.deliverableId },
        data: updateData,
      });
      return updatedDeliverable;
    }),

  // Bulk create default deliverables for a sponsor
  createDefaultDeliverables: publicProcedure
    .input(z.object({ eventSponsorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const defaultDeliverables = [
        {
          category: "TECHNICAL" as const,
          title: "Deep-dive Workshops",
          description:
            "Host 2-3 technical workshops during the residency covering relevant technology topics",
          estimatedHours: 8,
        },
        {
          category: "TECHNICAL" as const,
          title: "Office Hours",
          description:
            "Provide 1-2 office hour sessions for direct mentoring and guidance",
          estimatedHours: 4,
        },
        {
          category: "SUPPORT" as const,
          title: "Code Examples & Templates",
          description:
            "Provide reference materials, blueprints, and starter templates for builders",
          estimatedHours: 6,
        },
        {
          category: "PATHWAYS" as const,
          title: "Ecosystem Integration Session",
          description:
            "Present next steps and pathways into your ecosystem for resident builders",
          estimatedHours: 2,
        },
        {
          category: "VISIBILITY" as const,
          title: "Demo Day Participation",
          description:
            "Participate in final showcase, provide feedback, and amplify standout projects",
          estimatedHours: 4,
        },
      ];

      const createdDeliverables = await Promise.all(
        defaultDeliverables.map((deliverable) =>
          ctx.db.sponsorDeliverable.create({
            data: {
              eventSponsorId: input.eventSponsorId,
              ...deliverable,
            },
          }),
        ),
      );

      return createdDeliverables;
    }),

  // Get sponsor stats for dashboard
  getSponsorStats: protectedProcedure.query(async ({ ctx }) => {
    // Find all events where user has sponsor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "sponsor",
        },
      },
      include: {
        event: {
          include: {
            _count: {
              select: {
                applications: true,
                userRoles: true,
              },
            },
          },
        },
      },
    });

    const totalEvents = userRoles.length;
    const totalApplications = userRoles.reduce(
      (sum, ur) => sum + ur.event._count.applications,
      0,
    );
    const totalParticipants = userRoles.reduce(
      (sum, ur) => sum + ur.event._count.userRoles,
      0,
    );

    // Calculate impact metrics (this could be enhanced with more sophisticated metrics)
    const impactScore =
      totalEvents > 0
        ? Math.round((totalApplications + totalParticipants) / totalEvents)
        : 0;

    return {
      totalEvents,
      totalApplications,
      totalReach: totalParticipants,
      impactScore,
    };
  }),

  // Get sponsors for hyperboard visualization
  getSponsorsForHyperboard: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const eventSponsors = await ctx.db.eventSponsor.findMany({
        where: {
          eventId: input.eventId,
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

      // Transform sponsors into hyperboard entry format
      return eventSponsors.map((es) => {
        const fundingAmount = sponsorFunding[es.sponsor.name] ?? 1;

        return {
          type: "sponsor",
          id: es.sponsor.id,
          avatar: es.sponsor.logoUrl,
          displayName: es.sponsor.name,
          value: fundingAmount, // Tile size based on funding amount
          isBlueprint: !es.qualified,
        };
      });
    }),
});
