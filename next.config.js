/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/contacts",
        destination: "/crm/contacts",
        permanent: true,
      },
      {
        source: "/contacts/:id",
        destination: "/crm/contacts/:id",
        permanent: true,
      },
      {
        source: "/organizations",
        destination: "/crm/organizations",
        permanent: true,
      },
      {
        source: "/organizations/:id",
        destination: "/crm/organizations/:id",
        permanent: true,
      },
    ];
  },
};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(config, {
  org: "funding-the-commons",
  project: "ftc-platform-7k",

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // CRITICAL FIX: Disable source map uploads to prevent 20+ minute build times
  // Sentry error tracking still works, just without detailed source maps
  // Re-enable sourcemaps only when needed for specific debugging
  sourcemaps: {
    disable: true,
  },

  // OPTIMIZED: Disable to prevent uploading hundreds of unnecessary files
  // This was causing 27+ minute build times. Only upload essential source maps.
  widenClientFileUpload: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
