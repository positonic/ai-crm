"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global Error Boundary for App Router
 * Captures React render errors and sends them to Sentry with enhanced context
 * This file is required for proper error capture in Next.js App Router
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the error in Sentry with additional context
    Sentry.captureException(error, {
      tags: {
        component: "GlobalErrorBoundary",
        errorBoundary: true,
      },
      extra: {
        digest: error.digest,
        errorInfo: "Global React error boundary triggered",
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : undefined,
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            maxWidth: "600px",
            margin: "2rem auto",
          }}
        >
          <h1 style={{ color: "#dc2626", marginBottom: "1rem" }}>
            Something went wrong!
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            We&apos;ve been notified of this error and will look into it. Please
            try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#0070f3",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
