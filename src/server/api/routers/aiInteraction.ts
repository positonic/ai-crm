import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const aiInteractionRouter = createTRPCRouter({
  /**
   * Log an AI chat interaction after streaming completes.
   * Called from the client with the full user message and AI response.
   */
  logInteraction: protectedProcedure
    .input(
      z.object({
        userMessage: z.string(),
        aiResponse: z.string(),
        agentId: z.string().optional(),
        agentName: z.string().optional(),
        model: z.string().optional(),
        conversationId: z.string().optional(),
        pathname: z.string().optional(),
        eventId: z.string().optional(),
        responseTimeMs: z.number().int().optional(),
        hadError: z.boolean().optional(),
        errorMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve eventId: could be an actual ID or a slug from the URL
      let resolvedEventId: string | undefined;
      if (input.eventId) {
        const eventById = await ctx.db.event.findUnique({
          where: { id: input.eventId },
          select: { id: true },
        });
        if (eventById) {
          resolvedEventId = eventById.id;
        } else {
          const eventBySlug = await ctx.db.event.findUnique({
            where: { slug: input.eventId },
            select: { id: true },
          });
          resolvedEventId = eventBySlug?.id;
        }
      }

      const interaction = await ctx.db.aiInteraction.create({
        data: {
          userId: ctx.session.user.id,
          userMessage: input.userMessage,
          aiResponse: input.aiResponse,
          agentId: input.agentId,
          agentName: input.agentName,
          model: input.model,
          conversationId: input.conversationId,
          pathname: input.pathname,
          eventId: resolvedEventId,
          responseTimeMs: input.responseTimeMs,
          hadError: input.hadError ?? false,
          errorMessage: input.errorMessage,
        },
      });

      return { id: interaction.id };
    }),

  /**
   * Submit feedback (star rating + optional comment) for a specific interaction.
   * Upserts to handle duplicate submissions gracefully.
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        interactionId: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
        improvement: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the interaction belongs to the current user
      const interaction = await ctx.db.aiInteraction.findUnique({
        where: { id: input.interactionId },
        select: { userId: true },
      });

      if (!interaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interaction not found",
        });
      }

      if (interaction.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot rate another user's interaction",
        });
      }

      const feedback = await ctx.db.aiFeedback.upsert({
        where: { interactionId: input.interactionId },
        create: {
          userId: ctx.session.user.id,
          interactionId: input.interactionId,
          rating: input.rating,
          comment: input.comment,
          improvement: input.improvement,
        },
        update: {
          rating: input.rating,
          comment: input.comment,
          improvement: input.improvement,
        },
      });

      return feedback;
    }),

  /**
   * Get paginated list of AI interactions (admin only).
   */
  getInteractions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        eventId: z.string().optional(),
        hasError: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== "admin" &&
        ctx.session.user.role !== "staff"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const where = {
        ...(input.eventId ? { eventId: input.eventId } : {}),
        ...(input.hasError !== undefined ? { hadError: input.hasError } : {}),
        ...(input.search
          ? {
              OR: [
                {
                  userMessage: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  aiResponse: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  user: {
                    name: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  user: {
                    email: {
                      contains: input.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            }
          : {}),
      };

      const [interactions, total] = await Promise.all([
        ctx.db.aiInteraction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true,
                email: true,
                image: true,
              },
            },
            feedback: {
              select: {
                rating: true,
                comment: true,
                improvement: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.aiInteraction.count({ where }),
      ]);

      return { interactions, total };
    }),

  /**
   * Get aggregate stats for AI interactions (admin only).
   */
  getInteractionStats: protectedProcedure
    .input(
      z
        .object({
          eventId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== "admin" &&
        ctx.session.user.role !== "staff"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const where = {
        ...(input?.eventId ? { eventId: input.eventId } : {}),
        ...((input?.startDate ?? input?.endDate)
          ? {
              createdAt: {
                ...(input?.startDate ? { gte: input.startDate } : {}),
                ...(input?.endDate ? { lte: input.endDate } : {}),
              },
            }
          : {}),
      };

      const [totalInteractions, errorCount, avgResponseTime, feedbackStats] =
        await Promise.all([
          ctx.db.aiInteraction.count({ where }),
          ctx.db.aiInteraction.count({
            where: { ...where, hadError: true },
          }),
          ctx.db.aiInteraction.aggregate({
            where,
            _avg: { responseTimeMs: true },
          }),
          ctx.db.aiFeedback.aggregate({
            where: {
              interaction: where,
            },
            _avg: { rating: true },
            _count: { rating: true },
          }),
        ]);

      // Rating distribution
      const ratingDistribution = await ctx.db.aiFeedback.groupBy({
        by: ["rating"],
        where: {
          interaction: where,
        },
        _count: { rating: true },
        orderBy: { rating: "asc" },
      });

      return {
        totalInteractions,
        errorCount,
        errorRate:
          totalInteractions > 0 ? (errorCount / totalInteractions) * 100 : 0,
        averageResponseTimeMs: avgResponseTime._avg.responseTimeMs ?? null,
        averageRating: feedbackStats._avg.rating ?? null,
        totalFeedback: feedbackStats._count.rating,
        ratingDistribution: ratingDistribution.map((r) => ({
          rating: r.rating,
          count: r._count.rating,
        })),
      };
    }),
});
