import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NOTION_TOKEN: z.string(),
    NOTION_CONTACTS_DATABASE_ID: z.string(),
    NOTION_EVENTS_DATABASE_ID: z.string(),
    POSTMARK_SERVER_TOKEN: z.string().optional(),
    POSTMARK_SANDBOX_TOKEN: z.string().optional(),
    EMAIL_MODE: z.enum(["development", "staging", "production"]).default("development"),
    TEST_EMAIL_OVERRIDE: z.string().email().optional(),
    ADMIN_EMAIL: z.string().email(),
    MASTRA_API_KEY: z.string(),
    MASTRA_SERVER_URL: z.string().url().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHANNEL_ID: z.string().optional(),
    TELEGRAM_PRAISE_TOPIC_ID: z.string().optional(),
    TELEGRAM_ASKOFFER_TOPIC_ID: z.string().optional(),
    TELEGRAM_UPDATES_TOPIC_ID: z.string().optional(),
    TELEGRAM_PROJECT_UPDATE_CHANNEL_ID: z.string().optional(),
    TELEGRAM_PROJECT_UPDATE_TOPIC_ID: z.string().optional(),
    ATPROTO_PDS_URL: z.string().url().optional().default("https://bsky.social"),
    ATPROTO_ENCRYPTION_KEY: z.string().min(32).optional(),
    ATPROTO_PLATFORM_HANDLE: z.string().optional(),
    ATPROTO_PLATFORM_APP_PASSWORD: z.string().optional(),
    GITHUB_API_TOKEN: z.string().optional(),
    LUMA_API_KEY: z.string().optional(),
    // EAS (Ethereum Attestation Service) configuration
    EAS_PRIVATE_KEY: z.string().optional(), // Platform wallet private key for signing
    EAS_USE_MAINNET: z.enum(["true", "false"]).optional().default("false"),
    EAS_ATTESTATIONS_ENABLED: z.enum(["true", "false"]).optional().default("false"),
    EAS_SCHEMA_UID: z.string().optional(), // Set after schema is registered
    // Exponential API integration (bug reporting)
    EXPONENTIAL_API_KEY: z.string().optional(),
    EXPONENTIAL_BUG_PROJECT_ID: z.string().optional(),
    TRANSCRIPTION_API_KEY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_CONTACTS_DATABASE_ID: process.env.NOTION_CONTACTS_DATABASE_ID,
    NOTION_EVENTS_DATABASE_ID: process.env.NOTION_EVENTS_DATABASE_ID,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_SANDBOX_TOKEN: process.env.POSTMARK_SANDBOX_TOKEN,
    EMAIL_MODE: process.env.EMAIL_MODE,
    TEST_EMAIL_OVERRIDE: process.env.TEST_EMAIL_OVERRIDE,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    MASTRA_API_KEY: process.env.MASTRA_API_KEY,
    MASTRA_SERVER_URL: process.env.MASTRA_SERVER_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? undefined,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    TELEGRAM_PRAISE_TOPIC_ID: process.env.TELEGRAM_PRAISE_TOPIC_ID,
    TELEGRAM_ASKOFFER_TOPIC_ID: process.env.TELEGRAM_ASKOFFER_TOPIC_ID,
    TELEGRAM_UPDATES_TOPIC_ID: process.env.TELEGRAM_UPDATES_TOPIC_ID,
    TELEGRAM_PROJECT_UPDATE_CHANNEL_ID: process.env.TELEGRAM_PROJECT_UPDATE_CHANNEL_ID,
    TELEGRAM_PROJECT_UPDATE_TOPIC_ID: process.env.TELEGRAM_PROJECT_UPDATE_TOPIC_ID,
    ATPROTO_PDS_URL: process.env.ATPROTO_PDS_URL,
    ATPROTO_ENCRYPTION_KEY: process.env.ATPROTO_ENCRYPTION_KEY,
    ATPROTO_PLATFORM_HANDLE: process.env.ATPROTO_PLATFORM_HANDLE,
    ATPROTO_PLATFORM_APP_PASSWORD: process.env.ATPROTO_PLATFORM_APP_PASSWORD,
    GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN,
    LUMA_API_KEY: process.env.LUMA_API_KEY,
    EAS_PRIVATE_KEY: process.env.EAS_PRIVATE_KEY,
    EAS_USE_MAINNET: process.env.EAS_USE_MAINNET,
    EAS_ATTESTATIONS_ENABLED: process.env.EAS_ATTESTATIONS_ENABLED,
    EAS_SCHEMA_UID: process.env.EAS_SCHEMA_UID,
    EXPONENTIAL_API_KEY: process.env.EXPONENTIAL_API_KEY,
    EXPONENTIAL_BUG_PROJECT_ID: process.env.EXPONENTIAL_BUG_PROJECT_ID,
    TRANSCRIPTION_API_KEY: process.env.TRANSCRIPTION_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
