/**
 * Analytics Access Control Utility
 *
 * Manages role-based access control for analytics endpoints
 * and provides audit logging functionality.
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import type { AnalyticsEndpoint, Prisma } from "@prisma/client";

/**
 * Check if user has researcher access to analytics endpoints
 */
export function checkResearcherAccess(userRole?: string | null): void {
  if (!userRole || !["admin", "staff", "researcher"].includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Researcher access required. Please contact an administrator for analytics access.",
    });
  }
}

/**
 * Check if user has admin access (higher privilege level)
 */
export function checkAnalyticsAdminAccess(userRole?: string | null): void {
  if (!userRole || !["admin", "staff"].includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required for this analytics operation.",
    });
  }
}

/**
 * Log analytics API access for audit trail
 */
export async function logAnalyticsAccess(
  db: PrismaClient,
  params: {
    userId: string;
    endpoint: AnalyticsEndpoint;
    eventId?: string;
    dataRequested?: string;
    requestParams?: Record<string, unknown>;
    responseSize?: number;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  try {
    await db.analyticsAudit.create({
      data: {
        userId: params.userId,
        endpoint: params.endpoint,
        eventId: params.eventId,
        dataRequested: params.dataRequested,
        requestParams: params.requestParams as Prisma.InputJsonValue,
        responseSize: params.responseSize,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Log the error but don't fail the request
    console.error("Failed to log analytics access:", error);
  }
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMinutes: number;
  maxRequests: number;
  blockDurationMinutes: number;
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // More restrictive for bulk data endpoints
  APPLICATION_TEXT_CORPUS: {
    windowMinutes: 60,
    maxRequests: 5,
    blockDurationMinutes: 60,
  },
  DEMOGRAPHICS_BREAKDOWN: {
    windowMinutes: 60,
    maxRequests: 20,
    blockDurationMinutes: 15,
  },
  SKILLS_WORD_CLOUD: {
    windowMinutes: 60,
    maxRequests: 20,
    blockDurationMinutes: 15,
  },
  APPLICATION_TIMELINE: {
    windowMinutes: 60,
    maxRequests: 15,
    blockDurationMinutes: 30,
  },
  REVIEW_METRICS: {
    windowMinutes: 60,
    maxRequests: 10,
    blockDurationMinutes: 30,
  },
};

/**
 * Check and enforce rate limiting for analytics endpoints
 */
export async function checkRateLimit(
  db: PrismaClient,
  userId: string,
  endpoint: AnalyticsEndpoint,
): Promise<void> {
  const config = DEFAULT_RATE_LIMITS[endpoint];
  if (!config) {
    throw new Error(
      `Rate limit configuration not found for endpoint: ${endpoint}`,
    );
  }

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - config.windowMinutes * 60 * 1000,
  );

  // Get or create rate limit record
  let rateLimitRecord = await db.analyticsRateLimit.findUnique({
    where: {
      userId_endpoint: {
        userId,
        endpoint,
      },
    },
  });

  // Create new record if doesn't exist
  rateLimitRecord ??= await db.analyticsRateLimit.create({
    data: {
      userId,
      endpoint,
      requestCount: 0,
      windowStart: now,
      lastRequest: now,
      isBlocked: false,
    },
  });
  // Check if user is currently blocked
  if (rateLimitRecord.isBlocked) {
    const blockExpiry = new Date(
      rateLimitRecord.lastRequest.getTime() +
        config.blockDurationMinutes * 60 * 1000,
    );

    if (now < blockExpiry) {
      const remainingMinutes = Math.ceil(
        (blockExpiry.getTime() - now.getTime()) / (60 * 1000),
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Access blocked for ${remainingMinutes} more minutes.`,
      });
    } else {
      // Block expired, reset
      rateLimitRecord = await db.analyticsRateLimit.update({
        where: { id: rateLimitRecord.id },
        data: {
          isBlocked: false,
          requestCount: 0,
          windowStart: now,
        },
      });
    }
  }

  // Check if we need to reset the window
  if (rateLimitRecord.windowStart < windowStart) {
    rateLimitRecord = await db.analyticsRateLimit.update({
      where: { id: rateLimitRecord.id },
      data: {
        requestCount: 0,
        windowStart: now,
      },
    });
  }

  // Check if user has exceeded rate limit
  if (rateLimitRecord.requestCount >= config.maxRequests) {
    await db.analyticsRateLimit.update({
      where: { id: rateLimitRecord.id },
      data: {
        isBlocked: true,
        lastRequest: now,
      },
    });

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMinutes} minutes. Access blocked for ${config.blockDurationMinutes} minutes.`,
    });
  }

  // Increment request count
  await db.analyticsRateLimit.update({
    where: { id: rateLimitRecord.id },
    data: {
      requestCount: rateLimitRecord.requestCount + 1,
      lastRequest: now,
    },
  });
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(
  db: PrismaClient,
  userId: string,
  endpoint: AnalyticsEndpoint,
): Promise<{
  requestCount: number;
  maxRequests: number;
  windowMinutes: number;
  timeUntilReset: number; // minutes
  isBlocked: boolean;
  timeUntilUnblocked?: number; // minutes
}> {
  const config = DEFAULT_RATE_LIMITS[endpoint];
  if (!config) {
    throw new Error(
      `Rate limit configuration not found for endpoint: ${endpoint}`,
    );
  }

  const rateLimitRecord = await db.analyticsRateLimit.findUnique({
    where: {
      userId_endpoint: {
        userId,
        endpoint,
      },
    },
  });

  if (!rateLimitRecord) {
    return {
      requestCount: 0,
      maxRequests: config.maxRequests,
      windowMinutes: config.windowMinutes,
      timeUntilReset: config.windowMinutes,
      isBlocked: false,
    };
  }

  const now = new Date();
  const windowEnd = new Date(
    rateLimitRecord.windowStart.getTime() + config.windowMinutes * 60 * 1000,
  );
  const timeUntilReset = Math.max(
    0,
    Math.ceil((windowEnd.getTime() - now.getTime()) / (60 * 1000)),
  );

  let timeUntilUnblocked: number | undefined;
  if (rateLimitRecord.isBlocked) {
    const blockExpiry = new Date(
      rateLimitRecord.lastRequest.getTime() +
        config.blockDurationMinutes * 60 * 1000,
    );
    timeUntilUnblocked = Math.max(
      0,
      Math.ceil((blockExpiry.getTime() - now.getTime()) / (60 * 1000)),
    );
  }

  return {
    requestCount: rateLimitRecord.requestCount,
    maxRequests: config.maxRequests,
    windowMinutes: config.windowMinutes,
    timeUntilReset,
    isBlocked: rateLimitRecord.isBlocked,
    timeUntilUnblocked,
  };
}

/**
 * Admin function to reset rate limits for a user
 */
export async function resetUserRateLimit(
  db: PrismaClient,
  userId: string,
  endpoint?: AnalyticsEndpoint,
): Promise<void> {
  if (endpoint) {
    // Reset specific endpoint
    await db.analyticsRateLimit.updateMany({
      where: {
        userId,
        endpoint,
      },
      data: {
        requestCount: 0,
        isBlocked: false,
        windowStart: new Date(),
      },
    });
  } else {
    // Reset all endpoints for user
    await db.analyticsRateLimit.updateMany({
      where: { userId },
      data: {
        requestCount: 0,
        isBlocked: false,
        windowStart: new Date(),
      },
    });
  }
}

/**
 * Get analytics access summary for admin monitoring
 */
export async function getAnalyticsAccessSummary(
  db: PrismaClient,
  days = 30,
): Promise<{
  totalRequests: number;
  uniqueUsers: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  recentBlocks: Array<{ userId: string; endpoint: string; blockedAt: Date }>;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get audit summary
  const auditSummary = await db.analyticsAudit.groupBy({
    by: ["endpoint"],
    where: {
      createdAt: { gte: since },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  const totalRequests = await db.analyticsAudit.count({
    where: {
      createdAt: { gte: since },
    },
  });

  const uniqueUsers = await db.analyticsAudit.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  const recentBlocks = await db.analyticsRateLimit.findMany({
    where: {
      isBlocked: true,
      lastRequest: { gte: since },
    },
    select: {
      userId: true,
      endpoint: true,
      lastRequest: true,
    },
    orderBy: {
      lastRequest: "desc",
    },
    take: 10,
  });

  return {
    totalRequests,
    uniqueUsers: uniqueUsers.length,
    topEndpoints: auditSummary.map((item) => ({
      endpoint: item.endpoint,
      count: item._count.id,
    })),
    recentBlocks: recentBlocks.map((block) => ({
      userId: block.userId,
      endpoint: block.endpoint,
      blockedAt: block.lastRequest,
    })),
  };
}
