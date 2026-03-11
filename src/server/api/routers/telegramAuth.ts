import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TelegramClient, sessions, Api } from "telegram";
import bigInt from "big-integer";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  encryptTelegramCredentials,
  decryptTelegramCredentials,
  getSessionExpiration,
  isSessionExpired,
  hashForAudit,
  type TelegramCredentials,
} from "~/server/utils/encryption";
import { checkTelegramAuthRateLimit } from "~/server/utils/telegramCleanup";
import { captureAuthError, captureApiError } from "~/utils/errorCapture";

// Note: Auth sessions now stored in database for persistence across server restarts
// Clean up expired auth sessions every 5 minutes
import { db } from "~/server/db";

// Database cleanup function using global db instance
const cleanupExpiredSessions = async () => {
  const now = new Date();
  try {
    // Safety check to ensure model exists
    if (!db?.telegramAuthSession) {
      console.warn("TelegramAuthSession model not available for cleanup");
      return;
    }

    await db.telegramAuthSession.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
  } catch (error) {
    console.error("Failed to cleanup expired Telegram auth sessions:", error);
    captureAuthError(error, {
      operation: "cleanup_expired_sessions",
      provider: "telegram",
    });
  }
};

// Clean up expired auth sessions every 5 minutes, with initial delay
setTimeout(() => {
  void cleanupExpiredSessions();
  setInterval(() => void cleanupExpiredSessions(), 5 * 60 * 1000);
}, 30000); // 30 second initial delay to ensure db is ready
interface TelegramClientInterface {
  connect: () => Promise<void>;
  start: (options: {
    phoneNumber: () => Promise<string>;
    password: () => Promise<string>;
    phoneCode: () => Promise<string>;
    onError: (err: unknown) => void;
  }) => Promise<void>;
  sendCode: (
    apiCredentials: { apiId: number; apiHash: string },
    phoneNumber: string,
    forceSMS?: boolean,
  ) => Promise<{ phoneCodeHash: string; isCodeViaApp: boolean }>;
  invoke: (method: unknown) => Promise<unknown>;
  session: { save: () => string };
  disconnect: () => Promise<void>;
}

export const telegramAuthRouter = createTRPCRouter({
  // Get current authentication status
  getAuthStatus: protectedProcedure.query(async ({ ctx }) => {
    const auth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!auth) {
      return { isAuthenticated: false };
    }

    const expired = isSessionExpired(auth.expiresAt);
    if (expired) {
      // Mark as inactive if expired
      await ctx.db.telegramAuth.update({
        where: { userId: ctx.session.user.id },
        data: { isActive: false },
      });
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: auth.isActive,
      expiresAt: auth.expiresAt,
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt,
    };
  }),

  // Start the authentication process
  startAuth: protectedProcedure.mutation(async ({ ctx }) => {
    // Debug context
    console.log("Context debug:", {
      hasDb: !!ctx.db,
      hasSession: !!ctx.session,
      userId: ctx.session?.user?.id,
      dbType: typeof ctx.db,
    });

    // Check rate limiting
    const rateLimit = checkTelegramAuthRateLimit(ctx.session.user.id);
    if (!rateLimit.allowed) {
      const resetTimeMinutes = Math.ceil(
        (rateLimit.resetTime - Date.now()) / (1000 * 60),
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many authentication attempts. Please try again in ${resetTimeMinutes} minutes.`,
      });
    }

    // No longer need global API credentials - users provide their own

    // Check if user already has active auth
    const existingAuth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (
      existingAuth &&
      existingAuth.isActive &&
      !isSessionExpired(existingAuth.expiresAt)
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already have an active Telegram authentication",
      });
    }

    // Generate session ID for this auth process
    const sessionId = `${ctx.session.user.id}_${Date.now()}`;

    // Store session info in database for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await ctx.db.telegramAuthSession.create({
      data: {
        sessionId,
        userId: ctx.session.user.id,
        expiresAt,
      },
    });

    console.log(
      `Started Telegram auth for user ${hashForAudit(ctx.session.user.id)} (${rateLimit.remainingAttempts} attempts remaining)`,
    );

    return { sessionId };
  }),

  // Send phone verification code
  sendPhoneCode: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        phoneNumber: z.string().min(1),
        apiId: z.string().min(1),
        apiHash: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.telegramAuthSession.findUnique({
        where: { sessionId: input.sessionId },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authentication session expired. Please start over.",
        });
      }

      // Validate user-provided credentials
      const apiId = input.apiId.trim();
      const apiHash = input.apiHash.trim();

      // Validate API ID (should be numeric and reasonable length)
      const apiIdNum = parseInt(apiId);
      if (
        isNaN(apiIdNum) ||
        apiIdNum <= 0 ||
        apiId.length < 5 ||
        apiId.length > 10
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid API ID format. Should be a 5-10 digit number from my.telegram.org",
        });
      }

      // Validate API Hash (should be 32 character alphanumeric)
      if (!/^[a-f0-9]{32}$/i.test(apiHash)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid API Hash format. Should be a 32-character hex string from my.telegram.org",
        });
      }

      // Validate phone number format (should start with +)
      const phoneNumber = input.phoneNumber.trim();
      if (
        !phoneNumber.startsWith("+") ||
        phoneNumber.length < 10 ||
        phoneNumber.length > 16
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid phone number format. Must include country code (e.g., +1234567890)",
        });
      }

      // Debug logging (with masked credentials for security)
      console.log(
        `Sending Telegram code - API ID: ${apiId}, API Hash: ${apiHash.substring(0, 8)}..., Phone: ${phoneNumber.substring(0, 4)}...`,
      );

      try {
        const client = new TelegramClient(
          new sessions.StringSession(""),
          apiIdNum,
          apiHash,
          {},
        ) as unknown as TelegramClientInterface;

        // Connect to Telegram
        await client.connect();
        console.log(`Connected to Telegram successfully`);

        // Send verification code
        console.log(
          `Calling sendCode with apiId: ${apiIdNum}, phoneNumber: ${phoneNumber}`,
        );
        const result = await client.sendCode(
          {
            apiId: apiIdNum,
            apiHash: apiHash,
          },
          phoneNumber,
        );

        console.log(`SendCode result:`, {
          hasPhoneCodeHash: !!result.phoneCodeHash,
          isCodeViaApp: result.isCodeViaApp,
        });

        // Get client session string to store in database
        const clientSessionString = client.session.save();

        // Update session with phone code hash and client session
        await ctx.db.telegramAuthSession.update({
          where: { sessionId: input.sessionId },
          data: {
            phoneCodeHash: result.phoneCodeHash,
            apiId: input.apiId,
            apiHash: input.apiHash,
            clientData: clientSessionString,
          },
        });

        // Disconnect the temporary client - we'll recreate it later
        await client.disconnect();

        console.log(
          `Sent verification code to ${hashForAudit(input.phoneNumber)} for user ${hashForAudit(ctx.session.user.id)}`,
        );

        return { success: true };
      } catch (error) {
        console.error("Failed to send phone code:", error);
        captureAuthError(error, {
          userId: ctx.session.user.id,
          operation: "send_phone_code",
          provider: "telegram",
        });

        // Clean up session on error
        try {
          await ctx.db.telegramAuthSession.delete({
            where: { sessionId: input.sessionId },
          });
        } catch (cleanupError) {
          console.error("Error during session cleanup:", cleanupError);
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send verification code: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Verify code and complete authentication
  verifyAndStore: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        phoneNumber: z.string(),
        phoneCode: z.string(),
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.telegramAuthSession.findUnique({
        where: { sessionId: input.sessionId },
      });

      // Debug logging
      console.log(`Verifying session ${input.sessionId}:`, {
        exists: !!session,
        expired: session ? session.expiresAt < new Date() : "N/A",
        hasClientData: session ? !!session.clientData : "N/A",
        hasPhoneCodeHash: session ? !!session.phoneCodeHash : "N/A",
        hasApiId: session ? !!session.apiId : "N/A",
        hasApiHash: session ? !!session.apiHash : "N/A",
        timeToExpiry: session
          ? Math.round((session.expiresAt.getTime() - Date.now()) / 1000)
          : "N/A",
      });

      if (
        !session ||
        session.expiresAt < new Date() ||
        !session.clientData ||
        !session.phoneCodeHash ||
        !session.apiId ||
        !session.apiHash
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Authentication session expired or invalid. Please start over.",
        });
      }

      try {
        // Recreate client from stored session data
        const client = new TelegramClient(
          new sessions.StringSession(session.clientData),
          parseInt(session.apiId),
          session.apiHash,
          {},
        ) as unknown as TelegramClientInterface;

        // Connect to Telegram
        await client.connect();

        // Sign in with phone code using low-level API
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: input.phoneNumber,
            phoneCodeHash: session.phoneCodeHash,
            phoneCode: input.phoneCode,
          }),
        );

        // 2FA is handled automatically by detecting SESSION_PASSWORD_NEEDED error
        // The password will be handled in the catch block if needed

        // Get session string
        const sessionString = client.session.save();

        // Encrypt credentials
        const credentials: TelegramCredentials = {
          apiId: session.apiId,
          apiHash: session.apiHash,
          sessionString,
        };

        const encrypted = encryptTelegramCredentials(
          credentials,
          ctx.session.user.id,
        );

        // Store in database
        await ctx.db.telegramAuth.upsert({
          where: { userId: ctx.session.user.id },
          update: {
            encryptedApiId: encrypted.encryptedApiId,
            encryptedApiHash: encrypted.encryptedApiHash,
            encryptedSession: encrypted.encryptedSession,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            userId: ctx.session.user.id,
            encryptedApiId: encrypted.encryptedApiId,
            encryptedApiHash: encrypted.encryptedApiHash,
            encryptedSession: encrypted.encryptedSession,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
          },
        });

        // Clean up auth session
        await client.disconnect();
        await ctx.db.telegramAuthSession.delete({
          where: { sessionId: input.sessionId },
        });

        console.log(
          `Successfully authenticated Telegram for user ${hashForAudit(ctx.session.user.id)}`,
        );

        return { success: true };
      } catch (error) {
        console.error("Telegram authentication failed:", error);
        captureAuthError(error, {
          userId: ctx.session.user.id,
          operation: "telegram_authentication",
          provider: "telegram",
        });

        // Clean up on failure
        try {
          await ctx.db.telegramAuthSession.delete({
            where: { sessionId: input.sessionId },
          });
        } catch (cleanupError) {
          console.error("Error during session cleanup:", cleanupError);
        }

        if (
          error instanceof Error &&
          error.message.includes("SESSION_PASSWORD_NEEDED")
        ) {
          // If 2FA password was provided, try to authenticate with it
          if (input.password) {
            try {
              // For proper SRP implementation, we'd need account.getPassword first
              // For now, we'll provide a clear error message about 2FA complexity
              throw new TRPCError({
                code: "NOT_IMPLEMENTED",
                message:
                  "2FA authentication requires SRP protocol implementation. Please contact support.",
              });
            } catch (passwordError) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: `2FA authentication failed: ${passwordError instanceof Error ? passwordError.message : "Invalid password"}`,
              });
            }
          } else {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Two-factor authentication password required",
            });
          }
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Authentication failed: ${error instanceof Error ? error.message : "Invalid verification code"}`,
        });
      }
    }),

  // Remove stored authentication
  deleteAuth: protectedProcedure.mutation(async ({ ctx }) => {
    const deleted = await ctx.db.telegramAuth
      .delete({
        where: { userId: ctx.session.user.id },
      })
      .catch(() => null);

    if (deleted) {
      console.log(
        `Deleted Telegram auth for user ${hashForAudit(ctx.session.user.id)}`,
      );
    }

    return { success: true };
  }),

  // Get decrypted credentials (for server-side use only)
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const auth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!auth || !auth.isActive || isSessionExpired(auth.expiresAt)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active Telegram authentication found",
      });
    }

    try {
      const credentials = decryptTelegramCredentials(
        {
          encryptedApiId: auth.encryptedApiId,
          encryptedApiHash: auth.encryptedApiHash,
          encryptedSession: auth.encryptedSession,
          salt: auth.salt,
          iv: auth.iv,
        },
        ctx.session.user.id,
      );

      return credentials;
    } catch (error) {
      console.error(
        "Failed to decrypt Telegram credentials:",
        error instanceof Error ? error.message : String(error),
      );
      captureAuthError(error, {
        userId: ctx.session.user.id,
        operation: "decrypt_telegram_credentials",
        provider: "telegram",
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to decrypt stored credentials",
      });
    }
  }),

  // Send bulk messages to multiple contacts
  sendBulkMessage: protectedProcedure
    .input(
      z.object({
        contactIds: z.array(z.string()).min(1).max(50), // Limit to 50 recipients
        message: z.string().min(1).max(4096), // Telegram message limit
        addSalutation: z.boolean().optional().default(false), // Prepend "Hey [firstName], "
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check user has active Telegram authentication
      const auth = await ctx.db.telegramAuth.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!auth || !auth.isActive || isSessionExpired(auth.expiresAt)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No active Telegram authentication found. Please set up Telegram authentication first.",
        });
      }

      // Get contacts with Telegram usernames
      const contacts = await ctx.db.contact.findMany({
        where: {
          id: { in: input.contactIds },
          telegram: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          telegram: true,
          email: true, // Add email for application lookup
        },
      });

      if (contacts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No contacts found with Telegram usernames",
        });
      }

      let successCount = 0;
      let failureCount = 0;
      const results: Array<{
        contactId: string;
        success: boolean;
        error?: string;
        communicationId?: string;
      }> = [];

      try {
        // Decrypt user's credentials
        const credentials = decryptTelegramCredentials(
          {
            encryptedApiId: auth.encryptedApiId,
            encryptedApiHash: auth.encryptedApiHash,
            encryptedSession: auth.encryptedSession,
            salt: auth.salt,
            iv: auth.iv,
          },
          ctx.session.user.id,
        );

        const client = new TelegramClient(
          new sessions.StringSession(credentials.sessionString),
          parseInt(credentials.apiId),
          credentials.apiHash,
          {},
        );

        // Connect to Telegram
        await client.start({
          phoneNumber: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          password: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          phoneCode: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          onError: (err) => console.log(err),
        });

        // Send messages to each contact with delay to respect rate limits
        for (const contact of contacts) {
          try {
            // Skip contacts without telegram username
            if (!contact.telegram) {
              console.log(
                `Skipping contact ${contact.id} - no telegram username`,
              );
              continue;
            }

            // Resolve username to get peer
            const result = await client.invoke(
              new Api.contacts.ResolveUsername({
                username: contact.telegram,
              }),
            );

            if (result.users && result.users.length > 0) {
              const user = result.users[0];

              // Prepare message with optional salutation
              const messageText = input.addSalutation
                ? `Hey ${contact.firstName}, ${input.message}`
                : input.message;

              // Send message
              const sentMessage = await client.invoke(
                new Api.messages.SendMessage({
                  peer: user,
                  message: messageText,
                  randomId: bigInt(Math.floor(Math.random() * 1000000000)),
                }),
              );

              // Extract message ID safely from Updates structure
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

              // Track the message in Communication table
              let communicationId: string | undefined;
              try {
                // Find the contact's application to link the communication
                const contactApplication = await ctx.db.application.findFirst({
                  where: {
                    email: contact.email ?? undefined, // Use contact email to find application
                  },
                  select: { id: true, eventId: true },
                });

                // Create communication record
                const communication = await ctx.db.communication.create({
                  data: {
                    applicationId: contactApplication?.id, // May be null for non-applicant contacts
                    eventId: contactApplication?.eventId ?? "default", // Use default if no application found
                    toTelegram: contact.telegram,
                    channel: "TELEGRAM",
                    textContent: input.message,
                    type: "BULK_MESSAGE",
                    status: "SENT",
                    createdBy: ctx.session.user.id,
                    sentAt: new Date(),
                    telegramMsgId: messageId,
                  },
                });
                communicationId = communication.id;
              } catch (dbError) {
                // Log database error but don't fail the message sending
                console.error(
                  `Failed to track message for contact ${contact.id}:`,
                  dbError,
                );
              }

              successCount++;
              results.push({
                contactId: contact.id,
                success: true,
                communicationId,
              });

              console.log(
                `Message sent to @${contact.telegram} (${contact.firstName} ${contact.lastName})`,
              );
            } else {
              throw new Error("User not found");
            }

            // Rate limiting: wait 3 seconds between messages (20 messages per minute max)
            if (contacts.indexOf(contact) < contacts.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } catch (error) {
            failureCount++;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            results.push({
              contactId: contact.id,
              success: false,
              error: errorMessage,
            });

            console.error(
              `Failed to send message to @${contact.telegram}:`,
              errorMessage,
            );
          }
        }

        await client.disconnect();

        console.log(
          `Bulk message completed: ${successCount} successful, ${failureCount} failed for user ${hashForAudit(ctx.session.user.id)}`,
        );

        return {
          successCount,
          failureCount,
          results,
        };
      } catch (error) {
        console.error("Bulk message failed:", error);
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "telegram.sendBulkMessage",
          method: "POST",
          input: { contactIds: input.contactIds, message: input.message },
        });

        // If session is invalid, mark as inactive
        if (
          error instanceof Error &&
          (error.message.includes("SESSION_REVOKED") ||
            error.message.includes("AUTH_KEY_INVALID") ||
            error.message.includes("SESSION_EXPIRED"))
        ) {
          await ctx.db.telegramAuth.update({
            where: { userId: ctx.session.user.id },
            data: { isActive: false },
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Your Telegram session has expired. Please set up Telegram authentication again.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get available smart lists
  getSmartLists: protectedProcedure.query(async ({ ctx }) => {
    // Static smart lists based on application data
    const smartLists = [
      {
        id: "all-residency-applicants",
        name: "All Residency Applicants",
        description:
          "All people who submitted applications for the Funding Commons Residency 2025",
        category: "applications",
      },
      {
        id: "accepted-applicants",
        name: "Accepted Applicants",
        description: "Applicants who have been accepted to the residency",
        category: "applications",
      },
      {
        id: "rejected-applicants",
        name: "Rejected Applicants",
        description: "Applicants who were not accepted",
        category: "applications",
      },
      {
        id: "waitlisted-applicants",
        name: "Waitlisted Applicants",
        description: "Applicants currently on the waitlist",
        category: "applications",
      },
      {
        id: "under-review-applicants",
        name: "Under Review Applicants",
        description: "Applications still being evaluated",
        category: "applications",
      },
      {
        id: "admins",
        name: "Admins",
        description: "Platform administrators and staff members",
        category: "users",
      },
    ];

    // Get counts for each list - query applications directly (same as admin page)
    const eventId = "funding-commons-residency-2025";
    const telegramQuestionId = "cmeh86ive000suo43k2edx15q"; // Question ID for telegram field

    // Count applications with telegram responses for each status
    const counts = await Promise.all([
      // All residency applicants (submitted) with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT a.id)::integer as count
        FROM "Application" a
        INNER JOIN "ApplicationResponse" ar ON a.id = ar."applicationId"
        WHERE a."eventId" = ${eventId}
          AND a.status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WAITLISTED')
          AND ar."questionId" = ${telegramQuestionId}
          AND ar.answer IS NOT NULL
          AND ar.answer != ''
      ` as unknown as [{ count: number }],
      // Accepted with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT a.id)::integer as count
        FROM "Application" a
        INNER JOIN "ApplicationResponse" ar ON a.id = ar."applicationId"
        WHERE a."eventId" = ${eventId}
          AND a.status = 'ACCEPTED'
          AND ar."questionId" = ${telegramQuestionId}
          AND ar.answer IS NOT NULL
          AND ar.answer != ''
      ` as unknown as [{ count: number }],
      // Rejected with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT a.id)::integer as count
        FROM "Application" a
        INNER JOIN "ApplicationResponse" ar ON a.id = ar."applicationId"
        WHERE a."eventId" = ${eventId}
          AND a.status = 'REJECTED'
          AND ar."questionId" = ${telegramQuestionId}
          AND ar.answer IS NOT NULL
          AND ar.answer != ''
      ` as unknown as [{ count: number }],
      // Waitlisted with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT a.id)::integer as count
        FROM "Application" a
        INNER JOIN "ApplicationResponse" ar ON a.id = ar."applicationId"
        WHERE a."eventId" = ${eventId}
          AND a.status = 'WAITLISTED'
          AND ar."questionId" = ${telegramQuestionId}
          AND ar.answer IS NOT NULL
          AND ar.answer != ''
      ` as unknown as [{ count: number }],
      // Under review (submitted) with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT a.id)::integer as count
        FROM "Application" a
        INNER JOIN "ApplicationResponse" ar ON a.id = ar."applicationId"
        WHERE a."eventId" = ${eventId}
          AND a.status = 'SUBMITTED'
          AND ar."questionId" = ${telegramQuestionId}
          AND ar.answer IS NOT NULL
          AND ar.answer != ''
      ` as unknown as [{ count: number }],
      // Admins with Telegram
      ctx.db.$queryRaw`
        SELECT COUNT(DISTINCT u.id)::integer as count
        FROM "User" u
        LEFT JOIN "UserProfile" up ON u.id = up."userId"
        WHERE u.role = 'admin'
          AND (up."telegramHandle" IS NOT NULL AND up."telegramHandle" != '')
      ` as unknown as [{ count: number }],
    ]);

    return smartLists.map((list, index) => ({
      ...list,
      contactCount: counts[index]?.[0]?.count ?? 0,
    }));
  }),

  // Get contacts for a specific smart list
  getSmartListContacts: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Handle admins list separately
      if (input.listId === "admins") {
        const admins = await ctx.db.user.findMany({
          where: {
            role: "admin",
          },
          include: {
            profile: {
              select: {
                telegramHandle: true,
              },
            },
          },
        });

        return admins
          .filter((admin) => admin.profile?.telegramHandle)
          .map((admin) => {
            const nameParts = admin.name?.split(" ") ?? [];
            return {
              id: admin.id,
              firstName: nameParts[0] ?? admin.email?.split("@")[0] ?? "Admin",
              lastName: nameParts.slice(1).join(" ") || "",
              email: admin.email ?? undefined,
              telegram: admin.profile?.telegramHandle ?? undefined,
            };
          });
      }

      // Query applications directly (same as admin page) instead of requiring Contact records
      const eventId = "funding-commons-residency-2025";

      // Determine status filter based on list ID
      let statusFilter: string[] = [];
      switch (input.listId) {
        case "all-residency-applicants":
          statusFilter = ["SUBMITTED", "ACCEPTED", "REJECTED", "WAITLISTED"];
          break;
        case "accepted-applicants":
          statusFilter = ["ACCEPTED"];
          break;
        case "rejected-applicants":
          statusFilter = ["REJECTED"];
          break;
        case "waitlisted-applicants":
          statusFilter = ["WAITLISTED"];
          break;
        case "under-review-applicants":
          statusFilter = ["SUBMITTED"];
          break;
        default:
          return [];
      }

      // Get applications matching the filter (same query logic as admin page)
      const applications = await ctx.db.application.findMany({
        where: {
          eventId,
          status: {
            in: statusFilter as Array<
              "SUBMITTED" | "ACCEPTED" | "REJECTED" | "WAITLISTED"
            >,
          },
        },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      });

      // Extract contact info from each application (firstName, lastName, telegram from responses)
      const questionMapping = {
        cmeh86ipf000guo436knsqluc: "full_name",
        cmeh86ive000suo43k2edx15q: "telegram",
      } as const;

      const contacts = applications.map((app) => {
        let firstName = "";
        let lastName = "";
        let telegram: string | undefined;

        // Extract data from responses
        for (const response of app.responses) {
          const fieldType =
            questionMapping[
              response.questionId as keyof typeof questionMapping
            ];
          if (!fieldType || !response.answer?.trim()) continue;

          if (fieldType === "full_name") {
            const nameParts = response.answer.trim().split(/\s+/);
            firstName = nameParts[0] ?? "";
            lastName = nameParts.slice(1).join(" ") || "";
          } else if (fieldType === "telegram") {
            let tg = response.answer.trim();
            tg = tg.replace(/^@/, ""); // Remove leading @
            tg = tg.replace(/^https?:\/\/(www\.)?t\.me\//, ""); // Remove Telegram URL
            if (tg && !tg.includes("/") && !tg.includes(" ")) {
              telegram = tg;
            }
          }
        }

        return {
          id: app.id,
          firstName: firstName || "Unknown",
          lastName: lastName || "User",
          email: app.email,
          telegram: telegram ?? undefined,
        };
      });

      // Filter to only contacts with telegram (for messaging functionality)
      return contacts.filter((c) => c.telegram);
    }),

  // Send bulk message to a smart list
  sendBulkMessageToList: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        message: z.string().min(1).max(4096),
        addSalutation: z.boolean().optional().default(false), // Prepend "Hey [firstName], "
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let fullContacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        telegram?: string;
      }>;

      // Handle admins list separately
      if (input.listId === "admins") {
        const admins = await ctx.db.user.findMany({
          where: {
            role: "admin",
          },
          include: {
            profile: {
              select: {
                telegramHandle: true,
              },
            },
          },
        });

        fullContacts = admins
          .filter((admin) => admin.profile?.telegramHandle)
          .map((admin) => {
            const nameParts = admin.name?.split(" ") ?? [];
            return {
              id: admin.id,
              firstName: nameParts[0] ?? admin.email?.split("@")[0] ?? "Admin",
              lastName: nameParts.slice(1).join(" ") || "",
              email: admin.email ?? undefined,
              telegram: admin.profile?.telegramHandle ?? undefined,
            };
          });
      } else {
        // Reuse the getSmartListContacts logic to get applicants
        const eventId = "funding-commons-residency-2025";

        // Determine status filter based on list ID (same as getSmartListContacts)
        let statusFilter: string[] = [];
        switch (input.listId) {
          case "all-residency-applicants":
            statusFilter = ["SUBMITTED", "ACCEPTED", "REJECTED", "WAITLISTED"];
            break;
          case "accepted-applicants":
            statusFilter = ["ACCEPTED"];
            break;
          case "rejected-applicants":
            statusFilter = ["REJECTED"];
            break;
          case "waitlisted-applicants":
            statusFilter = ["WAITLISTED"];
            break;
          case "under-review-applicants":
            statusFilter = ["SUBMITTED"];
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid smart list ID",
            });
        }

        // Get applications matching the filter (same query logic as getSmartListContacts)
        const applications = await ctx.db.application.findMany({
          where: {
            eventId,
            status: {
              in: statusFilter as Array<
                "SUBMITTED" | "ACCEPTED" | "REJECTED" | "WAITLISTED"
              >,
            },
          },
          include: {
            responses: {
              include: {
                question: true,
              },
            },
          },
        });

        // Extract contact info from each application
        const questionMapping = {
          cmeh86ipf000guo436knsqluc: "full_name",
          cmeh86ive000suo43k2edx15q: "telegram",
        } as const;

        fullContacts = applications
          .map((app) => {
            let firstName = "";
            let lastName = "";
            let telegram: string | undefined;

            // Extract data from responses
            for (const response of app.responses) {
              const fieldType =
                questionMapping[
                  response.questionId as keyof typeof questionMapping
                ];
              if (!fieldType || !response.answer?.trim()) continue;

              if (fieldType === "full_name") {
                const nameParts = response.answer.trim().split(/\s+/);
                firstName = nameParts[0] ?? "";
                lastName = nameParts.slice(1).join(" ") || "";
              } else if (fieldType === "telegram") {
                let tg = response.answer.trim();
                tg = tg.replace(/^@/, ""); // Remove leading @
                tg = tg.replace(/^https?:\/\/(www\.)?t\.me\//, ""); // Remove Telegram URL
                if (tg && !tg.includes("/") && !tg.includes(" ")) {
                  telegram = tg;
                }
              }
            }

            return {
              id: app.id,
              firstName: firstName || "Unknown",
              lastName: lastName || "User",
              email: app.email,
              telegram: telegram ?? undefined,
            };
          })
          .filter((c) => c.telegram); // Only contacts with telegram
      }

      if (fullContacts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No contacts found in this list with Telegram usernames",
        });
      }

      // Get user's Telegram auth
      const auth = await ctx.db.telegramAuth.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!auth || !auth.isActive || isSessionExpired(auth.expiresAt)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No active Telegram authentication found. Please set up Telegram authentication first.",
        });
      }

      let successCount = 0;
      let failureCount = 0;
      const results: Array<{
        contactId: string;
        success: boolean;
        error?: string;
        communicationId?: string;
      }> = [];

      try {
        // Decrypt user's credentials
        const credentials = decryptTelegramCredentials(
          {
            encryptedApiId: auth.encryptedApiId,
            encryptedApiHash: auth.encryptedApiHash,
            encryptedSession: auth.encryptedSession,
            salt: auth.salt,
            iv: auth.iv,
          },
          ctx.session.user.id,
        );

        const client = new TelegramClient(
          new sessions.StringSession(credentials.sessionString),
          parseInt(credentials.apiId),
          credentials.apiHash,
          {},
        );

        // Connect to Telegram
        await client.start({
          phoneNumber: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          password: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          phoneCode: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          onError: (err) => console.log(err),
        });

        // Send messages to each contact with delay to respect rate limits
        for (const contact of fullContacts) {
          try {
            // Skip contacts without telegram username
            if (!contact.telegram) {
              console.log(
                `Skipping contact ${contact.id} - no telegram username`,
              );
              continue;
            }

            // Resolve username to get peer
            const result = await client.invoke(
              new Api.contacts.ResolveUsername({
                username: contact.telegram,
              }),
            );

            if (result.users && result.users.length > 0) {
              const user = result.users[0];

              // Prepare message with optional salutation
              const messageText = input.addSalutation
                ? `Hey ${contact.firstName}, ${input.message}`
                : input.message;

              // Send message
              const sentMessage = await client.invoke(
                new Api.messages.SendMessage({
                  peer: user,
                  message: messageText,
                  randomId: bigInt(Math.floor(Math.random() * 1000000000)),
                }),
              );

              // Extract message ID safely from Updates structure
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

              // Track the message in Communication table
              let communicationId: string | undefined;
              try {
                // Find the contact's application to link the communication
                const contactApplication = await ctx.db.application.findFirst({
                  where: {
                    email: contact.email ?? undefined, // Use contact email to find application
                    eventId: "funding-commons-residency-2025", // Smart lists are for this specific event
                  },
                  select: { id: true, eventId: true },
                });

                // Create communication record
                const communication = await ctx.db.communication.create({
                  data: {
                    applicationId: contactApplication?.id, // Should exist for smart list contacts
                    eventId:
                      contactApplication?.eventId ??
                      "funding-commons-residency-2025",
                    toTelegram: contact.telegram,
                    channel: "TELEGRAM",
                    textContent: input.message,
                    type: "BULK_MESSAGE",
                    status: "SENT",
                    createdBy: ctx.session.user.id,
                    sentAt: new Date(),
                    telegramMsgId: messageId,
                  },
                });
                communicationId = communication.id;
              } catch (dbError) {
                // Log database error but don't fail the message sending
                console.error(
                  `Failed to track message for contact ${contact.id}:`,
                  dbError,
                );
              }

              successCount++;
              results.push({
                contactId: contact.id,
                success: true,
                communicationId,
              });

              console.log(
                `Message sent to @${contact.telegram} (${contact.firstName} ${contact.lastName})`,
              );
            } else {
              throw new Error("User not found");
            }

            // Rate limiting: wait 3 seconds between messages (20 messages per minute max)
            if (fullContacts.indexOf(contact) < fullContacts.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } catch (error) {
            failureCount++;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            results.push({
              contactId: contact.id,
              success: false,
              error: errorMessage,
            });

            console.error(
              `Failed to send message to @${contact.telegram}:`,
              errorMessage,
            );
          }
        }

        await client.disconnect();

        console.log(
          `Bulk message to smart list completed: ${successCount} successful, ${failureCount} failed for user ${hashForAudit(ctx.session.user.id)}`,
        );

        return {
          successCount,
          failureCount,
          results,
        };
      } catch (error) {
        console.error("Smart list bulk message failed:", error);
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "telegram.sendSmartListMessage",
          method: "POST",
          input: { listId: input.listId, message: input.message },
        });

        // If session is invalid, mark as inactive
        if (
          error instanceof Error &&
          (error.message.includes("SESSION_REVOKED") ||
            error.message.includes("AUTH_KEY_INVALID") ||
            error.message.includes("SESSION_EXPIRED"))
        ) {
          await ctx.db.telegramAuth.update({
            where: { userId: ctx.session.user.id },
            data: { isActive: false },
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Your Telegram session has expired. Please set up Telegram authentication again.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send messages to smart list: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
