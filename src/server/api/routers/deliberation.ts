import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  assertDeliberationAccess,
  assertDeliberationAdmin,
} from "~/server/api/utils/deliberationAuth";
import { getTopicClusteringService } from "~/server/services/topicClustering";

export const deliberationRouter = createTRPCRouter({
  // ─── Queries ──────────────────────────────────────────────

  getDeliberation: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findFirst({
        where: { eventId: input.eventId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              priorities: true,
              transcripts: true,
              topicClusters: true,
            },
          },
        },
      });

      if (!deliberation) return null;

      // Non-published deliberations require attendee access
      if (deliberation.status !== "PUBLISHED" && ctx.session?.user) {
        // Authenticated user can see it — access checked at priority level
      } else if (deliberation.status !== "PUBLISHED" && !ctx.session?.user) {
        return null;
      }

      // Count total votes across all priorities
      const totalVotes = await ctx.db.deliberationVote.count({
        where: {
          priority: { deliberationId: deliberation.id },
        },
      });

      return {
        ...deliberation,
        totalVotes,
      };
    }),

  getPriorities: protectedProcedure
    .input(
      z.object({
        deliberationId: z.string(),
        sortBy: z.enum(["votes", "recent"]).optional().default("votes"),
        trackId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get deliberation to check event access
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      const where: Record<string, unknown> = {
        deliberationId: input.deliberationId,
        isModerated: false,
      };
      if (input.trackId) {
        where.trackId = input.trackId;
      }

      const priorities = await ctx.db.deliberationPriority.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { votes: true, blockers: true, resources: true } },
          blockers: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          resources: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy:
          input.sortBy === "recent"
            ? { createdAt: "desc" }
            : { votes: { _count: "desc" } },
      });

      // Get current user's votes
      const userVotes = await ctx.db.deliberationVote.findMany({
        where: {
          userId: ctx.session.user.id,
          priorityId: { in: priorities.map((p) => p.id) },
        },
        select: { priorityId: true },
      });
      const votedIds = new Set(userVotes.map((v) => v.priorityId));

      return priorities.map((p) => ({
        ...p,
        hasVoted: votedIds.has(p.id),
      }));
    }),

  getTopicClusters: protectedProcedure
    .input(z.object({ deliberationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.topicCluster.findMany({
        where: { deliberationId: input.deliberationId },
        orderBy: { mentionCount: "desc" },
      });
    }),

  getAnalysisResults: publicProcedure
    .input(z.object({ deliberationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: {
          status: true,
          analysisResult: true,
          summaryUri: true,
          pcaUri: true,
          activityUri: true,
          boardUri: true,
        },
      });

      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      if (deliberation.status !== "PUBLISHED") {
        return null;
      }

      return deliberation;
    }),

  // ─── Mutations ────────────────────────────────────────────

  createDeliberation: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(3).max(200),
        description: z.string().max(2000).optional(),
        closesAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.eventId,
      );

      return ctx.db.deliberation.create({
        data: {
          eventId: input.eventId,
          title: input.title,
          description: input.description,
          closesAt: input.closesAt,
        },
      });
    }),

  submitPriority: protectedProcedure
    .input(
      z.object({
        deliberationId: z.string(),
        title: z.string().min(3).max(200),
        description: z.string().max(2000).optional(),
        trackId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true, status: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }
      if (deliberation.status !== "COLLECTING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deliberation is not accepting submissions",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.deliberationPriority.create({
        data: {
          deliberationId: input.deliberationId,
          userId: ctx.session.user.id,
          title: input.title,
          description: input.description,
          trackId: input.trackId,
        },
      });
    }),

  vote: protectedProcedure
    .input(z.object({ priorityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get priority -> deliberation -> event for access check
      const priority = await ctx.db.deliberationPriority.findUnique({
        where: { id: input.priorityId },
        select: {
          deliberation: { select: { eventId: true, status: true } },
        },
      });
      if (!priority) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Priority not found",
        });
      }
      if (priority.deliberation.status !== "COLLECTING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deliberation is not accepting submissions",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        priority.deliberation.eventId,
      );

      if (priority.deliberation.status !== "COLLECTING") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Deliberation not accepting votes",
        });
      }

      // Toggle vote
      const existing = await ctx.db.deliberationVote.findUnique({
        where: {
          priorityId_userId: {
            priorityId: input.priorityId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existing) {
        await ctx.db.deliberationVote.delete({
          where: { id: existing.id },
        });
      } else {
        await ctx.db.deliberationVote.create({
          data: {
            priorityId: input.priorityId,
            userId: ctx.session.user.id,
          },
        });
      }

      const voteCount = await ctx.db.deliberationVote.count({
        where: { priorityId: input.priorityId },
      });

      return { voted: !existing, voteCount };
    }),

  submitBlocker: protectedProcedure
    .input(
      z.object({
        priorityId: z.string(),
        description: z.string().min(3).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const priority = await ctx.db.deliberationPriority.findUnique({
        where: { id: input.priorityId },
        select: { deliberation: { select: { eventId: true, status: true } } },
      });
      if (!priority) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Priority not found",
        });
      }
      if (priority.deliberation.status !== "COLLECTING") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Deliberation not in collecting phase",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        priority.deliberation.eventId,
      );

      return ctx.db.deliberationBlocker.create({
        data: {
          priorityId: input.priorityId,
          userId: ctx.session.user.id,
          description: input.description,
        },
      });
    }),

  submitResourceSuggestion: protectedProcedure
    .input(
      z.object({
        priorityId: z.string(),
        category: z.enum(["funding", "talent", "tooling", "other"]),
        description: z.string().min(3).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const priority = await ctx.db.deliberationPriority.findUnique({
        where: { id: input.priorityId },
        select: {
          deliberation: { select: { eventId: true, status: true } },
        },
      });
      if (!priority) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Priority not found",
        });
      }
      if (priority.deliberation.status !== "COLLECTING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deliberation is not accepting submissions",
        });
      }

      await assertDeliberationAccess(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        priority.deliberation.eventId,
      );

      return ctx.db.deliberationResourceSuggestion.create({
        data: {
          priorityId: input.priorityId,
          userId: ctx.session.user.id,
          category: input.category,
          description: input.description,
        },
      });
    }),

  closeDeliberation: protectedProcedure
    .input(z.object({ deliberationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.deliberation.update({
        where: { id: input.deliberationId },
        data: { status: "CLOSED" },
      });
    }),

  updateDeliberationStatus: protectedProcedure
    .input(
      z.object({
        deliberationId: z.string(),
        status: z.enum(["COLLECTING", "CLOSED", "ANALYZING", "PUBLISHED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.deliberation.update({
        where: { id: input.deliberationId },
        data: { status: input.status },
      });
    }),

  triggerClustering: protectedProcedure
    .input(z.object({ deliberationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      const service = getTopicClusteringService();
      const clusters = await service.clusterTopics(
        input.deliberationId,
        ctx.db,
      );

      return { success: true, clusterCount: clusters.length };
    }),

  moderatePriority: protectedProcedure
    .input(
      z.object({
        priorityId: z.string(),
        isModerated: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const priority = await ctx.db.deliberationPriority.findUnique({
        where: { id: input.priorityId },
        select: { deliberation: { select: { eventId: true } } },
      });
      if (!priority) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Priority not found",
        });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        priority.deliberation.eventId,
      );

      return ctx.db.deliberationPriority.update({
        where: { id: input.priorityId },
        data: { isModerated: input.isModerated },
      });
    }),
});
