import * as Sentry from "@sentry/nextjs";

interface ErrorContext {
  userId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
  severity?: "error" | "warning" | "info";
}

/**
 * Captures errors to Sentry with enhanced context while preserving console logging for development
 */
export function captureError(error: unknown, context?: ErrorContext) {
  // Always log to console for development debugging
  const operation = context?.operation ?? "Unknown operation";
  console.error(`[${operation}] Error:`, error);

  if (context?.metadata) {
    console.error(`[${operation}] Context:`, context.metadata);
  }

  // Only send to Sentry in production or when DSN is configured
  if (process.env.NODE_ENV === "production" || process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      // Set user context if available
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set operation context
      if (context?.operation) {
        scope.setTag("operation", context.operation);
        scope.setContext("operation_details", { operation: context.operation });
      }

      // Add custom metadata
      if (context?.metadata) {
        scope.setContext("error_metadata", context.metadata);
      }

      // Set severity level
      if (context?.severity) {
        scope.setLevel(context.severity);
      }

      // Capture the error
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), "error");
      }
    });
  }
}

/**
 * Captures API route errors with request context
 */
export function captureApiError(
  error: unknown,
  context: {
    userId?: string;
    route: string;
    method?: string;
    input?: unknown;
  },
) {
  captureError(error, {
    userId: context.userId,
    operation: `API: ${context.method ?? "UNKNOWN"} ${context.route}`,
    metadata: {
      route: context.route,
      method: context.method,
      input: context.input,
    },
    severity: "error",
  });
}

/**
 * Captures authentication errors
 */
export function captureAuthError(
  error: unknown,
  context: {
    userId?: string;
    operation: string;
    provider?: string;
  },
) {
  captureError(error, {
    userId: context.userId,
    operation: `Auth: ${context.operation}`,
    metadata: {
      provider: context.provider,
      authOperation: context.operation,
    },
    severity: "error",
  });
}

/**
 * Captures email sending errors
 */
export function captureEmailError(
  error: unknown,
  context: {
    userId?: string;
    emailType: string;
    recipient?: string;
    templateName?: string;
  },
) {
  captureError(error, {
    userId: context.userId,
    operation: `Email: ${context.emailType}`,
    metadata: {
      emailType: context.emailType,
      recipient: context.recipient,
      templateName: context.templateName,
    },
    severity: "warning",
  });
}

/**
 * Captures database operation errors
 */
export function captureDatabaseError(
  error: unknown,
  context: {
    userId?: string;
    operation: string;
    table?: string;
    query?: string;
  },
) {
  captureError(error, {
    userId: context.userId,
    operation: `Database: ${context.operation}`,
    metadata: {
      table: context.table,
      dbOperation: context.operation,
      query: context.query,
    },
    severity: "error",
  });
}
