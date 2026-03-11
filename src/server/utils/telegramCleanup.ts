import { db } from "~/server/db";
import { hashForAudit } from "./encryption";

/**
 * Clean up expired Telegram authentication sessions
 * This should be run periodically (e.g., daily via cron job)
 */
export async function cleanupExpiredTelegramSessions(): Promise<void> {
  try {
    console.log("Starting cleanup of expired Telegram sessions...");

    const expiredSessions = await db.telegramAuth.findMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        isActive: true,
      },
    });

    if (expiredSessions.length === 0) {
      console.log("No expired Telegram sessions found.");
      return;
    }

    // Log cleanup details (with hashed user IDs for privacy)
    console.log(
      `Found ${expiredSessions.length} expired/inactive Telegram sessions to clean up:`,
    );
    for (const session of expiredSessions) {
      console.log(
        `- Session ${session.id} for user ${hashForAudit(session.userId)} (expired: ${session.expiresAt.toISOString()}, active: ${session.isActive})`,
      );
    }

    // Delete expired sessions
    const deleteResult = await db.telegramAuth.deleteMany({
      where: {
        id: {
          in: expiredSessions.map((s) => s.id),
        },
      },
    });

    console.log(
      `Successfully cleaned up ${deleteResult.count} expired Telegram sessions.`,
    );
  } catch (error) {
    console.error("Failed to cleanup expired Telegram sessions:", error);
  }
}

/**
 * Get statistics about Telegram authentication usage
 */
export async function getTelegramAuthStats(): Promise<{
  totalActive: number;
  totalExpired: number;
  expiringWithin7Days: number;
  averageSessionAge: number;
}> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totalActive, totalExpired, expiringWithin7Days, allSessions] =
      await Promise.all([
        // Active sessions
        db.telegramAuth.count({
          where: {
            isActive: true,
            expiresAt: { gte: now },
          },
        }),

        // Expired sessions
        db.telegramAuth.count({
          where: {
            OR: [{ isActive: false }, { expiresAt: { lt: now } }],
          },
        }),

        // Expiring within 7 days
        db.telegramAuth.count({
          where: {
            isActive: true,
            expiresAt: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
        }),

        // All sessions for age calculation
        db.telegramAuth.findMany({
          where: { isActive: true },
          select: { createdAt: true },
        }),
      ]);

    // Calculate average session age in days
    const averageSessionAge =
      allSessions.length > 0
        ? allSessions.reduce((sum, session) => {
            const ageMs = now.getTime() - session.createdAt.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            return sum + ageDays;
          }, 0) / allSessions.length
        : 0;

    return {
      totalActive,
      totalExpired,
      expiringWithin7Days,
      averageSessionAge: Math.round(averageSessionAge * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error("Failed to get Telegram auth stats:", error);
    return {
      totalActive: 0,
      totalExpired: 0,
      expiringWithin7Days: 0,
      averageSessionAge: 0,
    };
  }
}

/**
 * Revoke all Telegram sessions for a user (e.g., on password change)
 */
export async function revokeUserTelegramSessions(
  userId: string,
): Promise<void> {
  try {
    const result = await db.telegramAuth.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    console.log(
      `Revoked ${result.count} Telegram sessions for user ${hashForAudit(userId)}`,
    );
  } catch (error) {
    console.error("Failed to revoke user Telegram sessions:", error);
    throw error;
  }
}

/**
 * Rate limiting for Telegram authentication attempts
 * This helps prevent abuse of the authentication system
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkTelegramAuthRateLimit(userId: string): {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
} {
  const maxAttempts = 5; // Max 5 attempts per hour
  const windowMs = 60 * 60 * 1000; // 1 hour window
  const now = Date.now();

  const userAttempts = authAttempts.get(userId);

  if (!userAttempts || userAttempts.resetTime < now) {
    // First attempt or window expired, reset
    authAttempts.set(userId, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  if (userAttempts.count >= maxAttempts) {
    // Rate limit exceeded
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: userAttempts.resetTime,
    };
  }

  // Increment attempt count
  userAttempts.count++;
  authAttempts.set(userId, userAttempts);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - userAttempts.count,
    resetTime: userAttempts.resetTime,
  };
}

/**
 * Clean up rate limiting data periodically
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [userId, attempts] of authAttempts.entries()) {
      if (attempts.resetTime < now) {
        authAttempts.delete(userId);
      }
    }
  },
  5 * 60 * 1000,
); // Clean up every 5 minutes
