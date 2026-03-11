"use client";

import { ActionIcon } from "@mantine/core";
import { IconBrandTelegram, IconX } from "@tabler/icons-react";

interface ApplicationWithUser {
  responses: Array<{
    answer: string;
    question: {
      questionKey: string;
      questionEn: string;
      order: number;
    };
  }>;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface TelegramMessageButtonProps {
  application: ApplicationWithUser;
  customMessage?: string;
  size?: number;
  variant?: "subtle" | "filled" | "outline" | "light" | "default";
  color?: string;
  disabled?: boolean;
}

// Helper function to get user's telegram handle from application responses
function getUserTelegramHandle(
  application: ApplicationWithUser,
): string | null {
  const telegramResponse = application.responses.find(
    (response) => response.question.questionKey === "telegram",
  );

  if (!telegramResponse?.answer?.trim()) {
    return null;
  }

  let handle = telegramResponse.answer.trim();

  // If it's a full Telegram URL, extract just the username
  if (handle.includes("t.me/")) {
    const regex = /t\.me\/([^/?]+)/;
    const match = regex.exec(handle);
    if (match?.[1]) {
      handle = match[1];
    }
  }

  // Remove @ if present
  handle = handle.replace(/^@/, "");

  return handle || null;
}

// Helper function to generate Telegram link
function generateTelegramLink(
  application: ApplicationWithUser,
  customMessage?: string,
): string | null {
  const telegramHandle = getUserTelegramHandle(application);

  if (!telegramHandle) {
    return null;
  }

  const baseMessage =
    customMessage ??
    `I see you applied for the Funding the Commons residency in Buenos Aires in 2025! 

I'm reviewing your application, and need to collect some more information from you.

Could you please create an account on our platform with the same email address you applied with and fill in the missing information 🙏

You can find our platform here - https://platform.fundingthecommons.io/events/funding-commons-residency-2025?tab=application

Please let me know if you need any help?`;

  const encodedMessage = encodeURIComponent(baseMessage);
  return `https://t.me/${telegramHandle}?text=${encodedMessage}`;
}

export default function TelegramMessageButton({
  application,
  customMessage,
  size = 16,
  variant = "subtle",
  color = "blue",
  disabled = false,
}: TelegramMessageButtonProps) {
  const telegramLink = generateTelegramLink(application, customMessage);
  const telegramHandle = getUserTelegramHandle(application);

  if (telegramHandle && telegramLink && !disabled) {
    return (
      <ActionIcon
        variant={variant}
        color={color}
        component="a"
        href={telegramLink}
        target="_blank"
        title={`Contact via Telegram (@${telegramHandle})`}
        size={size}
      >
        <IconBrandTelegram size={size} />
      </ActionIcon>
    );
  } else {
    return (
      <ActionIcon
        variant={variant}
        color="red"
        disabled
        title={
          disabled
            ? "Telegram messaging disabled"
            : "No Telegram handle provided"
        }
        size={size}
      >
        <IconX size={size} />
      </ActionIcon>
    );
  }
}
