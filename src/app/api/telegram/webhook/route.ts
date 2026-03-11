import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import * as Sentry from "@sentry/nextjs";
import { crossPostPraiseToChannel } from "~/server/services/praiseChannelService";

/**
 * Telegram Bot Webhook Handler
 *
 * Receives updates from Telegram Bot API and processes praise commands.
 *
 * Command format: !Praise @username for doing something amazing
 */

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Parse praise command from message text
 * Supports multiple natural language formats:
 * - !praise @alice for message
 * - !praise @alice @bob for message
 * - !praise @alice and @bob for message
 * - !praise @alice, @bob for message
 * - !praise @alice, @bob, and @charlie for message
 * Works with or without bot mention prefix
 */
function parsePraiseCommand(text: string): {
  recipientUsernames: string[];
  message: string;
} | null {
  // Remove bot mention if present at the start (e.g., "@platform_praise_bot !praise...")
  // Only remove if it's before the !praise command
  const cleanText = text.replace(/^@\w+\s+(!praise)/i, "$1").trim();

  // Match pattern: !Praise ... for message
  // Captures everything between !praise and "for" (more flexible)
  const praiseRegex = /^!praise\s+(.+?)\s+for\s+(.+)$/i;
  const match = praiseRegex.exec(cleanText);

  if (!match) {
    return null;
  }

  // Extract all @usernames from the mentions section
  const mentionsText = match[1]!;
  const usernameMatches = mentionsText.match(/@(\w+)/g);

  if (!usernameMatches || usernameMatches.length === 0) {
    return null;
  }

  // Remove @ prefix and convert to lowercase
  const usernames = usernameMatches.map((mention) =>
    mention.substring(1).toLowerCase(),
  );

  // Deduplicate usernames (in case same person mentioned multiple times)
  const uniqueUsernames = [...new Set(usernames)];

  return {
    recipientUsernames: uniqueUsernames,
    message: match[2]!.trim(),
  };
}

/**
 * Check if message is from a group or channel (not a DM)
 */
function isGroupMessage(message: TelegramMessage): boolean {
  return message.chat.type === "group" || message.chat.type === "supergroup";
}

/**
 * React to a message with an emoji
 */
async function reactToMessage(
  chatId: number,
  messageId: number,
  emoji: string,
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setMessageReaction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reaction: [{ type: "emoji", emoji: emoji }],
        }),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { description?: string };
      throw new Error(
        `Telegram API error: ${error.description ?? response.statusText}`,
      );
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "telegram_bot_reaction" },
      extra: { chatId, messageId, emoji },
    });
    console.error("Failed to react to Telegram message:", error);
  }
}

/**
 * Find user by Telegram information
 */
async function findUserByTelegram(
  _telegramId: number,
  username?: string,
): Promise<{ id: string; name: string | null; kudos: number } | null> {
  // Try to find by Contact with matching telegramId
  const contact = await db.contact.findFirst({
    where: {
      telegram: username ?? undefined,
    },
  });

  if (contact) {
    // Contact exists, but we need to map to User
    // This is tricky - contacts don't have userId
    // We'll need to search by name or other identifier
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: contact.email },
          {
            name: {
              contains: `${contact.firstName} ${contact.lastName}`,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (user) {
      return { id: user.id, name: user.name, kudos: user.kudos };
    }
  }

  // Try to find by TelegramAuth
  // Note: TelegramAuth doesn't store telegram user ID, only session info
  // We need to rely on username matching

  // Try to find user by name/username matching
  if (username) {
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { contains: username, mode: "insensitive" } },
          { name: { contains: username, mode: "insensitive" } },
        ],
      },
    });

    if (user) {
      return { id: user.id, name: user.name, kudos: user.kudos };
    }
  }

  return null;
}

/**
 * Find recipient user by username
 */
async function findRecipientByUsername(
  username: string,
): Promise<{ id: string; name: string | null; kudos: number } | null> {
  // First try exact match on Contact telegram field
  const contact = await db.contact.findFirst({
    where: {
      telegram: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  if (contact?.email) {
    const user = await db.user.findFirst({
      where: { email: { equals: contact.email, mode: "insensitive" } },
    });
    if (user) {
      return { id: user.id, name: user.name, kudos: user.kudos };
    }
  }

  // Try matching User by name
  const user = await db.user.findFirst({
    where: {
      name: {
        contains: username,
        mode: "insensitive",
      },
    },
  });

  if (user) {
    return { id: user.id, name: user.name, kudos: user.kudos };
  }

  return null;
}

/**
 * Send reply message via Telegram Bot API
 */
async function sendTelegramReply(chatId: number, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown",
        }),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as { description?: string };
      throw new Error(
        `Telegram API error: ${error.description ?? response.statusText}`,
      );
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "telegram_bot_reply" },
      extra: { chatId, text },
    });
    console.error("Failed to send Telegram reply:", error);
  }
}

/**
 * Process praise command
 */
async function processPraiseCommand(
  message: TelegramMessage,
  praiseData: { recipientUsernames: string[]; message: string },
): Promise<string> {
  const { recipientUsernames, message: praiseMessage } = praiseData;

  // Maximum recipients limit
  const MAX_RECIPIENTS = 10;
  if (recipientUsernames.length > MAX_RECIPIENTS) {
    return `Sorry, you can only praise up to ${MAX_RECIPIENTS} people at once. You mentioned ${recipientUsernames.length} people.`;
  }

  // Find sender
  const sender = await findUserByTelegram(
    message.from.id,
    message.from.username,
  );

  if (!sender) {
    return `Sorry, I couldn't find your user account. Make sure you're registered in the platform.`;
  }

  // Find all recipients in parallel
  const recipientResults = await Promise.all(
    recipientUsernames.map(async (username) => ({
      username,
      user: await findRecipientByUsername(username),
    })),
  );

  // Get sender's current kudos for transfer calculation
  const senderKudos = sender.kudos ?? 130; // Default to base kudos if not set

  // Calculate kudos transfer per recipient (5% of sender's kudos split among all)
  const totalTransferAmount = senderKudos * 0.05;
  const transferAmountPerRecipient =
    totalTransferAmount / recipientUsernames.length;

  // Check if sender has sufficient kudos
  if (senderKudos < totalTransferAmount) {
    return `Sorry, you don't have enough kudos to send praise. You need at least ${totalTransferAmount.toFixed(1)} kudos. Your current balance: ${senderKudos.toFixed(1)} kudos.`;
  }

  // Create praise records with kudos transfer
  try {
    // Build transaction operations
    const transactionOps = [];

    // Create praise record for each recipient
    for (const { username, user } of recipientResults) {
      transactionOps.push(
        db.praise.create({
          data: {
            senderId: sender.id,
            senderTelegramId: BigInt(message.from.id),
            recipientId: user?.id ?? null,
            recipientName: username,
            message: praiseMessage,
            telegramMsgId: message.message_id.toString(),
            isPublic: false, // Default to private
            kudosTransferred: transferAmountPerRecipient,
            senderKudosAtTime: senderKudos,
          },
        }),
      );

      // Add kudos to recipient if found
      if (user) {
        transactionOps.push(
          db.user.update({
            where: { id: user.id },
            data: { kudos: { increment: transferAmountPerRecipient } },
          }),
        );
      }
    }

    // Deduct total kudos from sender once
    transactionOps.push(
      db.user.update({
        where: { id: sender.id },
        data: { kudos: { decrement: totalTransferAmount } },
      }),
    );

    // Execute all operations in a single transaction
    const results = await db.$transaction(transactionOps);

    // Extract praise records (they're the first N operations)
    const praiseRecords = results.slice(0, recipientUsernames.length);

    // Log successful praise
    Sentry.addBreadcrumb({
      category: "praise",
      message: `Praised ${recipientUsernames.length} people`,
      data: {
        senderId: sender.id,
        recipients: recipientResults.map((r) => ({
          username: r.username,
          found: !!r.user,
        })),
        kudosPerRecipient: transferAmountPerRecipient,
      },
      level: "info",
    });

    // Determine if this is from a group (public) or DM (private)
    const isPublic = isGroupMessage(message);
    const senderName = isPublic ? (sender.name ?? "Someone") : undefined;

    // Cross-post to channel for each recipient
    for (let i = 0; i < recipientUsernames.length; i++) {
      const username = recipientUsernames[i]!;
      const praise = praiseRecords[i];

      const channelResult = await crossPostPraiseToChannel(
        username,
        praiseMessage,
        senderName,
      );

      // Update praise record with channel message ID if successful
      if (channelResult.success && channelResult.messageId && praise) {
        await db.praise.update({
          where: { id: (praise as { id: string }).id },
          data: {
            channelMessageId: channelResult.messageId,
            crossPostedAt: new Date(),
          },
        });
      }
    }

    // React with thumbs up if in a group
    if (isPublic) {
      await reactToMessage(message.chat.id, message.message_id, "👍");
    }

    // Build success message
    const foundRecipients = recipientResults.filter((r) => r.user);
    const notFoundRecipients = recipientResults.filter((r) => !r.user);

    let responseMessage = "";

    if (foundRecipients.length > 0) {
      const recipientDisplays = foundRecipients.map(
        (r) => r.user?.name ?? `@${r.username}`,
      );
      const recipientList =
        recipientDisplays.length === 1
          ? recipientDisplays[0]
          : recipientDisplays.length === 2
            ? `${recipientDisplays[0]} and ${recipientDisplays[1]}`
            : `${recipientDisplays.slice(0, -1).join(", ")}, and ${recipientDisplays[recipientDisplays.length - 1]}`;

      responseMessage = `✅ Praise recorded! You praised ${recipientList} for: "${praiseMessage}"`;

      if (foundRecipients.length > 1) {
        responseMessage += ` (${transferAmountPerRecipient.toFixed(1)} kudos each)`;
      }
    }

    if (notFoundRecipients.length > 0) {
      const notFoundList = notFoundRecipients
        .map((r) => `@${r.username}`)
        .join(", ");
      responseMessage += `\n\n⚠️ Note: Couldn't find ${notFoundList} in the system, but praise was still recorded.`;
    }

    // Only send reply in DM, not in groups
    return isPublic ? "" : responseMessage;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "create_praise" },
      extra: {
        senderId: sender.id,
        recipientUsernames,
        praiseMessage,
      },
    });

    console.error("Failed to create praise:", error);
    return "Sorry, something went wrong while recording your praise. Please try again.";
  }
}

/**
 * Capture and store Telegram chat ID for a user
 * This enables the bot to send DMs to users who have interacted with it
 */
async function captureTelegramChatId(
  _telegramUserId: number,
  telegramUsername: string,
  chatId: number,
): Promise<void> {
  try {
    // Find user by their Telegram handle in profile
    const userProfile = await db.userProfile.findFirst({
      where: {
        telegramHandle: {
          equals: telegramUsername,
          mode: "insensitive",
        },
      },
    });

    if (userProfile) {
      // Update the profile with the chat ID if it's different
      const chatIdStr = chatId.toString();
      if (userProfile.telegramChatId !== chatIdStr) {
        await db.userProfile.update({
          where: { id: userProfile.id },
          data: { telegramChatId: chatIdStr },
        });
        console.log(
          `[Webhook] Captured chat ID ${chatId} for user with handle @${telegramUsername}`,
        );
      }
    } else {
      console.log(
        `[Webhook] No user profile found for Telegram handle @${telegramUsername} - user needs to add their handle to their profile`,
      );
    }
  } catch (error) {
    console.error("Failed to capture Telegram chat ID:", error);
    // Don't throw - this is non-critical for message processing
  }
}

/**
 * POST /api/telegram/webhook
 *
 * Webhook endpoint for Telegram Bot API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook token (optional security measure)
    const webhookToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedToken && webhookToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;

    // Only process text messages
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const text = message.text ?? "";

    // Log incoming message for debugging
    console.log("[Webhook] Received message:", {
      chatType: message.chat.type,
      chatId: message.chat.id,
      fromUser: message.from.username,
      text: text.substring(0, 100), // First 100 chars only
    });

    // Capture and store chat ID for this user (for DMs only)
    if (message.chat.type === "private" && message.from.username) {
      await captureTelegramChatId(
        message.from.id,
        message.from.username,
        message.chat.id,
      );
    }

    // Check if it's a praise command
    const praiseData = parsePraiseCommand(text);

    if (!praiseData) {
      console.log("[Webhook] Not a praise command, ignoring");
    } else {
      console.log("[Webhook] Parsed praise command:", praiseData);
    }

    if (praiseData) {
      const replyText = await processPraiseCommand(message, praiseData);
      // Only send text reply if there is one (DMs get reply, groups just get reaction)
      if (replyText) {
        await sendTelegramReply(message.chat.id, replyText);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "telegram_webhook" },
    });

    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/telegram/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram praise bot webhook is running",
  });
}
