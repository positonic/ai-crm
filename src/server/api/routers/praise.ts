import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Praise Router
 *
 * Handles praise-related queries and mutations for the platform.
 */

export const praiseRouter = createTRPCRouter({
  /**
   * Get all praise sent by the current user
   */
  getMySentPraise: protectedProcedure.query(async ({ ctx }) => {
    const praises = await ctx.db.praise.findMany({
      where: {
        senderId: ctx.session.user.id,
      },
      include: {
        recipient: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            name: true,
            email: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return praises;
  }),

  /**
   * Get all praise received by the current user
   */
  getMyReceivedPraise: protectedProcedure.query(async ({ ctx }) => {
    const praises = await ctx.db.praise.findMany({
      where: {
        recipientId: ctx.session.user.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            name: true,
            email: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return praises;
  }),

  /**
   * Get praise leaderboard (top praised users)
   */
  getLeaderboard: protectedProcedure
    .input(
      z.object({
        eventId: z.string().optional(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { eventId, limit } = input;

      // Get praise counts grouped by recipient
      const praiseCounts = await ctx.db.praise.groupBy({
        by: ["recipientId"],
        where: {
          recipientId: { not: null },
          eventId: eventId ?? undefined,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: limit,
      });

      // Get user details for top recipients
      const recipientIds = praiseCounts
        .map((p) => p.recipientId)
        .filter((id): id is string => id !== null);

      const users = await ctx.db.user.findMany({
        where: {
          id: { in: recipientIds },
        },
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
          image: true,
        },
      });

      // Combine counts with user details
      const leaderboard = praiseCounts.map((praise) => {
        const user = users.find((u) => u.id === praise.recipientId);
        return {
          user,
          praiseCount: praise._count.id,
        };
      });

      return leaderboard;
    }),

  /**
   * Get all praise for a specific event (admin only)
   */
  getEventPraise: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if user has admin access to this event
      const hasAccess = await ctx.db.userRole.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          role: {
            name: { in: ["admin", "organizer"] },
          },
        },
      });

      if (!hasAccess && ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to view this event's praise",
        });
      }

      const praises = await ctx.db.praise.findMany({
        where: {
          eventId: input.eventId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return praises;
    }),

  /**
   * Get praise statistics for current user
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const [sentCount, receivedCount, recentPraise] = await Promise.all([
      // Count sent
      ctx.db.praise.count({
        where: {
          senderId: ctx.session.user.id,
        },
      }),

      // Count received
      ctx.db.praise.count({
        where: {
          recipientId: ctx.session.user.id,
        },
      }),

      // Recent received praise (last 5)
      ctx.db.praise.findMany({
        where: {
          recipientId: ctx.session.user.id,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

    return {
      sentCount,
      receivedCount,
      recentPraise,
    };
  }),

  /**
   * Get all praise transactions (all praise sent and received in the system)
   * For admin/viewing all transactions
   */
  getAllTransactions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      const transactions = await ctx.db.praise.findMany({
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      return transactions;
    }),

  /**
   * Toggle praise visibility (make public/private)
   */
  toggleVisibility: protectedProcedure
    .input(
      z.object({
        praiseId: z.string(),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { praiseId, isPublic } = input;

      // Only allow sender or recipient to toggle visibility
      const praise = await ctx.db.praise.findUnique({
        where: { id: praiseId },
      });

      if (!praise) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Praise not found",
        });
      }

      if (
        praise.senderId !== ctx.session.user.id &&
        praise.recipientId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only modify your own praise",
        });
      }

      const updated = await ctx.db.praise.update({
        where: { id: praiseId },
        data: { isPublic },
      });

      return updated;
    }),

  /**
   * Get public praise (for public profile pages)
   */
  getPublicPraise: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId, limit } = input;

      const praises = await ctx.db.praise.findMany({
        where: {
          recipientId: userId,
          isPublic: true,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      return praises;
    }),
});
