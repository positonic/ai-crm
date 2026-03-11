/**
 * Update Comment Notification Service
 *
 * Handles sending Telegram DM notifications to project members when
 * someone comments on a project update.
 */

import { type PrismaClient } from "@prisma/client";
import { TelegramClient, sessions } from "telegram";
import { Api } from "telegram/tl";
import bigInt from "big-integer";
import { captureApiError } from "~/utils/errorCapture";
import { decryptTelegramCredentials } from "~/server/utils/encryption";

interface NotificationResult {
  success: boolean;
  recipientUserId: string;
  recipientTelegramHandle: string;
  communicationId?: string;
  error?: string;
}

interface UpdateCommentNotificationData {
  commentId: string;
  updateId: string;
  projectId: string;
  eventId: string;
  commenterUserId: string;
  commenterName: string;
  commentContent: string;
  updateUrl: string;
}

export class UpdateCommentNotificationService {
  constructor(private db: PrismaClient) {}

  /**
   * Send Telegram DM notifications to all project members when a comment is added
   *
   * @param data - Comment and notification details
   * @param senderUserId - User ID of the person who should send the notifications (must have Telegram auth)
   * @returns Array of notification results
   */
  async sendNotifications(
    data: UpdateCommentNotificationData,
    senderUserId: string,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // 1. Get all project collaborators/members
      const collaborators = await this.db.projectCollaborator.findMany({
        where: {
          projectId: data.projectId,
          userId: { not: data.commenterUserId }, // Don't notify the commenter
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  telegramHandle: true,
                },
              },
            },
          },
        },
      });

      // Filter to only members with Telegram handles
      const notifiableMembers = collaborators.filter(
        (collab) => collab.user.profile?.telegramHandle,
      );

      if (notifiableMembers.length === 0) {
        console.log("No project members with Telegram handles to notify");
        return results;
      }

      // 2. Get sender's Telegram auth credentials
      const telegramAuth = await this.db.telegramAuth.findUnique({
        where: { userId: senderUserId },
      });

      if (!telegramAuth?.encryptedSession) {
        throw new Error("Sender does not have active Telegram authentication");
      }

      // 3. Decrypt and create Telegram client
      const credentials = decryptTelegramCredentials(
        {
          encryptedApiId: telegramAuth.encryptedApiId,
          encryptedApiHash: telegramAuth.encryptedApiHash,
          encryptedSession: telegramAuth.encryptedSession,
          salt: telegramAuth.salt,
          iv: telegramAuth.iv,
        },
        senderUserId,
      );

      const client = new TelegramClient(
        new sessions.StringSession(credentials.sessionString),
        parseInt(credentials.apiId),
        credentials.apiHash,
        {
          connectionRetries: 5,
        },
      );

      await client.connect();

      // 4. Send notification to each member
      for (const collaborator of notifiableMembers) {
        const telegramHandle = collaborator.user.profile?.telegramHandle;
        if (!telegramHandle) continue;

        try {
          // Resolve Telegram username
          const resolveResult = await client.invoke(
            new Api.contacts.ResolveUsername({
              username: telegramHandle,
            }),
          );

          if (!resolveResult.users || resolveResult.users.length === 0) {
            results.push({
              success: false,
              recipientUserId: collaborator.userId,
              recipientTelegramHandle: telegramHandle,
              error: "User not found on Telegram",
            });
            continue;
          }

          const telegramUser = resolveResult.users[0];

          // Prepare notification message
          const message = this.formatNotificationMessage(data);

          // Send DM
          const sentMessage = await client.invoke(
            new Api.messages.SendMessage({
              peer: telegramUser,
              message,
              randomId: bigInt(Math.floor(Math.random() * 1000000000)),
            }),
          );

          // Extract message ID
          let messageId: string | undefined;
          if ("updates" in sentMessage && sentMessage.updates?.length > 0) {
            const messageUpdate = sentMessage.updates.find(
              (update) =>
                "message" in update &&
                typeof update.message === "object" &&
                update.message !== null &&
                "id" in update.message,
            );
            if (
              messageUpdate &&
              "message" in messageUpdate &&
              typeof messageUpdate.message === "object" &&
              messageUpdate.message !== null &&
              "id" in messageUpdate.message
            ) {
              messageId = messageUpdate.message.id?.toString();
            }
          }

          // Track notification in Communication table
          let communicationId: string | undefined;
          try {
            const communication = await this.db.communication.create({
              data: {
                eventId: data.eventId,
                toTelegram: telegramHandle,
                channel: "TELEGRAM",
                textContent: message,
                type: "UPDATE_COMMENT",
                status: "SENT",
                createdBy: senderUserId,
                sentAt: new Date(),
                telegramMsgId: messageId,
                templateData: {
                  commentId: data.commentId,
                  updateId: data.updateId,
                  projectId: data.projectId,
                  commenterName: data.commenterName,
                  recipientUserId: collaborator.userId,
                },
              },
            });
            communicationId = communication.id;
          } catch (dbError) {
            console.error(
              `Failed to track notification for user ${collaborator.userId}:`,
              dbError,
            );
          }

          results.push({
            success: true,
            recipientUserId: collaborator.userId,
            recipientTelegramHandle: telegramHandle,
            communicationId,
          });

          console.log(
            `Notification sent to @${telegramHandle} (${collaborator.user.name ?? "Unknown"})`,
          );

          // Rate limiting: 3 seconds between messages (20 per minute max)
          if (
            notifiableMembers.indexOf(collaborator) <
            notifiableMembers.length - 1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          results.push({
            success: false,
            recipientUserId: collaborator.userId,
            recipientTelegramHandle: telegramHandle,
            error: errorMessage,
          });

          console.error(
            `Failed to send notification to @${telegramHandle}:`,
            errorMessage,
          );

          captureApiError(error, {
            userId: senderUserId,
            route: "updateCommentNotification.sendNotifications",
            method: "TELEGRAM_DM",
            input: {
              recipientUserId: collaborator.userId,
              recipientTelegram: telegramHandle,
              commentId: data.commentId,
            },
          });
        }
      }

      // Disconnect client
      await client.disconnect();
    } catch (error) {
      console.error("Failed to send update comment notifications:", error);

      captureApiError(error, {
        userId: senderUserId,
        route: "updateCommentNotification.sendNotifications",
        method: "TELEGRAM_SETUP",
        input: {
          commentId: data.commentId,
          updateId: data.updateId,
          projectId: data.projectId,
        },
      });

      throw error;
    }

    return results;
  }

  /**
   * Format the notification message text
   */
  private formatNotificationMessage(
    data: UpdateCommentNotificationData,
  ): string {
    // Truncate comment if too long for notification
    const commentPreview =
      data.commentContent.length > 100
        ? data.commentContent.substring(0, 100) + "..."
        : data.commentContent;

    return `💬 New comment from ${data.commenterName}

${commentPreview}

View the full conversation:
${data.updateUrl}`;
  }
}
