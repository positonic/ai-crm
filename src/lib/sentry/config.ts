/**
 * Centralized Sentry Configuration
 * This file contains all Sentry feature flags and configuration options
 * Easy to modify or disable features as needed
 */

export const SENTRY_CONFIG = {
  // Core settings
  dsn: {
    client: process.env.NEXT_PUBLIC_SENTRY_DSN,
    server: process.env.SENTRY_DSN,
  },

  // Environment settings
  environment: process.env.NODE_ENV ?? "development",
  debug: process.env.NODE_ENV === "development",

  // Feature flags - easily enable/disable features
  features: {
    sessionReplay: true,
    performanceMonitoring: true,
    userContext: true,
    routerInstrumentation: true,
    consoleLogging: false, // Set to true to capture console logs
  },

  // Performance monitoring
  performance: {
    // Higher sample rate in development, lower in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profile sample rate
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  },

  // Session Replay settings
  sessionReplay: {
    // Capture 100% of sessions with errors, 10% of normal sessions
    onErrorSampleRate: 1.0,
    sessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,

    // Privacy settings
    maskAllText: true,
    blockAllMedia: true,
    maskAllInputs: true,
  },

  // Privacy and security
  privacy: {
    sendDefaultPii: true, // Include user IP and headers for better debugging
    beforeSend: (event: unknown) => {
      // Filter out sensitive data
      const sentryEvent = event as {
        request?: { headers?: Record<string, unknown> };
      };
      if (sentryEvent.request?.headers) {
        delete sentryEvent.request.headers.authorization;
        delete sentryEvent.request.headers.cookie;
        delete sentryEvent.request.headers["x-auth-token"];
      }
      return sentryEvent;
    },
  },

  // Release and deployment tracking
  release: {
    // Automatically set by Vercel, but can be overridden
    name: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE,
  },
};

/**
 * Get configuration for specific runtime
 */
export function getSentryConfig(runtime: "client" | "server" | "edge") {
  const baseConfig = {
    dsn:
      runtime === "client"
        ? SENTRY_CONFIG.dsn.client
        : SENTRY_CONFIG.dsn.server,
    environment: SENTRY_CONFIG.environment,
    debug: SENTRY_CONFIG.debug,
    release: SENTRY_CONFIG.release.name,
    beforeSend: SENTRY_CONFIG.privacy.beforeSend,
  };

  // Runtime-specific configurations
  if (runtime === "client") {
    return {
      ...baseConfig,
      sendDefaultPii: SENTRY_CONFIG.privacy.sendDefaultPii,
      tracesSampleRate: SENTRY_CONFIG.performance.tracesSampleRate,
      profilesSampleRate: SENTRY_CONFIG.performance.profilesSampleRate,
    };
  }

  if (runtime === "server") {
    return {
      ...baseConfig,
      sendDefaultPii: SENTRY_CONFIG.privacy.sendDefaultPii,
      tracesSampleRate: SENTRY_CONFIG.performance.tracesSampleRate,
      profilesSampleRate: SENTRY_CONFIG.performance.profilesSampleRate,
    };
  }

  // Edge runtime (minimal config)
  return {
    ...baseConfig,
    tracesSampleRate: SENTRY_CONFIG.performance.tracesSampleRate,
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof typeof SENTRY_CONFIG.features,
): boolean {
  return SENTRY_CONFIG.features[feature] && !!SENTRY_CONFIG.dsn.client;
}

/**
 * Disable all Sentry features (for easy removal)
 */
export function disableSentry(): boolean {
  return !SENTRY_CONFIG.dsn.client || process.env.DISABLE_SENTRY === "true";
}
