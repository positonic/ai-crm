/**
 * Kudos System - Social Credit Economy
 *
 * This module implements a transfer-based social economy where:
 * - Creating content (ProjectUpdates) mints new kudos
 * - Likes transfer 2% of liker's kudos to recipient
 * - Praise transfers 5% of sender's kudos to recipient
 * - Base kudos earned from residency attendance (10 kudos/day)
 *
 * See /docs/kudos-system.md for full methodology
 */

import { type PrismaClient } from "@prisma/client";

// Kudos System Constants
export const KUDOS_CONSTANTS = {
  // Attendance-based starting kudos
  KUDOS_PER_DAY: 10, // Kudos earned per day of residency attendance
  DAYS_ATTENDED: 13, // Current days of residency (assumed all residents present)
  BASE_KUDOS: 130, // Starting kudos (10 × 13 days)

  // Content creation rewards
  UPDATE_WEIGHT: 10, // Kudos minted per ProjectUpdate posted
  METRICS_WEIGHT: 10, // Kudos earned per project with at least one metric

  // Transfer rates for engagement
  PRAISE_TRANSFER_RATE: 0.05, // 5% of sender's kudos transferred with praise
  LIKE_TRANSFER_RATE: 0.02, // 2% of liker's kudos transferred with like

  // Backfill values for historical data without transfer tracking
  BACKFILL_PRAISE_VALUE: 5, // Default kudos for old praise
  BACKFILL_LIKE_VALUE: 2, // Default kudos for old likes
} as const;

interface KudosBreakdown {
  base: number; // Attendance-based starting kudos
  fromUpdates: number; // Kudos from creating ProjectUpdates
  fromLikesReceived: number; // Kudos gained from likes received
  fromPraiseReceived: number; // Kudos gained from praise received
  spentOnLikes: number; // Kudos spent on liking others' content
  spentOnPraise: number; // Kudos spent on praising others
  total: number; // Final kudos balance
}

/**
 * Calculate a user's current kudos based on all their activity
 *
 * Formula:
 * Kudos = BASE_KUDOS +
 *         (ProjectUpdates × 10) +
 *         (Projects with Metrics × 10) +
 *         (Likes Received × kudosTransferred) -
 *         (Likes Given × kudosTransferred) +
 *         (Praise Received × kudosTransferred) -
 *         (Praise Sent × kudosTransferred)
 */
export async function calculateUserKudos(
  userId: string,
  db: PrismaClient,
): Promise<KudosBreakdown> {
  // Base kudos from attendance
  const base = KUDOS_CONSTANTS.BASE_KUDOS;

  // Count ProjectUpdates authored by user (mints new kudos)
  const updateCount = await db.projectUpdate.count({
    where: { userId },
  });
  const fromUpdates = updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT;

  // Calculate kudos from likes received on all content types
  const projectUpdateLikesReceived = await db.projectUpdateLike.findMany({
    where: {
      projectUpdate: { userId },
    },
    select: { kudosTransferred: true },
  });

  const askOfferLikesReceived = await db.askOfferLike.findMany({
    where: {
      askOffer: { userId },
    },
    select: { kudosTransferred: true },
  });

  const userProjectLikesReceived = await db.userProjectLike.findMany({
    where: {
      project: {
        profile: {
          userId,
        },
      },
    },
    select: { kudosTransferred: true },
  });

  const fromLikesReceived =
    sumKudosTransferred(projectUpdateLikesReceived) +
    sumKudosTransferred(askOfferLikesReceived) +
    sumKudosTransferred(userProjectLikesReceived);

  // Calculate kudos spent on likes given
  const projectUpdateLikesGiven = await db.projectUpdateLike.findMany({
    where: { userId },
    select: { kudosTransferred: true },
  });

  const askOfferLikesGiven = await db.askOfferLike.findMany({
    where: { userId },
    select: { kudosTransferred: true },
  });

  const userProjectLikesGiven = await db.userProjectLike.findMany({
    where: { userId },
    select: { kudosTransferred: true },
  });

  const spentOnLikes =
    sumKudosTransferred(projectUpdateLikesGiven) +
    sumKudosTransferred(askOfferLikesGiven) +
    sumKudosTransferred(userProjectLikesGiven);

  // Calculate kudos from praise received
  const praiseReceived = await db.praise.findMany({
    where: { recipientId: userId },
    select: { kudosTransferred: true },
  });
  const fromPraiseReceived = sumKudosTransferred(praiseReceived);

  // Calculate kudos spent on praise sent
  const praiseSent = await db.praise.findMany({
    where: { senderId: userId },
    select: { kudosTransferred: true },
  });
  const spentOnPraise = sumKudosTransferred(praiseSent);

  // Calculate total kudos
  const total =
    base +
    fromUpdates +
    fromLikesReceived +
    fromPraiseReceived -
    spentOnLikes -
    spentOnPraise;

  return {
    base,
    fromUpdates,
    fromLikesReceived,
    fromPraiseReceived,
    spentOnLikes,
    spentOnPraise,
    total: Math.max(0, total), // Floor at 0, can't go negative
  };
}

/**
 * Helper function to sum kudosTransferred values, using backfill defaults for null values
 */
function sumKudosTransferred(
  records: Array<{ kudosTransferred: number | null }>,
  backfillValue?: number,
): number {
  return records.reduce((sum, record) => {
    // Use transferred value if exists, otherwise use backfill value, otherwise 0
    const value = record.kudosTransferred ?? backfillValue ?? 0;
    return sum + value;
  }, 0);
}

/**
 * Calculate kudos transfer amount based on user's current kudos
 */
export function calculateTransferAmount(
  currentKudos: number,
  transferRate: number,
): number {
  return currentKudos * transferRate;
}

/**
 * Calculate kudos for a like action (2% transfer)
 */
export function calculateLikeTransfer(currentKudos: number): number {
  return calculateTransferAmount(
    currentKudos,
    KUDOS_CONSTANTS.LIKE_TRANSFER_RATE,
  );
}

/**
 * Calculate kudos for a praise action (5% transfer)
 */
export function calculatePraiseTransfer(currentKudos: number): number {
  return calculateTransferAmount(
    currentKudos,
    KUDOS_CONSTANTS.PRAISE_TRANSFER_RATE,
  );
}

/**
 * Check if user has sufficient kudos for an action
 */
export function hasSufficientKudos(
  currentKudos: number,
  requiredAmount: number,
): boolean {
  return currentKudos >= requiredAmount;
}

/**
 * Get human-readable kudos tier
 */
export function getKudosTier(kudos: number): {
  tier: string;
  color: string;
  label: string;
} {
  if (kudos >= 500) {
    return { tier: "gold", color: "yellow", label: "High Contributor" };
  } else if (kudos >= 200) {
    return { tier: "silver", color: "green", label: "Active Member" };
  } else if (kudos >= 100) {
    return { tier: "bronze", color: "blue", label: "Participant" };
  } else {
    return { tier: "starter", color: "gray", label: "New Member" };
  }
}
