import * as Sentry from "@sentry/nextjs";

/**
 * Praise Channel Service
 *
 * Handles cross-posting praise messages to Telegram channels anonymously.
 */

interface CrossPostResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format praise message for channel posting
 * @param recipientName - The @username of the recipient
 * @param message - The praise message
 * @param senderName - Optional sender name (for public group praise)
 * @returns Formatted message string
 */
function formatPraiseForChannel(
  recipientName: string,
  message: string,
  senderName?: string,
): string {
  // Ensure recipientName has @ prefix
  const formattedName = recipientName.startsWith("@")
    ? recipientName
    : `@${recipientName}`;

  // If sender name provided (public group praise), show it
  // Otherwise keep anonymous (DM praise)
  const sender = senderName ?? "Someone";

  return `🌟 ${sender} praised ${formattedName} for ${message}`;
}

/**
 * Cross-post praise to Telegram channel
 *
 * @param recipientName - Username of the person being praised
 * @param message - The praise message
 * @param senderName - Optional sender name (for public group praise, omit for anonymous)
 * @returns Result object with success status and message ID
 */
export async function crossPostPraiseToChannel(
  recipientName: string,
  message: string,
  senderName?: string,
): Promise<CrossPostResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  // Check if channel posting is configured
  if (!channelId) {
    console.log("TELEGRAM_CHANNEL_ID not configured, skipping channel post");
    return { success: false, error: "Channel not configured" };
  }

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return { success: false, error: "Bot token not configured" };
  }

  try {
    const formattedMessage = formatPraiseForChannel(
      recipientName,
      message,
      senderName,
    );
    const topicId = process.env.TELEGRAM_PRAISE_TOPIC_ID;

    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      message_thread_id?: number;
    } = {
      chat_id: channelId,
      text: formattedMessage,
      parse_mode: "Markdown",
    };

    // Add topic ID if configured (for channels with topics/forums)
    if (topicId) {
      requestBody.message_thread_id = parseInt(topicId, 10);
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as {
        description?: string;
        error_code?: number;
      };
      throw new Error(
        `Telegram API error (${error.error_code ?? response.status}): ${error.description ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      ok: boolean;
      result: { message_id: number };
    };

    if (!data.ok) {
      throw new Error("Telegram API returned ok: false");
    }

    Sentry.addBreadcrumb({
      category: "praise_channel",
      message: "Successfully cross-posted praise to channel",
      data: {
        channelId,
        messageId: data.result.message_id,
        recipientName,
      },
      level: "info",
    });

    return {
      success: true,
      messageId: data.result.message_id.toString(),
    };
  } catch (error) {
    // Log error but don't throw - we don't want to fail praise creation
    // if channel posting fails
    Sentry.captureException(error, {
      tags: { operation: "praise_channel_crosspost" },
      extra: {
        channelId,
        recipientName,
        message,
      },
    });

    console.error("Failed to cross-post praise to channel:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
