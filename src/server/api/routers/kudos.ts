import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { KUDOS_CONSTANTS } from "~/utils/kudosCalculation";

/**
 * Kudos Router
 *
 * Handles kudos leaderboard, activity timeline, and statistics
 */

export const kudosRouter = createTRPCRouter({
  /**
   * Get kudos leaderboard
   * Top users by kudos score with detailed breakdown
   */
  getLeaderboard: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50).optional(),
          eventId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const eventId = input?.eventId;

      // Get users with their kudos and activity counts
      const users = await ctx.db.user.findMany({
        where: eventId
          ? {
              applications: {
                some: {
                  eventId,
                  status: "ACCEPTED",
                },
              },
            }
          : undefined,
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
          image: true,
          kudos: true,
          profile: {
            select: {
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          kudos: "desc",
        },
        take: limit,
      });

      // Get activity counts for each user
      const usersWithActivity = await Promise.all(
        users.map(async (user) => {
          // Count project updates
          const updateCount = await ctx.db.projectUpdate.count({
            where: { userId: user.id },
          });

          // Count praise received
          const praiseReceivedCount = await ctx.db.praise.count({
            where: { recipientId: user.id },
          });

          // Count praise sent
          const praiseSentCount = await ctx.db.praise.count({
            where: { senderId: user.id },
          });

          // Count total likes received (all types)
          const [
            projectUpdateLikes,
            askOfferLikes,
            userProjectLikes,
            commentLikes,
          ] = await Promise.all([
            ctx.db.projectUpdateLike.count({
              where: {
                projectUpdate: { userId: user.id },
              },
            }),
            ctx.db.askOfferLike.count({
              where: {
                askOffer: { userId: user.id },
              },
            }),
            ctx.db.userProjectLike.count({
              where: {
                project: {
                  profile: { userId: user.id },
                },
              },
            }),
            ctx.db.projectUpdateCommentLike.count({
              where: {
                comment: { userId: user.id },
              },
            }),
          ]);

          const likesReceivedCount =
            projectUpdateLikes +
            askOfferLikes +
            userProjectLikes +
            commentLikes;

          return {
            user: {
              id: user.id,
              firstName: user.firstName,
              surname: user.surname,
              name: user.name,
              email: user.email,
              image: user.image,
              profile: user.profile,
            },
            kudos: user.kudos,
            breakdown: {
              baseKudos: KUDOS_CONSTANTS.BASE_KUDOS,
              fromUpdates: updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT,
              updateCount,
              praiseReceivedCount,
              praiseSentCount,
              likesReceivedCount,
              commentLikesReceivedCount: commentLikes,
            },
          };
        }),
      );

      return usersWithActivity;
    }),

  /**
   * Get recent kudos activity timeline
   * Shows all kudos transfers (likes and praise) in chronological order
   */
  getActivityTimeline: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50).optional(),
          eventId: z.string().optional(),
          userId: z.string().optional(), // Filter to specific user's activity
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const userId = input?.userId;

      // Get recent praise transactions
      const praises = await ctx.db.praise.findMany({
        where: {
          AND: [
            userId
              ? {
                  OR: [{ senderId: userId }, { recipientId: userId }],
                }
              : {},
            {
              kudosTransferred: { not: null },
            },
          ],
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
          recipient: {
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

      // Get recent project update likes
      const projectUpdateLikes = await ctx.db.projectUpdateLike.findMany({
        where: {
          AND: [
            userId
              ? {
                  OR: [{ userId }, { projectUpdate: { userId } }],
                }
              : {},
            {
              kudosTransferred: { not: null },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
          projectUpdate: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      // Get recent ask/offer likes
      const askOfferLikes = await ctx.db.askOfferLike.findMany({
        where: {
          AND: [
            userId
              ? {
                  OR: [{ userId }, { askOffer: { userId } }],
                }
              : {},
            {
              kudosTransferred: { not: null },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
          askOffer: {
            select: {
              id: true,
              userId: true,
              type: true,
              title: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      // Get recent user project likes
      const userProjectLikes = await ctx.db.userProjectLike.findMany({
        where: {
          AND: [
            userId
              ? {
                  OR: [{ userId }, { project: { profile: { userId } } }],
                }
              : {},
            {
              kudosTransferred: { not: null },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              profile: {
                select: {
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      surname: true,
                      name: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      // Combine all activities and format them
      const activities = [
        ...praises.map((praise) => ({
          type: "praise" as const,
          id: praise.id,
          createdAt: praise.createdAt,
          kudosTransferred: praise.kudosTransferred ?? 0,
          from: praise.sender,
          to: praise.recipient,
          content: {
            message: praise.message,
          },
        })),
        ...projectUpdateLikes.map((like) => ({
          type: "like_update" as const,
          id: like.id,
          createdAt: like.createdAt,
          kudosTransferred: like.kudosTransferred ?? 0,
          from: like.user,
          to: like.projectUpdate.author,
          content: {
            updateId: like.projectUpdate.id,
            updateTitle: like.projectUpdate.title ?? "Untitled Update",
          },
        })),
        ...askOfferLikes.map((like) => ({
          type: "like_askoffer" as const,
          id: like.id,
          createdAt: like.createdAt,
          kudosTransferred: like.kudosTransferred ?? 0,
          from: like.user,
          to: like.askOffer.user,
          content: {
            askOfferId: like.askOffer.id,
            askOfferType: like.askOffer.type,
            askOfferTitle: like.askOffer.title,
          },
        })),
        ...userProjectLikes.map((like) => ({
          type: "like_project" as const,
          id: like.id,
          createdAt: like.createdAt,
          kudosTransferred: like.kudosTransferred ?? 0,
          from: like.user,
          to: like.project.profile.user,
          content: {
            projectId: like.project.id,
            projectTitle: like.project.title,
            projectImage: like.project.imageUrl,
          },
        })),
      ];

      // Sort by most recent
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return activities.slice(0, limit);
    }),

  /**
   * Get user's kudos statistics
   */
  getUserStats: protectedProcedure
    .input(
      z
        .object({
          userId: z.string().optional(), // If not provided, use current user
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = input?.userId ?? ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get detailed breakdown
      const [
        updateCount,
        praiseReceivedCount,
        praiseSentCount,
        projectUpdateLikesReceived,
        projectUpdateLikesGiven,
        askOfferLikesReceived,
        askOfferLikesGiven,
        userProjectLikesReceived,
        userProjectLikesGiven,
        commentLikesReceived,
        commentLikesGiven,
      ] = await Promise.all([
        ctx.db.projectUpdate.count({
          where: { userId },
        }),
        ctx.db.praise.count({
          where: { recipientId: userId },
        }),
        ctx.db.praise.count({
          where: { senderId: userId },
        }),
        ctx.db.projectUpdateLike.count({
          where: {
            projectUpdate: { userId },
          },
        }),
        ctx.db.projectUpdateLike.count({
          where: { userId },
        }),
        ctx.db.askOfferLike.count({
          where: {
            askOffer: { userId },
          },
        }),
        ctx.db.askOfferLike.count({
          where: { userId },
        }),
        ctx.db.userProjectLike.count({
          where: {
            project: {
              profile: { userId },
            },
          },
        }),
        ctx.db.userProjectLike.count({
          where: { userId },
        }),
        ctx.db.projectUpdateCommentLike.count({
          where: {
            comment: { userId },
          },
        }),
        ctx.db.projectUpdateCommentLike.count({
          where: { userId },
        }),
      ]);

      const totalLikesReceived =
        projectUpdateLikesReceived +
        askOfferLikesReceived +
        userProjectLikesReceived +
        commentLikesReceived;

      const totalLikesGiven =
        projectUpdateLikesGiven +
        askOfferLikesGiven +
        userProjectLikesGiven +
        commentLikesGiven;

      return {
        currentKudos: user.kudos,
        breakdown: {
          baseKudos: KUDOS_CONSTANTS.BASE_KUDOS,
          fromUpdates: updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT,
          updateCount,
          praiseReceivedCount,
          praiseSentCount,
          likesReceivedCount: totalLikesReceived,
          likesGivenCount: totalLikesGiven,
          commentLikesReceivedCount: commentLikesReceived,
          commentLikesGivenCount: commentLikesGiven,
        },
      };
    }),
});
