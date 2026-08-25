/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import * as Sentry from "@sentry/nextjs";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Check if a thrown error is a transient Prisma connection error worth retrying.
 */
function isTransientPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const name = (error as { name?: string }).name ?? "";
  const message = (error as { message?: string }).message ?? "";
  const code = (error as { code?: string }).code ?? "";

  // PrismaClientInitializationError — can't reach the database
  if (name === "PrismaClientInitializationError") return true;

  // PrismaClientKnownRequestError with transient codes
  if (name === "PrismaClientKnownRequestError") {
    // P1001: Can't reach database server
    // P1002: Database server timed out
    // P2024: Timed out fetching a new connection from the pool
    if (["P1001", "P1002", "P2024"].includes(code)) return true;
  }

  // Connection closed by server (pool exhaustion / proxy restart)
  if (message.includes("Server has closed the connection")) return true;
  if (message.includes("Can't reach database server")) return true;

  return false;
}

const RETRY_DELAYS = [200, 500]; // ms — up to 2 retries

/**
 * Middleware that retries tRPC procedures on transient database connection errors.
 * Retries up to 2 times with brief delays (200ms, 500ms) before giving up.
 */
const dbRetryMiddleware = t.middleware(async ({ next, path }) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await next();
    } catch (error) {
      lastError = error;

      // Only retry transient Prisma errors
      // For TRPCErrors, check the cause (Prisma errors get wrapped)
      const errorToCheck =
        error instanceof TRPCError ? error.cause ?? error : error;
      if (!isTransientPrismaError(errorToCheck)) throw error;

      // Don't retry if we've exhausted attempts
      if (attempt >= RETRY_DELAYS.length) break;

      const delay = RETRY_DELAYS[attempt]!;
      console.warn(
        `[TRPC] ${path} transient DB error (attempt ${attempt + 1}/${RETRY_DELAYS.length + 1}), retrying in ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted — log to Sentry and rethrow
  Sentry.captureException(lastError, {
    tags: { component: "dbRetryMiddleware", path },
    extra: { retriesExhausted: true, maxAttempts: RETRY_DELAYS.length + 1 },
  });
  throw lastError;
});

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
  .use(dbRetryMiddleware)
  .use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(dbRetryMiddleware)
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Admin-only procedure
 *
 * Requires an authenticated session whose user has the global `admin` role.
 * Use for any query or mutation that manages roles/permissions or exposes
 * platform-wide administrative data.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/**
 * Admin-or-staff procedure
 *
 * Requires an authenticated session whose user has the global `admin` or
 * `staff` role. Use for privileged operational data (e.g. CRM, communications)
 * that staff need but the general public and ordinary members must not see.
 */
export const adminOrStaffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.session.user.role;
  if (role !== "admin" && role !== "staff") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
