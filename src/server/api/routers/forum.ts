import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Input schemas
const CreateThreadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  tags: z.array(z.string()).default([]),
});

const UpdateThreadSchema = z.object({
  id: z.string(),
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
});

const CreateCommentSchema = z.object({
  threadId: z.string(),
  parentId: z.string().optional(),
  content: z.string().min(1, "Comment cannot be empty"),
});

const GetThreadsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  sortBy: z.enum(["recent", "popular", "mostCommented"]).default("recent"),
  tag: z.string().optional(),
});

export const forumRouter = createTRPCRouter({
  // Get all threads with pagination
  getThreads: publicProcedure
    .input(GetThreadsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, sortBy, tag } = input;

      const where = {
        isActive: true,
        ...(tag ? { tags: { has: tag } } : {}),
      };

      // Determine ordering based on sortBy
      let orderBy: Record<string, "asc" | "desc">[];
      switch (sortBy) {
        case "popular":
          // Will sort after fetching since we need to count likes
          orderBy = [{ createdAt: "desc" }];
          break;
        case "mostCommented":
          // Will sort after fetching since we need to count comments
          orderBy = [{ createdAt: "desc" }];
          break;
        case "recent":
        default:
          orderBy = [{ createdAt: "desc" }];
      }

      const threads = await ctx.db.forumThread.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
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
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          likes: {
            where: ctx.session?.user
              ? { userId: ctx.session.user.id }
              : { userId: "none" },
            select: { id: true },
          },
        },
      });

      // Sort if needed
      if (sortBy === "popular") {
        threads.sort((a, b) => b._count.likes - a._count.likes);
      } else if (sortBy === "mostCommented") {
        threads.sort((a, b) => b._count.comments - a._count.comments);
      }

      let nextCursor: string | undefined = undefined;
      if (threads.length > limit) {
        const nextItem = threads.pop();
        nextCursor = nextItem?.id;
      }

      return {
        threads: threads.map((thread) => ({
          ...thread,
          hasLiked: thread.likes.length > 0,
          likeCount: thread._count.likes,
          commentCount: thread._count.comments,
        })),
        nextCursor,
      };
    }),

  // Get a single thread by ID with comments
  getThreadById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.forumThread.findUnique({
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
          likes: {
            select: {
              id: true,
              userId: true,
              kudosTransferred: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          comments: {
            where: { parentId: null }, // Get top-level comments only
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
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
                select: {
                  id: true,
                  userId: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
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
                    select: {
                      id: true,
                      userId: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      return {
        ...thread,
        hasLiked: ctx.session?.user
          ? thread.likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
        likeCount: thread.likes.length,
        commentCount: thread.comments.length,
      };
    }),

  // Create a new thread
  createThread: protectedProcedure
    .input(CreateThreadSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, content, tags } = input;

      const thread = await ctx.db.forumThread.create({
        data: {
          userId: ctx.session.user.id,
          title,
          content,
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

      return thread;
    }),

  // Update a thread
  updateThread: protectedProcedure
    .input(UpdateThreadSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const thread = await ctx.db.forumThread.findUnique({
        where: { id },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      if (thread.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own threads",
        });
      }

      const updated = await ctx.db.forumThread.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  // Delete a thread
  deleteThread: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const thread = await ctx.db.forumThread.findUnique({
        where: { id: input.id },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      if (thread.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own threads",
        });
      }

      await ctx.db.forumThread.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Create a comment
  createComment: protectedProcedure
    .input(CreateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { threadId, parentId, content } = input;

      // Verify thread exists and get author info
      const thread = await ctx.db.forumThread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          title: true,
          userId: true, // Thread author
        },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      // If parentId provided, verify parent comment exists and get author
      let parentComment: { userId: string } | null = null;
      if (parentId) {
        parentComment = await ctx.db.forumComment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });

        if (!parentComment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        }
      }

      const comment = await ctx.db.forumComment.create({
        data: {
          threadId,
          userId: ctx.session.user.id,
          parentId,
          content,
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
          const commenterName =
            comment.user.name ??
            `${comment.user.firstName ?? ""} ${comment.user.surname ?? ""}`.trim() ??
            "Someone";

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ??
            "https://platform.fundingthecommons.io";
          const threadUrl = `${baseUrl}/community/forum/${threadId}`;

          // Get recipients (thread author and parent comment author)
          const recipientIds = new Set<string>();
          if (thread.userId !== ctx.session.user.id) {
            recipientIds.add(thread.userId);
          }
          if (parentComment && parentComment.userId !== ctx.session.user.id) {
            recipientIds.add(parentComment.userId);
          }

          if (recipientIds.size === 0) return;

          // Get recipient details
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

          await botNotificationService.sendForumCommentNotifications({
            commentId: comment.id,
            threadId,
            commenterUserId: ctx.session.user.id,
            commenterName,
            commentContent: content,
            threadUrl,
            threadTitle: thread.title,
            threadAuthorId: thread.userId,
            parentCommentAuthorId: parentComment?.userId,
          });

          // Send Email notifications
          const { getEmailService } = await import(
            "~/server/email/emailService"
          );
          const emailService = getEmailService(ctx.db);

          for (const recipient of recipients) {
            if (!recipient.email) continue;

            const recipientName =
              recipient.name ??
              `${recipient.firstName ?? ""} ${recipient.surname ?? ""}`.trim() ??
              "Community Member";

            const isReply = parentComment?.userId === recipient.id;

            await emailService.sendForumCommentEmail({
              recipientEmail: recipient.email,
              recipientName,
              commenterName,
              commentContent: content,
              threadUrl,
              threadTitle: thread.title,
              isReply,
              threadId,
              commentId: comment.id,
            });
          }

          console.log(
            `Forum comment notifications sent for comment ${comment.id}`,
          );
        } catch (error) {
          console.error("Failed to send forum comment notifications:", error);
        }
      })();

      return comment;
    }),

  // Delete a comment
  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const comment = await ctx.db.forumComment.findUnique({
        where: { id: input.id },
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

      await ctx.db.forumComment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Like a thread
  likeThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if thread exists
      const thread = await ctx.db.forumThread.findUnique({
        where: { id: input.threadId },
        select: { id: true, userId: true },
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      // Check if user already liked this thread
      const existingLike = await ctx.db.forumThreadLike.findUnique({
        where: {
          threadId_userId: {
            threadId: input.threadId,
            userId,
          },
        },
      });

      if (existingLike) {
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

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        ctx.db.forumThreadLike.create({
          data: {
            threadId: input.threadId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        ctx.db.user.update({
          where: { id: thread.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Unlike a thread
  unlikeThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.forumThreadLike.deleteMany({
        where: {
          threadId: input.threadId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  // Like a comment
  likeComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if comment exists
      const comment = await ctx.db.forumComment.findUnique({
        where: { id: input.commentId },
        select: { id: true, userId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Check if user already liked this comment
      const existingLike = await ctx.db.forumCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId,
          },
        },
      });

      if (existingLike) {
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

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        ctx.db.forumCommentLike.create({
          data: {
            commentId: input.commentId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        ctx.db.user.update({
          where: { id: userId },
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
      await ctx.db.forumCommentLike.deleteMany({
        where: {
          commentId: input.commentId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  // Get thread count (for sidebar badge)
  getThreadCount: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.forumThread.count({
      where: { isActive: true },
    });
    return count;
  }),

  // Get all unique tags
  getAllTags: publicProcedure.query(async ({ ctx }) => {
    const threads = await ctx.db.forumThread.findMany({
      where: { isActive: true },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    for (const thread of threads) {
      for (const tag of thread.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }),
});
