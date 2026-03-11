/**
 * Initialize Kudos Values for Accepted Residents
 *
 * This script calculates and sets the initial kudos values for accepted residents
 * of the "funding-commons-residency-2025" event based on:
 * - Base attendance kudos (default: 13 days × 10 kudos/day = 130, configurable per user)
 * - Project updates created (+10 kudos each)
 * - Praise transactions (received +5, sent -5 using backfill values)
 * - Likes (received +2, sent -2 using backfill values) - Note: Not yet implemented in like mutations
 *
 * Configure USER_DAYS_OVERRIDE object below to set custom on-site days for specific users.
 * Users not in the override map will default to 13 days.
 *
 * Run with: bunx tsx scripts/init-kudos.ts
 */

import { PrismaClient } from "@prisma/client";
import { KUDOS_CONSTANTS } from "~/utils/kudosCalculation";

const db = new PrismaClient();

/**
 * USER_DAYS_OVERRIDE: Configure custom on-site days for specific users
 *
 * Map user email to number of days on-site for users who attended differently
 * from the default 13 days. Users not listed here will default to 13 days.
 *
 * Example:
 *   const USER_DAYS_OVERRIDE: Record<string, number> = {
 *     "alice@example.com": 7,   // Only here 1 week
 *     "bob@example.com": 10,     // Here 10 days
 *   };
 */
const USER_DAYS_OVERRIDE: Record<string, number> = {
  "Ulises@e4e.app": 1,
  "shaun.johnson@stellar.org": 4,
  "kevin@allo.capital": 0,
  "arma@torproject.org": 7,
  "eliza@ef.com": 7,
  "nanak@holonym.com": 13,
  "emmilili.04@gmail.com": 12,
  "Fernandiuxta@gmail.com": 13,
  "joaquin@blessedux.com": 11,
  "julio.cruz@eb-ms.net": 1,
  "gonzalo.othacehe@openzeppelin.com": 13,
  "kieranprasch@gmail.com": 10,
  "camicarva119@gmail.com": 13,
  "sara@relayfunder.com": 13,
  "david@gainforest.net": 10,
  "niluferokay@gmail.com": 11,
  "charlotte@fundingthecommons.io": 13,
  "sharfy@gainforest.net": 8,
  "a.alejandro.alvarez.a@gmail.com": 13,
  "amani@gtcx.africa": 4,
  "stefi.says.hi@gmail.com": 13,
  "adam@toucan.earth": 13,
  "f@frsr.com": 13,
  "rithikharajamohan@gmail.com": 11,
  "code@bitbeckers.com": 11,
  "sejal.rekhan@protocol.ai": 9,
  "thwayf@gmail.com": 11,
  "minjae@post.harvard.edu": 10,
  "alisheryakupov@gmail.com": 12,
  "jamespfarrell@gmail.com": 12,
};

interface UserKudosData {
  userId: string;
  userName: string;
  daysOnSite: number;
  baseKudos: number;
  updatesCreated: number;
  updatesKudos: number;
  likesReceived: number;
  likesReceivedKudos: number;
  likesGiven: number;
  likesGivenKudos: number;
  praiseReceived: number;
  praiseReceivedKudos: number;
  praiseSent: number;
  praiseSentKudos: number;
  totalKudos: number;
}

async function calculateUserKudos(
  userId: string,
  daysOnSite: number = KUDOS_CONSTANTS.DAYS_ATTENDED,
): Promise<UserKudosData | null> {
  // Get user info
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, firstName: true, surname: true },
  });

  if (!user) return null;

  const userName =
    user.name ?? `${user.firstName ?? ""} ${user.surname ?? ""}`.trim();

  // Count ProjectUpdates created by this user
  const updatesCreated = await db.projectUpdate.count({
    where: {
      project: {
        profile: {
          userId: userId,
        },
      },
    },
  });

  // Count likes received on ProjectUpdates
  const projectUpdateLikesReceived = await db.projectUpdateLike.count({
    where: {
      projectUpdate: {
        project: {
          profile: {
            userId: userId,
          },
        },
      },
    },
  });

  // Count likes received on UserProjects
  const userProjectLikesReceived = await db.userProjectLike.count({
    where: {
      project: {
        profile: {
          userId: userId,
        },
      },
    },
  });

  // Count likes received on AsksOffers
  const askOfferLikesReceived = await db.askOfferLike.count({
    where: {
      askOffer: {
        userId: userId,
      },
    },
  });

  const totalLikesReceived =
    projectUpdateLikesReceived +
    userProjectLikesReceived +
    askOfferLikesReceived;

  // Count likes given (all types)
  const projectUpdateLikesGiven = await db.projectUpdateLike.count({
    where: { userId: userId },
  });

  const userProjectLikesGiven = await db.userProjectLike.count({
    where: { userId: userId },
  });

  const askOfferLikesGiven = await db.askOfferLike.count({
    where: { userId: userId },
  });

  const totalLikesGiven =
    projectUpdateLikesGiven + userProjectLikesGiven + askOfferLikesGiven;

  // Count praise received
  const praiseReceived = await db.praise.count({
    where: { recipientId: userId },
  });

  // Count praise sent
  const praiseSent = await db.praise.count({
    where: { senderId: userId },
  });

  // Calculate kudos components
  const baseKudos = daysOnSite * KUDOS_CONSTANTS.KUDOS_PER_DAY;
  const updatesKudos = updatesCreated * KUDOS_CONSTANTS.UPDATE_WEIGHT;
  const likesReceivedKudos =
    totalLikesReceived * KUDOS_CONSTANTS.BACKFILL_LIKE_VALUE;
  const likesGivenKudos = totalLikesGiven * KUDOS_CONSTANTS.BACKFILL_LIKE_VALUE;
  const praiseReceivedKudos =
    praiseReceived * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE;
  const praiseSentKudos = praiseSent * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE;

  const totalKudos = Math.max(
    0,
    baseKudos +
      updatesKudos +
      likesReceivedKudos -
      likesGivenKudos +
      praiseReceivedKudos -
      praiseSentKudos,
  );

  return {
    userId,
    userName,
    daysOnSite,
    baseKudos,
    updatesCreated,
    updatesKudos,
    likesReceived: totalLikesReceived,
    likesReceivedKudos,
    likesGiven: totalLikesGiven,
    likesGivenKudos,
    praiseReceived,
    praiseReceivedKudos,
    praiseSent,
    praiseSentKudos,
    totalKudos,
  };
}

async function main() {
  const EVENT_ID = "funding-commons-residency-2025";

  console.log(`🎯 Starting kudos initialization for ${EVENT_ID}...\n`);

  // Find the event by ID
  const event = await db.event.findUnique({
    where: { id: EVENT_ID },
    select: { id: true, name: true },
  });

  if (!event) {
    console.error(`❌ Event '${EVENT_ID}' not found!`);
    process.exit(1);
  }

  console.log(`📍 Found event: ${event.name}\n`);

  // Get only accepted residents for this event
  const acceptedApplications = await db.application.findMany({
    where: {
      eventId: event.id,
      status: "ACCEPTED",
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          surname: true,
          email: true,
        },
      },
    },
  });

  const users = acceptedApplications
    .filter((app) => app.user)
    .map((app) => ({
      id: app.user!.id,
      email: app.user!.email,
    }));

  console.log(`Found ${users.length} accepted residents to process\n`);

  const results: UserKudosData[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Calculate kudos for each user
  for (const user of users) {
    try {
      // Get days on-site for this user by email (default to 13 if not overridden)
      const daysOnSite = user.email
        ? (USER_DAYS_OVERRIDE[user.email] ?? KUDOS_CONSTANTS.DAYS_ATTENDED)
        : KUDOS_CONSTANTS.DAYS_ATTENDED;
      const kudosData = await calculateUserKudos(user.id, daysOnSite);

      if (kudosData) {
        results.push(kudosData);

        // Update user's kudos in database
        await db.user.update({
          where: { id: user.id },
          data: { kudos: kudosData.totalKudos },
        });

        successCount++;
        console.log(
          `✅ ${kudosData.userName}: ${Math.round(kudosData.totalKudos)} kudos (${daysOnSite} days)`,
        );
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error processing user ${user.id}:`, error);
    }
  }

  // Sort by total kudos (descending)
  results.sort((a, b) => b.totalKudos - a.totalKudos);

  // Print summary statistics
  console.log("\n" + "=".repeat(80));
  console.log("📊 KUDOS INITIALIZATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`Event: ${event.name}`);
  console.log(`Total Accepted Residents Processed: ${users.length}`);
  console.log(`Successful Updates: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("");

  if (results.length > 0) {
    const totalKudos = results.reduce((sum, r) => sum + r.totalKudos, 0);
    const avgKudos = totalKudos / results.length;
    const maxKudos = results[0]?.totalKudos ?? 0;
    const minKudos = results[results.length - 1]?.totalKudos ?? 0;

    console.log(`Total Kudos in System: ${Math.round(totalKudos)}`);
    console.log(`Average Kudos: ${Math.round(avgKudos)}`);
    console.log(
      `Highest Kudos: ${Math.round(maxKudos)} (${results[0]?.userName})`,
    );
    console.log(
      `Lowest Kudos: ${Math.round(minKudos)} (${results[results.length - 1]?.userName})`,
    );
    console.log("");

    // Show top 10
    console.log("🏆 TOP 10 KUDOS LEADERS:");
    console.log("-".repeat(80));
    results.slice(0, 10).forEach((r, idx) => {
      console.log(
        `${idx + 1}. ${r.userName.padEnd(30)} ${Math.round(r.totalKudos).toString().padStart(6)} kudos ` +
          `(${r.daysOnSite}d, updates: ${r.updatesCreated}, praise: +${r.praiseReceived}/-${r.praiseSent}, likes: +${r.likesReceived}/-${r.likesGiven})`,
      );
    });
  }

  console.log("\n✨ Kudos initialization complete!");
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
