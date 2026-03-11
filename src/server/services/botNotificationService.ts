/**
 * Bot Notification Service
 *
 * Sends Telegram notifications using the platform's bot (not user authentication).
 * This is more reliable as it doesn't require individual users to be authenticated.
 */

import { type PrismaClient, type Prisma } from "@prisma/client";
import { captureApiError } from "~/utils/errorCapture";
import { env } from "~/env";

interface BotNotificationResult {
  success: boolean;
  recipientUserId: string;
  recipientTelegramHandle?: string;
  recipientChatId?: string;
  communicationId?: string;
  error?: string;
}

export class BotNotificationService {
  constructor(private db: PrismaClient) {}

  /**
   * Send a Telegram DM to a specific user using the bot
   *
   * @param userId - User ID to send notification to
   * @param message - Message text (supports Markdown)
   * @param metadata - Optional metadata for tracking
   * @returns Notification result
   */
  async sendDirectMessage(
    userId: string,
    message: string,
    metadata?: {
      eventId?: string;
      communicationType?: string;
      templateData?: Record<string, unknown>;
    },
  ): Promise<BotNotificationResult> {
    const botToken = env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
      return {
        success: false,
        recipientUserId: userId,
        error: "Bot token not configured",
      };
    }

    try {
      // Get user's Telegram chat ID and handle
      const userProfile = await this.db.userProfile.findUnique({
        where: { userId },
        select: {
          telegramChatId: true,
          telegramHandle: true,
        },
      });

      if (!userProfile?.telegramChatId) {
        console.log(
          `User ${userId} does not have a Telegram chat ID - they need to interact with the bot first`,
        );
        return {
          success: false,
          recipientUserId: userId,
          recipientTelegramHandle: userProfile?.telegramHandle ?? undefined,
          error: "User has not interacted with the bot",
        };
      }

      // Send message via Bot API
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: userProfile.telegramChatId,
            text: message,
            parse_mode: "Markdown",
            disable_web_page_preview: false,
          }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json()) as {
          description?: string;
          error_code?: number;
        };
        throw new Error(
          errorData.description ??
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const result = (await response.json()) as {
        ok: boolean;
        result?: { message_id: number };
      };

      // Track notification in Communication table
      let communicationId: string | undefined;
      try {
        const communication = await this.db.communication.create({
          data: {
            eventId: metadata?.eventId ?? "system",
            toTelegram:
              userProfile.telegramHandle ?? userProfile.telegramChatId,
            channel: "TELEGRAM",
            textContent: message,
            type:
              (metadata?.communicationType as "UPDATE_COMMENT" | "GENERAL") ??
              "GENERAL",
            status: "SENT",
            createdBy: "system", // Bot notifications are system-generated
            sentAt: new Date(),
            telegramMsgId: result.result?.message_id?.toString(),
            templateData: metadata?.templateData
              ? (metadata.templateData as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        });
        communicationId = communication.id;
      } catch (dbError) {
        console.error(
          `Failed to track notification for user ${userId}:`,
          dbError,
        );
      }

      return {
        success: true,
        recipientUserId: userId,
        recipientTelegramHandle: userProfile.telegramHandle ?? undefined,
        recipientChatId: userProfile.telegramChatId,
        communicationId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `Failed to send bot notification to user ${userId}:`,
        errorMessage,
      );

      captureApiError(error, {
        userId: "system",
        route: "botNotificationService.sendDirectMessage",
        method: "TELEGRAM_BOT",
        input: {
          recipientUserId: userId,
          messageLength: message.length,
        },
      });

      return {
        success: false,
        recipientUserId: userId,
        error: errorMessage,
      };
    }
  }

  /**
   * Send update comment notifications to all project members
   *
   * @param commentData - Comment and notification details
   * @returns Array of notification results
   */
  async sendUpdateCommentNotifications(commentData: {
    commentId: string;
    updateId: string;
    projectId: string;
    eventId: string;
    commenterUserId: string;
    commenterName: string;
    commentContent: string;
    updateUrl: string;
  }): Promise<BotNotificationResult[]> {
    const results: BotNotificationResult[] = [];

    try {
      // Get all project collaborators (excluding the commenter)
      const collaborators = await this.db.projectCollaborator.findMany({
        where: {
          projectId: commentData.projectId,
          userId: { not: commentData.commenterUserId },
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  telegramChatId: true,
                  telegramHandle: true,
                },
              },
            },
          },
        },
      });

      // Filter to members with Telegram chat IDs
      const notifiableMembers = collaborators.filter(
        (collab) => collab.user.profile?.telegramChatId,
      );

      if (notifiableMembers.length === 0) {
        console.log(
          "No project members with Telegram chat IDs to notify (they need to interact with the bot first)",
        );
        return results;
      }

      // Prepare the notification message
      const commentPreview =
        commentData.commentContent.length > 100
          ? commentData.commentContent.substring(0, 100) + "..."
          : commentData.commentContent;

      const message = `💬 *New comment from ${commentData.commenterName}*

${commentPreview}

[View the full conversation](${commentData.updateUrl})`;

      // Send notification to each member
      for (const collaborator of notifiableMembers) {
        const result = await this.sendDirectMessage(
          collaborator.userId,
          message,
          {
            eventId: commentData.eventId,
            communicationType: "UPDATE_COMMENT",
            templateData: {
              commentId: commentData.commentId,
              updateId: commentData.updateId,
              projectId: commentData.projectId,
              commenterName: commentData.commenterName,
              recipientUserId: collaborator.userId,
            },
          },
        );

        results.push(result);

        if (result.success) {
          console.log(
            `Notification sent to user ${collaborator.userId} (@${result.recipientTelegramHandle ?? "unknown"})`,
          );
        }

        // Small delay between messages to be respectful of rate limits
        if (
          notifiableMembers.indexOf(collaborator) <
          notifiableMembers.length - 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error("Failed to send update comment notifications:", error);

      captureApiError(error, {
        userId: "system",
        route: "botNotificationService.sendUpdateCommentNotifications",
        method: "TELEGRAM_BOT",
        input: {
          commentId: commentData.commentId,
          updateId: commentData.updateId,
          projectId: commentData.projectId,
        },
      });
    }

    return results;
  }

  /**
   * Send forum comment notifications
   *
   * @param commentData - Comment and notification details
   * @returns Array of notification results
   */
  async sendForumCommentNotifications(commentData: {
    commentId: string;
    threadId: string;
    commenterUserId: string;
    commenterName: string;
    commentContent: string;
    threadUrl: string;
    threadTitle: string;
    threadAuthorId: string;
    parentCommentAuthorId?: string; // If this is a reply
  }): Promise<BotNotificationResult[]> {
    const results: BotNotificationResult[] = [];

    try {
      // Determine who to notify
      const recipientIds = new Set<string>();

      // Always notify thread author (unless they're the commenter)
      if (commentData.threadAuthorId !== commentData.commenterUserId) {
        recipientIds.add(commentData.threadAuthorId);
      }

      // If this is a reply, notify the parent comment author
      if (
        commentData.parentCommentAuthorId &&
        commentData.parentCommentAuthorId !== commentData.commenterUserId
      ) {
        recipientIds.add(commentData.parentCommentAuthorId);
      }

      if (recipientIds.size === 0) {
        return results;
      }

      const commentPreview =
        commentData.commentContent.length > 100
          ? commentData.commentContent.substring(0, 100) + "..."
          : commentData.commentContent;

      const message = `💬 *New comment from ${commentData.commenterName}*

On thread: "${commentData.threadTitle}"

${commentPreview}

[View the thread](${commentData.threadUrl})`;

      for (const recipientId of recipientIds) {
        const result = await this.sendDirectMessage(recipientId, message, {
          communicationType: "FORUM_COMMENT",
          templateData: {
            commentId: commentData.commentId,
            threadId: commentData.threadId,
            commenterName: commentData.commenterName,
            recipientUserId: recipientId,
          },
        });
        results.push(result);

        // Rate limiting delay
        if (recipientIds.size > 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error("Failed to send forum comment notifications:", error);
      captureApiError(error, {
        userId: "system",
        route: "botNotificationService.sendForumCommentNotifications",
        method: "TELEGRAM_BOT",
        input: {
          commentId: commentData.commentId,
          threadId: commentData.threadId,
        },
      });
    }

    return results;
  }

  /**
   * Send ask/offer comment notifications
   *
   * @param commentData - Comment and notification details
   * @returns Array of notification results
   */
  async sendAskOfferCommentNotifications(commentData: {
    commentId: string;
    askOfferId: string;
    eventId?: string;
    commenterUserId: string;
    commenterName: string;
    commentContent: string;
    askOfferUrl: string;
    askOfferTitle: string;
    askOfferType: "ASK" | "OFFER";
    askOfferAuthorId: string;
    parentCommentAuthorId?: string;
  }): Promise<BotNotificationResult[]> {
    const results: BotNotificationResult[] = [];

    try {
      const recipientIds = new Set<string>();

      // Notify ask/offer author
      if (commentData.askOfferAuthorId !== commentData.commenterUserId) {
        recipientIds.add(commentData.askOfferAuthorId);
      }

      // Notify parent comment author for replies
      if (
        commentData.parentCommentAuthorId &&
        commentData.parentCommentAuthorId !== commentData.commenterUserId
      ) {
        recipientIds.add(commentData.parentCommentAuthorId);
      }

      if (recipientIds.size === 0) {
        return results;
      }

      const typeLabel = commentData.askOfferType === "ASK" ? "Ask" : "Offer";
      const commentPreview =
        commentData.commentContent.length > 100
          ? commentData.commentContent.substring(0, 100) + "..."
          : commentData.commentContent;

      const message = `💬 *${commentData.commenterName} responded to your ${typeLabel}*

"${commentData.askOfferTitle}"

${commentPreview}

[View the conversation](${commentData.askOfferUrl})`;

      for (const recipientId of recipientIds) {
        const result = await this.sendDirectMessage(recipientId, message, {
          eventId: commentData.eventId,
          communicationType: "ASK_OFFER_COMMENT",
          templateData: {
            commentId: commentData.commentId,
            askOfferId: commentData.askOfferId,
            commenterName: commentData.commenterName,
            recipientUserId: recipientId,
          },
        });
        results.push(result);

        if (recipientIds.size > 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error("Failed to send ask/offer comment notifications:", error);
      captureApiError(error, {
        userId: "system",
        route: "botNotificationService.sendAskOfferCommentNotifications",
        method: "TELEGRAM_BOT",
        input: {
          commentId: commentData.commentId,
          askOfferId: commentData.askOfferId,
        },
      });
    }

    return results;
  }
}
