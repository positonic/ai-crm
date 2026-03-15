import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";
import { getDisplayName } from "~/utils/userDisplay";

// Helper function to send message to Telegram channel
async function sendTelegramNotification(message: string) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHANNEL_ID;
  const topicId = env.TELEGRAM_ASKOFFER_TOPIC_ID;

  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return;
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHANNEL_ID not configured, skipping notification");
    return;
  }

  try {
    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      disable_web_page_preview: boolean;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    // Only include topic ID if configured
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { description?: string };
      console.error(
        "Failed to send Telegram notification:",
        errorData.description ?? "Unknown error",
      );
    }
  } catch (error) {
    console.error(
      "Error sending Telegram notification:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// Input schemas
const CreateAskOfferSchema = z.object({
  eventId: z.string().optional(), // Optional - can create community-wide asks/offers
  type: z.enum(["ASK", "OFFER"]),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tags: z.array(z.string()).default([]),
});

const UpdateAskOfferSchema = z.object({
  id: z.string(),
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const askOfferRouter = createTRPCRouter({
  // Get a single ask/offer by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                  bio: true,
                  githubUrl: true,
                  linkedinUrl: true,
                  twitterUrl: true,
                  website: true,
                },
              },
            },
          },
        },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      return askOffer;
    }),

  // Get all asks and offers for an event
  getEventAsksOffers: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        type: z.enum(["ASK", "OFFER", "ALL"]).default("ALL"),
        onlyActive: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { eventId, type, onlyActive } = input;

      const where: {
        eventId: string;
        type?: "ASK" | "OFFER";
        isActive?: boolean;
      } = {
        eventId,
      };

      if (type !== "ALL") {
        where.type = type;
      }

      if (onlyActive) {
        where.isActive = true;
      }

      const asksOffers = await ctx.db.askOffer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                },
              },
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return asksOffers;
    }),

  // Get user's asks and offers for an event
  getUserAsksOffers: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        type: z.enum(["ASK", "OFFER", "ALL"]).optional(),
        onlyActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { eventId, type, onlyActive } = input;

      const where: {
        eventId: string;
        userId: string;
        type?: "ASK" | "OFFER";
        isActive?: boolean;
      } = {
        eventId,
        userId: ctx.session.user.id,
      };

      if (type && type !== "ALL") {
        where.type = type;
      }

      if (onlyActive) {
        where.isActive = true;
      }

      const asksOffers = await ctx.db.askOffer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                },
              },
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return asksOffers;
    }),

  // Create a new ask or offer
  create: protectedProcedure
    .input(CreateAskOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, type, title, description, tags } = input;

      // If eventId is provided, verify user has access to this event (is an accepted participant)
      if (eventId) {
        const application = await ctx.db.application.findFirst({
          where: {
            eventId,
            userId: ctx.session.user.id,
            status: "ACCEPTED",
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "You must be an accepted participant to create asks/offers for this event",
          });
        }
      }

      const askOffer = await ctx.db.askOffer.create({
        data: {
          userId: ctx.session.user.id,
          eventId: eventId ?? null,
          type,
          title,
          description,
          tags,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Send Telegram notification
      const userName = askOffer.user.name ?? "Someone";
      const typeLabel = type === "ASK" ? "Ask" : "Offer";
      const asksOffersUrl = eventId
        ? `https://platform.fundingthecommons.io/events/${eventId}/asks-offers`
        : `https://platform.fundingthecommons.io/community/asks-offers`;

      const telegramMessage = `
🆕 *New ${typeLabel}*

*${title}*

${description}

👤 Posted by: ${userName}
${tags.length > 0 ? `🏷️ Tags: ${tags.join(", ")}` : ""}

[View all Asks & Offers](${asksOffersUrl})
`.trim();

      // Send notification asynchronously (don't wait for it)
      void sendTelegramNotification(telegramMessage);

      return askOffer;
    }),

  // Update an ask or offer
  update: protectedProcedure
    .input(UpdateAskOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own asks/offers",
        });
      }

      const updated = await ctx.db.askOffer.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  // Delete an ask or offer
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own asks/offers",
        });
      }

      await ctx.db.askOffer.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Mark ask/offer as fulfilled (inactive)
  markFulfilled: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.id },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      if (askOffer.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only mark your own asks/offers as fulfilled",
        });
      }

      const updated = await ctx.db.askOffer.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return updated;
    }),

  // Like an ask/offer
  likeAskOffer: protectedProcedure
    .input(z.object({ askOfferId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if ask/offer exists
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.askOfferId },
        select: { id: true, userId: true },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      // Check if user already liked this ask/offer
      const existingLike = await ctx.db.askOfferLike.findUnique({
        where: {
          askOfferId_userId: {
            askOfferId: input.askOfferId,
            userId,
          },
        },
      });

      if (existingLike) {
        // Already liked - return existing like
        return existingLike;
      }

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this ask/offer",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.askOfferLike.create({
          data: {
            askOfferId: input.askOfferId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to ask/offer author
        ctx.db.user.update({
          where: { id: askOffer.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Unlike an ask/offer
  unlikeAskOffer: protectedProcedure
    .input(z.object({ askOfferId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.askOfferLike.deleteMany({
        where: {
          askOfferId: input.askOfferId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  // Get likes for an ask/offer
  getAskOfferLikes: publicProcedure
    .input(z.object({ askOfferId: z.string() }))
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.askOfferLike.findMany({
        where: { askOfferId: input.askOfferId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: likes.length,
        likes,
        hasLiked: ctx.session?.user
          ? likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
      };
    }),

  // Protected: Get all asks/offers across all events (for /latest page)
  getAllAsksOffers: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ASK", "OFFER", "ALL"]).default("ALL"),
        onlyActive: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { type, onlyActive } = input;

      const where: { type?: "ASK" | "OFFER"; isActive?: boolean } = {};

      if (type !== "ALL") {
        where.type = type;
      }

      if (onlyActive) {
        where.isActive = true;
      }

      const asksOffers = await ctx.db.askOffer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
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
          likes: {
            select: {
              userId: true,
              id: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Limit to most recent 50
      });

      return asksOffers;
    }),

  // ===== COMMENT PROCEDURES =====

  // Get comments for an ask/offer
  getComments: publicProcedure
    .input(
      z.object({
        askOfferId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.askOfferComment.findMany({
        where: {
          askOfferId: input.askOfferId,
          parentId: null, // Top-level comments only
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                },
              },
            },
          },
          likes: {
            select: { userId: true },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                  image: true,
                  profile: {
                    select: {
                      jobTitle: true,
                      company: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              likes: {
                select: { userId: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return comments;
    }),

  // Create a comment on an ask/offer
  createComment: protectedProcedure
    .input(
      z.object({
        askOfferId: z.string(),
        content: z
          .string()
          .min(1, "Comment cannot be empty")
          .max(5000, "Comment is too long"),
        parentId: z.string().optional(), // For nested replies
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ask/offer exists and get author info
      const askOffer = await ctx.db.askOffer.findUnique({
        where: { id: input.askOfferId },
        select: {
          id: true,
          title: true,
          type: true,
          userId: true,
          eventId: true,
        },
      });

      if (!askOffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ask/Offer not found",
        });
      }

      // If parentId provided, verify parent comment exists
      let parentComment: { userId: string } | null = null;
      if (input.parentId) {
        parentComment = await ctx.db.askOfferComment.findUnique({
          where: { id: input.parentId },
          select: { userId: true },
        });

        if (!parentComment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        }
      }

      const comment = await ctx.db.askOfferComment.create({
        data: {
          askOfferId: input.askOfferId,
          userId: ctx.session.user.id,
          parentId: input.parentId,
          content: input.content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
              profile: {
                select: {
                  jobTitle: true,
                  company: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Send notifications asynchronously (fire-and-forget)
      void (async () => {
        try {
          const commenterName = getDisplayName(comment.user, "Someone");

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ??
            "https://platform.fundingthecommons.io";
          const askOfferUrl = askOffer.eventId
            ? `${baseUrl}/events/${askOffer.eventId}/asks-offers/${askOffer.id}`
            : `${baseUrl}/community/asks-offers/${askOffer.id}`;

          // Get recipients
          const recipientIds = new Set<string>();
          if (askOffer.userId !== ctx.session.user.id) {
            recipientIds.add(askOffer.userId);
          }
          if (parentComment && parentComment.userId !== ctx.session.user.id) {
            recipientIds.add(parentComment.userId);
          }

          if (recipientIds.size === 0) return;

          const recipients = await ctx.db.user.findMany({
            where: { id: { in: Array.from(recipientIds) } },
            include: {
              profile: {
                select: {
                  telegramChatId: true,
                  telegramHandle: true,
                },
              },
            },
          });

          // Send Telegram notifications
          const { BotNotificationService } = await import(
            "~/server/services/botNotificationService"
          );
          const botNotificationService = new BotNotificationService(ctx.db);

          await botNotificationService.sendAskOfferCommentNotifications({
            commentId: comment.id,
            askOfferId: input.askOfferId,
            eventId: askOffer.eventId ?? undefined,
            commenterUserId: ctx.session.user.id,
            commenterName,
            commentContent: input.content,
            askOfferUrl,
            askOfferTitle: askOffer.title,
            askOfferType: askOffer.type,
            askOfferAuthorId: askOffer.userId,
            parentCommentAuthorId: parentComment?.userId,
          });

          // Send Email notifications
          const { getEmailService } = await import(
            "~/server/email/emailService"
          );
          const emailService = getEmailService(ctx.db);

          for (const recipient of recipients) {
            if (!recipient.email) continue;

            const recipientName = getDisplayName(recipient, "User");

            const isReply = parentComment?.userId === recipient.id;

            await emailService.sendAskOfferCommentEmail({
              recipientEmail: recipient.email,
              recipientName,
              commenterName,
              commentContent: input.content,
              askOfferUrl,
              askOfferTitle: askOffer.title,
              askOfferType: askOffer.type,
              isReply,
              eventId: askOffer.eventId ?? undefined,
              askOfferId: input.askOfferId,
              commentId: comment.id,
            });
          }

          console.log(
            `Ask/Offer comment notifications sent for comment ${comment.id}`,
          );
        } catch (error) {
          console.error(
            "Failed to send ask/offer comment notifications:",
            error,
          );
        }
      })();

      return comment;
    }),

  // Update a comment
  updateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        content: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.askOfferComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      return ctx.db.askOfferComment.update({
        where: { id: input.commentId },
        data: { content: input.content },
      });
    }),

  // Delete a comment
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.askOfferComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await ctx.db.askOfferComment.delete({
        where: { id: input.commentId },
      });

      return { success: true };
    }),

  // Like a comment
  likeComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.askOfferComment.findUnique({
        where: { id: input.commentId },
        select: { id: true, userId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      const existingLike = await ctx.db.askOfferCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existingLike) {
        return existingLike;
      }

      const liker = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const transferAmount = liker.kudos * 0.02;

      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos",
        });
      }

      const [like] = await ctx.db.$transaction([
        ctx.db.askOfferCommentLike.create({
          data: {
            commentId: input.commentId,
            userId: ctx.session.user.id,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { kudos: { decrement: transferAmount } },
        }),
        ctx.db.user.update({
          where: { id: comment.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Unlike a comment
  unlikeComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.askOfferCommentLike.deleteMany({
        where: {
          commentId: input.commentId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),
});
