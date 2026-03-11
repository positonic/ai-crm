import * as Sentry from "@sentry/nextjs";

/**
 * Next.js Instrumentation File
 * This file registers Sentry SDK initialization for server-side and edge environments
 * Required for proper server-side error capture
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import server-side Sentry configuration
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Import edge runtime Sentry configuration
    await import("./sentry.edge.config");
  }
}

/**
 * Capture errors from nested React Server Components
 * Requires @sentry/nextjs version 8.28.0+ and Next.js 15+
 */
export const onRequestError = Sentry.captureRequestError;
