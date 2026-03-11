/**
 * Password Reset Router
 *
 * Secure password reset functionality with token-based validation,
 * rate limiting, and email integration via Postmark.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hashPassword } from "~/utils/password";
import { getEmailService } from "~/server/email/emailService";

// Rate limiting for password reset requests (per email)
const resetAttempts = new Map<string, { count: number; resetTime: number }>();

function checkResetRateLimit(email: string): {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
} {
  const maxAttempts = 3; // Max 3 requests per hour per email
  const windowMs = 60 * 60 * 1000; // 1 hour window
  const now = Date.now();

  const emailAttempts = resetAttempts.get(email);

  if (!emailAttempts || emailAttempts.resetTime < now) {
    // First attempt or window expired, reset
    resetAttempts.set(email, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  if (emailAttempts.count >= maxAttempts) {
    // Rate limit exceeded
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: emailAttempts.resetTime,
    };
  }

  // Increment attempt count
  emailAttempts.count++;
  resetAttempts.set(email, emailAttempts);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - emailAttempts.count,
    resetTime: emailAttempts.resetTime,
  };
}

/**
 * Generate a cryptographically secure password reset token
 */
function generateResetToken(): { token: string; hashedToken: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
}

/**
 * Hash a token for database storage
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const passwordResetRouter = createTRPCRouter({
  /**
   * Request a password reset email
   */
  requestReset: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Check rate limiting
      const rateLimit = checkResetRateLimit(email);
      if (!rateLimit.allowed) {
        const resetTimeMinutes = Math.ceil(
          (rateLimit.resetTime - Date.now()) / (1000 * 60),
        );
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many password reset requests. Please try again in ${resetTimeMinutes} minutes.`,
        });
      }

      // Always return success to prevent email enumeration attacks
      // Even if the email doesn't exist, we pretend it worked
      const responseMessage =
        "If an account with that email exists, we've sent you a password reset link.";

      try {
        // Check if user exists
        const user = await ctx.db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        if (!user) {
          // User doesn't exist, but we still return success to prevent enumeration
          return { success: true, message: responseMessage };
        }

        // Invalidate any existing password reset tokens for this user
        await ctx.db.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            used: false,
            expiresAt: { gt: new Date() },
          },
          data: { used: true },
        });

        // Generate secure token
        const { token, hashedToken } = generateResetToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save token to database
        await ctx.db.passwordResetToken.create({
          data: {
            userId: user.id,
            token: hashedToken,
            expiresAt,
            used: false,
          },
        });

        // Send reset email
        const emailService = getEmailService(ctx.db);
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const resetUrl = `${baseUrl}/auth/reset-password/${token}`;

        await emailService.sendEmail({
          to: user.email!,
          templateName: "passwordReset",
          templateData: {
            userName: user.name ?? user.email!,
            resetUrl,
            expirationMinutes: 15,
          },
          // No eventId - password resets are system emails not tied to any event
          userId: user.id,
        });

        console.log(
          `[PASSWORD_RESET] Reset token sent to ${email.replace(/(.{2}).*(@.*)/, "$1***$2")}`,
        );

        return { success: true, message: responseMessage };
      } catch (error) {
        console.error("[PASSWORD_RESET] Error:", error);

        // Even on error, return success to prevent information leakage
        return { success: true, message: responseMessage };
      }
    }),

  /**
   * Validate a password reset token
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { token } = input;

      try {
        const hashedToken = hashToken(token);

        const resetToken = await ctx.db.passwordResetToken.findUnique({
          where: { token: hashedToken },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        if (!resetToken) {
          return { valid: false, error: "Invalid or expired reset token" };
        }

        if (resetToken.used) {
          return {
            valid: false,
            error: "This reset link has already been used",
          };
        }

        if (resetToken.expiresAt < new Date()) {
          return { valid: false, error: "This reset link has expired" };
        }

        return {
          valid: true,
          user: {
            email: resetToken.user.email,
            name: resetToken.user.name,
          },
        };
      } catch (error) {
        console.error("[PASSWORD_RESET] Validation error:", error);
        return { valid: false, error: "Invalid reset token" };
      }
    }),

  /**
   * Reset password using a valid token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters long"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { token, newPassword } = input;

      try {
        const hashedToken = hashToken(token);

        // Find and validate token
        const resetToken = await ctx.db.passwordResetToken.findUnique({
          where: { token: hashedToken },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        if (!resetToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset token",
          });
        }

        if (resetToken.used) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This reset link has already been used",
          });
        }

        if (resetToken.expiresAt < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This reset link has expired",
          });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Use transaction to update password and mark token as used
        await ctx.db.$transaction(async (tx) => {
          // Update user password
          await tx.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
          });

          // Mark token as used
          await tx.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true },
          });

          // Invalidate any other unused tokens for this user
          await tx.passwordResetToken.updateMany({
            where: {
              userId: resetToken.userId,
              used: false,
              id: { not: resetToken.id },
            },
            data: { used: true },
          });
        });

        console.log(
          `[PASSWORD_RESET] Password successfully reset for user ${resetToken.userId}`,
        );

        return {
          success: true,
          message:
            "Password has been reset successfully. You can now sign in with your new password.",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("[PASSWORD_RESET] Reset error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset password. Please try again.",
        });
      }
    }),

  /**
   * Get rate limit status for an email (for displaying remaining attempts)
   */
  getRateLimitStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim(),
      }),
    )
    .query(({ input }) => {
      const { email } = input;
      const rateLimit = checkResetRateLimit(email);

      return {
        remainingAttempts: rateLimit.remainingAttempts,
        canRequest: rateLimit.allowed,
        resetTime: rateLimit.resetTime,
      };
    }),
});
